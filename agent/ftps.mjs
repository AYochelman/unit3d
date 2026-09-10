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
    const s = tls.connect({ host, port, rejectUnauthorized: false, timeout: 15_000 }, () => resolve(s));
    s.on("error", reject);
    s.on("timeout", () => { s.destroy(); reject(new Error("timed out reaching the printer's card")); });
  });
  control.setTimeout(0);
  const readReply = makeReader(control);
  // Remembered across transfers so only the first one pays for the guess.
  let dataMode = "";

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
   * Two details have to be right, and both were wrong the first time:
   *
   *   1. The data connection has to RESUME the control connection's TLS
   *      session. Without that the printer closes the socket — which is what
   *      made this look like a printer that refuses file transfer at all.
   *
   *   2. The socket is opened UNENCRYPTED, the command is sent, and only then
   *      is the socket upgraded to TLS. Handshaking before the command leaves
   *      both sides waiting for the other, which is a stall rather than a
   *      refusal and reads as if the printer simply went quiet. Python's own
   *      FTPS client orders it this way; that ordering is the whole trick.
   */
  const transfer = async (command) => {
    const pasv = await say("PASV", [227]);
    const m = /(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)/.exec(pasv.text);
    if (!m) throw new Error("could not read where to connect for the transfer");
    const dataPort = Number(m[5]) * 256 + Number(m[6]);

    // Implicit FTPS puts the data channel in TLS from the first byte, the same
    // as the control channel on 990. Handshake first, then ask — and if the
    // printer will not handshake until it knows what is wanted, ask first and
    // upgrade after. Which one a firmware wants is not worth guessing at, so
    // both are tried and the one that answers is remembered.
    const raw = await new Promise((resolve, reject) => {
      const d = net.connect({ host, port: dataPort }, () => resolve(d));
      d.setTimeout(30_000);
      d.on("error", reject);
      d.on("timeout", () => { d.destroy(); reject(new Error("the printer did not open the transfer")); });
    });

    const handshake = () =>
      new Promise((resolve, reject) => {
        const t = tls.connect({ socket: raw, rejectUnauthorized: false, session: control.getSession() }, () => resolve(t));
        t.once("error", reject);
        setTimeout(() => reject(new Error("no handshake")), 6000);
      });

    let secure = null;
    if (dataMode !== "command-first") {
      secure = await handshake().catch(() => null);
      if (secure) dataMode = "tls-first";
    }

    // The command goes out over the control connection.
    control.write(command + CRLF);
    const start = await readReply(20_000);
    if (![125, 150].includes(start.code)) {
      raw.destroy();
      throw new Error(`${command.split(" ")[0]} refused (${start.code})`);
    }

    if (!secure) {
      secure = await handshake();
      dataMode = "command-first";
    }

    const body = await new Promise((resolve, reject) => {
      const chunks = [];
      let settled = false;
      const finish = (fn, v) => { if (settled) return; settled = true; fn(v); };
      secure.on("data", (c) => chunks.push(c));
      secure.on("end", () => finish(resolve, Buffer.concat(chunks)));
      secure.on("close", () => finish(resolve, Buffer.concat(chunks)));
      // Bambu drops the connection rather than closing it politely once a file
      // is out, so bytes already in hand beat a clean goodbye.
      const settleWith = (err) => {
        if (chunks.length) finish(resolve, Buffer.concat(chunks));
        else finish(reject, err);
      };
      secure.on("error", settleWith);
      secure.setTimeout(60_000, () => {
        secure.destroy();
        settleWith(new Error("the transfer stalled"));
      });
    });

    await readReply(20_000).catch(() => {});   // the 226 that closes it
    return body;
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
