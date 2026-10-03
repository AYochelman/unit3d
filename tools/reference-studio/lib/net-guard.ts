import dns from "node:dns/promises";
import net from "node:net";

/**
 * The studio fetches URLs the user pastes. That is a server making requests on
 * behalf of a browser, so it has to be fenced: public HTTP(S) destinations
 * only, never the loopback interface, the LAN, cloud metadata endpoints or any
 * other address that is only reachable because the server is inside a network
 * the browser is not.
 */
export interface GuardResult {
  ok: boolean;
  url?: URL;
  addresses?: string[];
  reason?: string;
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_PORTS = new Set(["", "80", "443", "8080", "8443"]);

function isBlockedV4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p;
  if (a === 0) return true;                        // "this network"
  if (a === 10) return true;                       // private
  if (a === 127) return true;                      // loopback
  if (a === 169 && b === 254) return true;         // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true;         // private
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 192 && b === 0) return true;           // IETF protocol assignments
  if (a >= 224) return true;                       // multicast + reserved + broadcast
  return false;
}

function isBlockedV6(ip: string): boolean {
  const low = ip.toLowerCase().split("%")[0];
  if (low === "::" || low === "::1") return true;             // unspecified, loopback
  if (low.startsWith("fe8") || low.startsWith("fe9")) return true;
  if (low.startsWith("fea") || low.startsWith("feb")) return true; // link-local
  if (low.startsWith("fc") || low.startsWith("fd")) return true;   // unique local
  if (low.startsWith("ff")) return true;                       // multicast
  // IPv4-mapped (::ffff:10.0.0.1) has to be judged as the v4 address it is.
  const mapped = low.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedV4(mapped[1]);
  return false;
}

export function isBlockedAddress(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isBlockedV4(ip);
  if (version === 6) return isBlockedV6(ip);
  return true;
}

export async function guardUrl(raw: string): Promise<GuardResult> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "That is not a valid URL. Include the scheme, e.g. https://example.com" };
  }
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    return { ok: false, reason: `Only http:// and https:// can be captured (got ${url.protocol})` };
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    return { ok: false, reason: `Port ${url.port} is not allowed. Use 80, 443, 8080 or 8443.` };
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    return { ok: false, reason: "Local hostnames cannot be captured - this tool only reaches public sites." };
  }
  // A literal IP skips DNS but still has to pass the range check.
  if (net.isIP(host)) {
    if (isBlockedAddress(host)) return { ok: false, reason: `${host} is a private or reserved address.` };
    return { ok: true, url, addresses: [host] };
  }
  let addresses: string[];
  try {
    const records = await dns.lookup(host, { all: true, verbatim: true });
    addresses = records.map((r) => r.address);
  } catch {
    return { ok: false, reason: `Could not resolve ${host}. Check the address or your connection.` };
  }
  if (!addresses.length) return { ok: false, reason: `${host} has no addresses.` };
  // EVERY resolved address must be public: a name that resolves to both a
  // public and a private address is the classic rebinding trick.
  const blocked = addresses.filter(isBlockedAddress);
  if (blocked.length) {
    return { ok: false, reason: `${host} resolves to a private or reserved address (${blocked[0]}).` };
  }
  return { ok: true, url, addresses };
}
