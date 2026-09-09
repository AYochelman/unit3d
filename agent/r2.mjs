/**
 * Cloudflare R2, signed by hand.
 *
 * R2 speaks the S3 API, and the only hard part of the S3 API is the signature.
 * Doing it here — about sixty lines of standard AWS SigV4 — keeps the agent at
 * two dependencies instead of pulling the whole AWS SDK onto a machine whose
 * only job is to sit beside a printer.
 *
 * Nothing here logs a key, and the secret never leaves this process: it signs
 * requests, it is never sent.
 */
import crypto from "node:crypto";

const sha256hex = (b) => crypto.createHash("sha256").update(b).digest("hex");
const hmac = (key, str) => crypto.createHmac("sha256", key).update(str).digest();

/** S3 wants each path segment escaped, but not the slashes between them. */
const escapeKey = (key) =>
  key.split("/").map((p) => encodeURIComponent(p)).join("/");

export function makeR2({ accountId, accessKeyId, secretAccessKey, bucket }) {
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const region = "auto";
  const service = "s3";

  async function send(method, key, body, extraHeaders = {}) {
    const payload = body ?? Buffer.alloc(0);
    const hash = sha256hex(payload);
    const amzDate = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const date = amzDate.slice(0, 8);
    const uri = `/${bucket}/${escapeKey(key)}`;

    // Header names are lowercased and sorted; that ordering is part of what
    // gets signed, so it has to match exactly what is sent.
    const headers = {};
    for (const [k, v] of Object.entries({ ...extraHeaders, host, "x-amz-content-sha256": hash, "x-amz-date": amzDate })) {
      headers[k.toLowerCase()] = String(v).trim();
    }
    const names = Object.keys(headers).sort();
    const canonicalHeaders = names.map((n) => `${n}:${headers[n]}\n`).join("");
    const signedHeaders = names.join(";");

    const canonicalRequest = [method, uri, "", canonicalHeaders, signedHeaders, hash].join("\n");
    const scope = `${date}/${region}/${service}/aws4_request`;
    const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256hex(Buffer.from(canonicalRequest))].join("\n");

    let signing = hmac(Buffer.from(`AWS4${secretAccessKey}`), date);
    for (const part of [region, service, "aws4_request"]) signing = hmac(signing, part);
    const signature = crypto.createHmac("sha256", signing).update(toSign).digest("hex");

    headers.authorization =
      `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    delete headers.host; // fetch sets it, and setting it by hand is refused

    const res = await fetch(`https://${host}${uri}`, {
      method,
      headers,
      body: method === "PUT" ? payload : undefined,
    });
    return res;
  }

  return {
    /** Overwrites whatever is at `key`. Returns true when R2 accepted it. */
    async put(key, body, contentType, cacheControl) {
      const res = await send("PUT", key, body, {
        "content-type": contentType,
        ...(cacheControl ? { "cache-control": cacheControl } : {}),
      });
      return { ok: res.ok, status: res.status, text: res.ok ? "" : (await res.text()).slice(0, 200) };
    },

    async remove(key) {
      const res = await send("DELETE", key, null);
      return res.ok || res.status === 404;
    },

    /** A cheap round trip that proves the keys and the bucket name are right. */
    async check() {
      const res = await send("PUT", ".unit3d-check", Buffer.from("ok"), { "content-type": "text/plain" });
      if (res.ok) return { ok: true };
      return { ok: false, status: res.status, text: (await res.text()).slice(0, 300) };
    },
  };
}
