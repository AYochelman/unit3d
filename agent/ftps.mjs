/**
 * The printer's own card, over FTPS.
 *
 * Bambu keeps every timelapse it records on the microSD card inside the
 * printer, and serves that card over implicit FTPS on port 990. The obvious
 * clients all fail against it the same way — the printer accepts the control
 * connection, then closes the data connection the moment it opens.
 *
 * The reason is a security rule most FTP clients do not implement: the printer
 * requires the data connection to RESUME the TLS session of the control
 * connection, as proof that the two belong to the same client. Node can do
 * that — `tls.connect` takes a `session` — but it has to be handed over
 * deliberately, which is what this file exists to do.
 *
 * So this is a small FTPS client rather than a library: list, download, and
 * nothing else, with the one detail that matters done right.
 */
import net from "node:net";
import tls from "node:tls";

const CRLF = "\r\n";

/**
 * The printer's TLS, pinned to 1.2.
 *
 * Two reasons, and the second is the one that mattered. A printer's embedded
 * stack is old, and Node offers 1.3 first — which is how a data connection came
 * back "bad signature" while the control connection was fine. And session
 * resumption, which this printer demands of its data channel, is a different
 * mechanism in 1.3 (a ticket) than in 1.2 (a session id): what `getSession()`
 * hands over only resumes reliably on 1.2.
 *
 * The certificate is the printer's own, self-signed, on a machine addressed by
 * IP on the LAN — there is no authority that could vouch for it, and the access
 * code is what proves identity here.
 */
const TLS_BASE = {
  rejectUnauthorized: false,
  minVersion: "TLSv1.2",
  maxVersion: "TLSv1.2",
};

/**
 * One permanent reader on the control connection.
 *
 * The obvious shape — attach a `data` handler, wait for the reply, remove it —
 * silently loses everything that arrives while no handler is attached: a Node
 * socket keeps flowing once it has flowed, and bytes with nowhere to go are
 * dropped. FTP servers pipeline freely (the 150 can land while the 227 is still
 * being handled), so replies were disappearing and the next read waited for
 * something that had already come and gone. That is what "the printer did not
 * answer" was: not silence, but a reply nobody was listening for.
 *
 * So the socket is read once, into a buffer, and readers take from the buffer.
 */
function makeReader(sock) {
  let pending = "";
  let waiter = null;

  const tryResolve = () => {
    if (!waiter) return;
    for (const line of pending.split(CRLF)) {
      if (/^\d{3} /.test(line)) {
        const reply = { code: Number(line.slice(0, 3)), text: pending.trim() };
        pending = "";
        const w = waiter;
        waiter = null;
        clearTimeout(w.timer);
        w.resolve(reply);
        return;
      }
    }
  };

  sock.on("data", (d) => { pending += d.toString("utf8"); tryResolve(); });
  sock.on("error", (e) => {
    if (!waiter) return;
    const w = waiter;
    waiter = null;
    clearTimeout(w.timer);
    w.reject(e);
  });

  return (timeoutMs = 15_000) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waiter = null;
        reject(new Error("the printer did not answer"));
      }, timeoutMs);
      waiter = { resolve, reject, timer };
      tryResolve();   // the answer may already be in hand
    });
}

