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

export async function connectPrinterFtps({ host, password, user = "bblp", port = 990 }) {
  const control = await new Promise((resolve, reject) => {
    const s = tls.connect({ ...TLS_BASE, host, port, timeout: 15_000 }, () => resolve(s));
    s.on("error", reject);
    s.on("timeout", () => { s.destroy(); reject(new Error("timed out reaching the printer's card")); });
  });
  control.setTimeout(0);
  const readReply = makeReader(control);
  // Remembered across transfers so only the first one pays for the search.
  let dataPlan = null;

  const say = async (cmd, okCodes) => {
    control.write(cmd + CRLF);
    const r = await readReply();
    if (okCodes && !okCodes.includes(r.code)) {
      throw new Error(`${cmd.split(" ")[0]} refused (${r.code})`);
    }
    return r;
  };

  await readReply();                        // the greeting
  await say(`USER ${user}`, [230, 331]);
  await say(`PASS ${password}`, [230]);
  await say("PBSZ 0", [200]);
  await say("PROT P", [200]);
  await say("TYPE I", [200]);

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

  const collect = (secure) =>
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
      secure.setTimeout(60_000, () => { secure.destroy(); settleWith(new Error("the transfer stalled")); });
    });

  const expectStart = async () => {
    const r = await readReply(20_000);
    if (![125, 150].includes(r.code)) throw new Error(`refused (${r.code})`);
  };

  const STRATEGIES = [
    { name: "command first", first: "command", tls: TLS_BASE },
    { name: "command first, relaxed", first: "command", tls: { ...TLS_BASE, ciphers: "DEFAULT:@SECLEVEL=0" } },
    { name: "connect first", first: "connect", tls: TLS_BASE },
    { name: "connect first, relaxed", first: "connect", tls: { ...TLS_BASE, ciphers: "DEFAULT:@SECLEVEL=0" } },
  ];

  const runOne = async (command, plan) => {
    const dataPort = await pasvPort();
    const opts = { ...plan.tls, session: control.getSession() };
    let raw;
    if (plan.first === "command") {
      control.write(command + CRLF);
      await expectStart();
      raw = await openRaw(dataPort);
      return collect(await upgrade(raw, opts));
    }
    raw = await openRaw(dataPort);
    const secure = await upgrade(raw, opts);
    control.write(command + CRLF);
    await expectStart();
    return collect(secure);
  };

  const transfer = async (command) => {
    const problems = [];
    for (const plan of dataPlan ? [dataPlan] : STRATEGIES) {
      try {
        const body = await runOne(command, plan);
        // A 226 may or may not follow; either way it must not be left in the
        // buffer for the next read to mistake for its own answer.
        await readReply(8000).catch(() => {});
        dataPlan = plan;
        return body;
      } catch (e) {
        problems.push(`${plan.name}: ${e.message}`);
        await readReply(3000).catch(() => {});   // clear anything left behind
      }
    }
    dataPlan = null;
    throw new Error(problems.join("; "));
  };

  return {
    /** Every file in a folder, as {name, size, modifiedAt}. */
    async list(dir) {
      return parseList((await transfer(`LIST ${dir}`)).toString("utf8"));
    },

    /** The listing exactly as the printer wrote it — for when nothing matches. */
    async listRaw(dir) {
      return (await transfer(`LIST ${dir}`)).toString("utf8");
    },

    /** One file, whole, in memory. Timelapses are a few megabytes at most. */
    async download(remotePath) {
      return transfer(`RETR ${remotePath}`);
    },

    /** Which way of opening a transfer this printer accepted. */
    get mode() {
      return dataPlan?.name ?? "";
    },

    close() {
      try { control.write("QUIT" + CRLF); } catch { /* already gone */ }
      try { control.destroy(); } catch { /* already gone */ }
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
