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
import tls from "node:tls";

const CRLF = "\r\n";

/** A reply is done when a line starts with three digits and a space. */
function readReply(sock, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    let buf = "";
    const done = (fn, v) => {
      clearTimeout(timer);
      sock.off("data", onData);
      sock.off("error", onError);
      fn(v);
    };
    const onData = (d) => {
      buf += d.toString("utf8");
      const lines = buf.split(CRLF);
      for (const line of lines) {
        if (/^\d{3} /.test(line)) return done(resolve, { code: Number(line.slice(0, 3)), text: buf.trim() });
      }
    };
    const onError = (e) => done(reject, e);
    const timer = setTimeout(() => done(reject, new Error("the printer did not answer")), timeoutMs);
    sock.on("data", onData);
    sock.on("error", onError);
  });
}

export async function connectPrinterFtps({ host, password, user = "bblp", port = 990 }) {
  const control = await new Promise((resolve, reject) => {
    const s = tls.connect({ host, port, rejectUnauthorized: false, timeout: 15_000 }, () => resolve(s));
    s.on("error", reject);
    s.on("timeout", () => { s.destroy(); reject(new Error("timed out reaching the printer's card")); });
  });
  control.setTimeout(0);

  const say = async (cmd, okCodes) => {
    control.write(cmd + CRLF);
    const r = await readReply(control);
    if (okCodes && !okCodes.includes(r.code)) {
      throw new Error(`${cmd.split(" ")[0]} refused (${r.code})`);
    }
    return r;
  };

  await readReply(control);                 // the greeting
  await say(`USER ${user}`, [230, 331]);
  await say(`PASS ${password}`, [230]);
  await say("PBSZ 0", [200]);
  await say("PROT P", [200]);
  await say("TYPE I", [200]);

  /**
   * Open a data connection for one transfer.
   *
   * The session of the control connection is handed to it: without that the
   * printer closes the socket immediately, which is the failure that made
   * timelapses look impossible.
   */
  const dataConnection = async () => {
    const pasv = await say("PASV", [227]);
    const m = /(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)/.exec(pasv.text);
    if (!m) throw new Error("could not read where to connect for the transfer");
    const dataPort = Number(m[5]) * 256 + Number(m[6]);
    const session = control.getSession();
    return new Promise((resolve, reject) => {
      const d = tls.connect(
        { host, port: dataPort, rejectUnauthorized: false, session, timeout: 30_000 },
        () => resolve(d),
      );
      d.on("error", reject);
      d.on("timeout", () => { d.destroy(); reject(new Error("the transfer stalled")); });
    });
  };

  const collect = (sock) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      sock.on("data", (c) => chunks.push(c));
      sock.on("end", () => resolve(Buffer.concat(chunks)));
      sock.on("error", reject);
    });

  return {
    /** Every file in a folder, as {name, size, modifiedAt}. */
    async list(dir) {
      const data = await dataConnection();
      const body = collect(data);
      await say(`LIST ${dir}`, [125, 150]);
      const text = (await body).toString("utf8");
      await readReply(control);             // the 226 that closes the transfer
      return parseList(text);
    },

    /** One file, whole, in memory. Timelapses are a few megabytes at most. */
    async download(remotePath) {
      const data = await dataConnection();
      const body = collect(data);
      await say(`RETR ${remotePath}`, [125, 150]);
      const buf = await body;
      await readReply(control);
      return buf;
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
