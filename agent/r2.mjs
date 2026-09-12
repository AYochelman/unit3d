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

  // `key` empty means the bucket itself (that is where its settings live);
  // `query` is a sub-resource such as `cors`, which is part of the signature.
  async function send(method, key, body, extraHeaders = {}, query = "") {
    const payload = body ?? Buffer.alloc(0);
    const hash = sha256hex(payload);
    const amzDate = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const date = amzDate.slice(0, 8);
    const uri = key ? `/${bucket}/${escapeKey(key)}` : `/${bucket}`;
    // A sub-resource with no value still signs as `name=`.
    const canonicalQuery = query ? `${query}=` : "";

    // Header names are lowercased and sorted; that ordering is part of what
    // gets signed, so it has to match exactly what is sent.
    const headers = {};
    for (const [k, v] of Object.entries({ ...extraHeaders, host, "x-amz-content-sha256": hash, "x-amz-date": amzDate })) {
      headers[k.toLowerCase()] = String(v).trim();
    }
    const names = Object.keys(headers).sort();
    const canonicalHeaders = names.map((n) => `${n}:${headers[n]}\n`).join("");
    const signedHeaders = names.join(";");

    const canonicalRequest = [method, uri, canonicalQuery, canonicalHeaders, signedHeaders, hash].join("\n");
    const scope = `${date}/${region}/${service}/aws4_request`;
    const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256hex(Buffer.from(canonicalRequest))].join("\n");

    let signing = hmac(Buffer.from(`AWS4${secretAccessKey}`), date);
    for (const part of [region, service, "aws4_request"]) signing = hmac(signing, part);
    const signature = crypto.createHmac("sha256", signing).update(toSign).digest("hex");

    headers.authorization =
      `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    delete headers.host; // fetch sets it, and setting it by hand is refused

    const res = await fetch(`https://${host}${uri}${query ? `?${query}` : ""}`, {
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

    /**
     * Which sites the browser is allowed to read this bucket from.
     *
     * This is the one setting that cannot be seen from the outside and stops
     * everything: the video player fetches the playlist with JavaScript, and a
     * browser throws away a cross-site response that does not carry permission
     * — silently, with no error the page can catch. A bucket with no policy at
     * all serves files perfectly to a browser typing the address and refuses
     * every one of them to the player.
     */
    async cors() {
      const res = await send("GET", "", null, {}, "cors");
      if (!res.ok) return { ok: false, status: res.status, origins: [] };
      const xml = await res.text();
      return { ok: true, status: 200, origins: [...xml.matchAll(/<AllowedOrigin>([^<]*)<\/AllowedOrigin>/g)].map((m) => m[1]) };
    },

    /** Lets those sites read it. Replaces whatever policy is there. */
    async setCors(origins) {
      const xml =
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<CORSConfiguration><CORSRule>` +
        origins.map((o) => `<AllowedOrigin>${o}</AllowedOrigin>`).join("") +
        `<AllowedMethod>GET</AllowedMethod><AllowedMethod>HEAD</AllowedMethod>` +
        `<AllowedHeader>*</AllowedHeader><MaxAgeSeconds>3600</MaxAgeSeconds>` +
        `</CORSRule></CORSConfiguration>`;
      const body = Buffer.from(xml);
      const res = await send("PUT", "", body, {
        "content-type": "application/xml",
        // S3 insists on this one for a settings write, and signs it with the rest.
        "content-md5": crypto.createHash("md5").update(body).digest("base64"),
      }, "cors");
      return { ok: res.ok, status: res.status, text: res.ok ? "" : (await res.text()).slice(0, 300) };
    },

    /** A cheap round trip that proves the keys and the bucket name are right. */
    async check() {
      const res = await send("PUT", ".unit3d-check", Buffer.from("ok"), { "content-type": "text/plain" });
      if (res.ok) return { ok: true };
      return { ok: false, status: res.status, text: (await res.text()).slice(0, 300) };
    },
  };
}