export async function connectPrinterFtps({ host, password, user = "bblp", port = 990, debug = false, onNote = () => {} }) {
  const trace = (dir, text) => {
    if (!debug) return;
    // Never print the password line.
    const safe = /^PASS /i.test(text) ? "PASS ******" : text;
    console.log(`      ${dir} ${safe.replace(/\r?\n/g, " ").trim().slice(0, 160)}`);
  };
  // Remembered across transfers so only the first one pays for the search.
  let dataPlan = null;
  let control;
  let readReply;

  /**
   * Log in, from nothing.
   *
   * Kept callable more than once on purpose. A transfer that goes wrong on this
   * printer does not fail cleanly — it leaves the control connection waiting
   * for a data connection that will never come, and every command after it is
   * met with silence. Draining the buffer cannot rescue that; only a new
   * connection can. So a failed attempt throws the whole session away and the
   * next one starts fresh, which is what made trying more than one approach
   * meaningful instead of a formality.
   */
  const login = async () => {
    control = await new Promise((resolve, reject) => {
      const s = tls.connect({ ...TLS_BASE, host, port, timeout: 15_000 }, () => resolve(s));
      s.on("error", reject);
      s.on("timeout", () => { s.destroy(); reject(new Error("timed out reaching the printer's card")); });
    });
    control.setTimeout(0);
    readReply = makeReader(control);
    await readReply();                        // the greeting
    await say(`USER ${user}`, [230, 331]);
    await say(`PASS ${password}`, [230]);
    await say("PBSZ 0", [200]);
    await say("PROT P", [200]);
    await say("TYPE I", [200]);
  };

  const say = async (cmd, okCodes) => {
    trace(">", cmd);
    control.write(cmd + CRLF);
    const r = await readReply();
    trace("<", r.text);
    if (okCodes && !okCodes.includes(r.code)) {
      throw new Error(`${cmd.split(" ")[0]} refused (${r.code})`);
    }
    return r;
  };

  await login();

  /**
   * Run one transfer, and hand back everything it produced.
   *
   * Three things have to line up, and each was learned the hard way:
   *
   *   1. The data connection must RESUME the control connection's TLS session.
   *      Without it the printer closes the socket.
   *   2. On TLS 1.2, because that is where `getSession()` resumes reliably, and
   *      because this printer's stack refuses a 1.3 handshake outright.
   *   3. The command may have to go out BEFORE the data port is connected to.
   *      This printer answers PASV with a port it has not begun listening on
   *      yet — connecting first times out — so the transfer command is what
   *      makes it open. Other firmware wants the opposite. Both orders are
   *      tried, each with its own PASV and its own socket, and whichever works
   *      is remembered so only the first transfer pays for the search.
   */
  const pasvPort = async () => {
    const pasv = await say("PASV", [227]);
    const m = /(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)/.exec(pasv.text);
    if (!m) throw new Error("could not read where to connect for the transfer");
    return Number(m[5]) * 256 + Number(m[6]);
  };

  const openRaw = (dataPort) =>
    new Promise((resolve, reject) => {
      const d = net.connect({ host, port: dataPort });
      // Short: a port that is not listening should be discovered in seconds,
      // not after the operating system gives up.
      d.setTimeout(8000);
      d.on("connect", () => { d.setTimeout(60_000); resolve(d); });
      d.on("error", reject);
      d.on("timeout", () => { d.destroy(); reject(new Error(`nothing listening on ${dataPort}`)); });
    });

  const upgrade = (socket, opts) =>
    new Promise((resolve, reject) => {
      const t = tls.connect({ ...opts, socket }, () => resolve(t));
      t.once("error", reject);
      setTimeout(() => reject(new Error("no handshake")), 8000);
    });

  const collect = (secure, idleMs = 60_000) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      let settled = false;
      const finish = (fn, v) => { if (settled) return; settled = true; fn(v); };
      // Bambu drops the connection rather than closing it politely once a file
      // is out, so bytes already in hand beat a clean goodbye.
      const settleWith = (err) => (chunks.length ? finish(resolve, Buffer.concat(chunks)) : finish(reject, err));
      secure.on("data", (c) => chunks.push(c));
      secure.on("end", () => finish(resolve, Buffer.concat(chunks)));
      secure.on("close", () => finish(resolve, Buffer.concat(chunks)));
      secure.on("error", settleWith);
      secure.setTimeout(idleMs, () => { secure.destroy(); settleWith(new Error("the transfer stalled")); });
    });

  const expectStart = async (ms) => {
    const r = await readReply(ms);
    trace("<", r.text);
    if (![125, 150].includes(r.code)) throw new Error(`refused (${r.code})`);
  };

  // Connect first, because the transcript settled it: this printer holds the
  // "150" back until something actually connects to the port PASV named. Asking
  // and then waiting to be told to connect is a deadlock — both sides waiting
  // for the other — and it is what killed the control connection every time.
  const STRATEGIES = [
    { name: "socket, ask, encrypt", first: "socket", tls: TLS_BASE },
    { name: "socket, ask, encrypt, relaxed", first: "socket", tls: { ...TLS_BASE, ciphers: "DEFAULT:@SECLEVEL=0" } },
    { name: "connect first", first: "connect", tls: TLS_BASE },
    { name: "command first", first: "command", tls: TLS_BASE },
  ];

  /**
   * A listing is a few hundred bytes and arrives at once; a file is megabytes.
   * Waiting a minute to learn that a listing is not coming is a minute spent
   * looking frozen, so the two are given very different patience.
   */
  const isListing = (command) => /^(LIST|NLST)\b/i.test(command);

  const runOne = async (command, plan) => {
    const quick = isListing(command);
    const replyMs = quick ? 12_000 : 20_000;
    const idleMs = quick ? 15_000 : 90_000;
    const dataPort = await pasvPort();
    const opts = { ...plan.tls, session: control.getSession() };
    const send = () => { trace(">", command); control.write(command + CRLF); };

    // Open the socket, ask, and only then start TLS.
    //
    // This is the order Python's own FTPS client uses, and the transcript says
    // it is the one this printer wants: it will not answer until something has
    // connected to the port it named, and it will not begin a handshake until
    // it knows what the connection is for. Connecting and handshaking first
    // hangs on a server waiting to be told; asking first hangs on a server
    // waiting to be connected to. Both were tried, and both deadlocked.
    if (plan.first === "socket") {
      const raw = await openRaw(dataPort);
      send();
      await expectStart(replyMs);
      return collect(await upgrade(raw, opts), idleMs);
    }

    if (plan.first === "command") {
      send();
      await expectStart(replyMs);
      return collect(await upgrade(await openRaw(dataPort), opts), idleMs);
    }

    const raw = await openRaw(dataPort);
    const secure = await upgrade(raw, opts);
    send();
    await expectStart(replyMs);
    return collect(secure, idleMs);
  };

  const transfer = async (command) => {
    const problems = [];
    const plans = dataPlan ? [dataPlan] : STRATEGIES;
    for (let i = 0; i < plans.length; i++) {
      onNote(`${command.split(" ")[0]} · ${plans[i].name}`);
      try {
        const body = await runOne(command, plans[i]);
        // A 226 may or may not follow; either way it must not be left in the
        // buffer for the next read to mistake for its own answer.
        await readReply(8000).catch(() => {});
        dataPlan = plans[i];
        return body;
      } catch (e) {
        problems.push(`${plans[i].name}: ${e.message}`);
        onNote(`   ${plans[i].name} — ${e.message}`);
        // The session is not recoverable after a failed transfer, so start a
        // new one rather than asking a connection that has stopped listening.
        if (i < plans.length - 1) {
          try { control.destroy(); } catch { /* already gone */ }
          try { await login(); } catch (again) { problems.push(`reconnect: ${again.message}`); break; }
        }
      }
    }
    dataPlan = null;
    throw new Error(problems.join("; "));
  };

  return {
    /**
     * Every file in a folder.
     *
     * Embedded FTP servers differ on how a listing may be asked for: some take
     * a path on LIST, some only list where they stand, and some answer NLST
     * and nothing else. A server that dislikes the form it was given tends to
     * go silent rather than refuse, so all three are tried before concluding
     * anything about the card.
     */
    async list(dir) {
      return parseList(await this.listRaw(dir));
    },

    /** The listing exactly as the printer wrote it — for when nothing matches. */
    async listRaw(dir) {
      const problems = [];
      for (const form of ["LIST", "NLST", "CWD"]) {
        try {
          if (form === "CWD") {
            await say(`CWD ${dir}`, [250]);
            return (await transfer("LIST")).toString("utf8");
          }
          return (await transfer(`${form} ${dir}`)).toString("utf8");
        } catch (e) {
          problems.push(`${form} — ${e.message}`);
        }
      }
      throw new Error(problems.join(" | "));
    },

    /** One file, whole, in memory. Timelapses are a few megabytes at most. */
    async download(remotePath) {
      return transfer(`RETR ${remotePath}`);
    },

    /**
     * What the server says about itself, over the control connection only.
     *
     * These need no data channel, so they answer even when every listing comes
     * back empty — and an empty listing plus "where am I" is the difference
     * between a card with nothing on it and a server showing a different disk
     * than the one being asked about.
     */
    async about() {
      const out = {};
      for (const [key, cmd] of [["pwd", "PWD"], ["system", "SYST"], ["features", "FEAT"], ["status", "STAT"]]) {
        try {
          out[key] = (await say(cmd)).text.replace(/\r?\n/g, " | ").trim();
        } catch (e) {
          out[key] = `— ${e.message}`;
        }
      }
      return out;
    },

    /** Which way of opening a transfer this printer accepted. */
    get mode() {
      return dataPlan?.name ?? "";
    },

    close() {
      try { control.write("QUIT" + CRLF); } catch { /* already gone */ }
      try { control.destroy(); } catch { /* already gone */ }
    },

    /** A fresh session, for a caller that knows the last one went wrong. */
    async reconnect() {
      try { control.destroy(); } catch { /* already gone */ }
      await login();
    },
  };
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/**
 * Unix-style listing lines, which is what Bambu sends:
 *   -rw-r--r-- 1 root root 4194304 Sep 09 21:14 video_1.mp4
 * A listing older than six months carries a year instead of a clock, which is
 * the one irregularity worth handling.
 */
function parseList(text) {
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("d") || line.startsWith("total")) continue;
    const m = /^\S+\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\w{3})\s+(\d+)\s+(\S+)\s+(.+)$/.exec(line);
    if (!m) continue;
    const [, size, mon, day, timeOrYear, name] = m;
    const month = MONTHS.indexOf(mon);
    const now = new Date();
    let when;
    if (timeOrYear.includes(":")) {
      const [h, min] = timeOrYear.split(":").map(Number);
      when = new Date(now.getFullYear(), month, Number(day), h, min);
      if (when > now) when.setFullYear(now.getFullYear() - 1);  // it was last year
    } else {
      when = new Date(Number(timeOrYear), month, Number(day));
    }
    out.push({ name, size: Number(size), modifiedAt: when });
  }
  return out;
}
