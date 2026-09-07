/**
 * The GitHub token that lets the admin write to the site, kept on this device.
 *
 * The shop is a static build with no server of its own, so the only way a page
 * can change the site is to commit to the repository — and that needs a
 * credential. The owner asked for one click, not a paste before every save, so
 * the token is stored here, on his machine, and nowhere else.
 *
 * This is the ONE exception to the project's no-browser-storage rule, and it is
 * deliberate: everything else the rule protects is customer state, which has no
 * business surviving a visit. This is the owner's own key on the owner's own
 * device, and the alternative is retyping a credential to publish every batch
 * of decisions.
 *
 * Keep the token narrow. A fine-grained token limited to this one repository
 * with `Contents: Read and write` can do exactly one thing if it ever leaks:
 * commit to a public 3D-printing shop. Do not use a classic token, and do not
 * grant it anything else.
 */
const KEY = "unit3d.gh";

/** localStorage throws in private windows and with site data blocked. */
function store(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const s = window.localStorage;
    s.getItem(KEY);
    return s;
  } catch {
    return null;
  }
}

export function readToken(): string {
  try {
    return store()?.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeToken(token: string): void {
  try {
    const s = store();
    if (!s) return;
    if (token.trim()) s.setItem(KEY, token.trim());
    else s.removeItem(KEY);
  } catch {
    /* nothing to do: the save form still works, it just asks each time */
  }
}

/** True when this browser can remember it at all — private windows cannot. */
export const canRemember = (): boolean => store() !== null;
