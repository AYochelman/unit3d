"use client";
import { useCallback, useEffect, useState } from "react";
import { adminRefresh, adminSignIn } from "./orders-remote";
import { forgetSession, readSession, writeSession } from "./admin-session";
import { useAdminStore } from "./admin-store";

/**
 * The owner's sign-in, shared by every tab that touches private data.
 *
 * Orders and expenses are two views of the same thing — the shop's own books —
 * so signing in twice to see them would be theatre. The access token lives in
 * the admin store for the life of the tab, the refresh token on the device, and
 * whichever tab is opened first is the one that restores the session.
 */
export function useSupabaseSession() {
  const token = useAdminStore((s) => s.sbToken);
  const setToken = useAdminStore((s) => s.setSbToken);

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Whether the remembered sign-in has been tried, so a form never flashes over
  // a session that is about to open by itself.
  const [tried, setTried] = useState(false);

  useEffect(() => {
    let alive = true;
    const saved = readSession();
    // Already signed in on another tab of the admin — nothing to restore.
    const opening = token || !saved ? Promise.resolve(null) : adminRefresh(saved.refresh);
    void opening.then((s) => {
      if (!alive) return;
      if (saved) setEmail((e) => e || saved.email);
      if (saved && !token && !s) forgetSession();
      if (saved && s) {
        writeSession(saved.email, s.refresh || saved.refresh);
        setToken(s.access);
      }
      setTried(true);
    });
    return () => { alive = false; };
  }, [token, setToken]);

  const signIn = useCallback(async (mail: string, password: string) => {
    setBusy(true);
    setError("");
    const s = await adminSignIn(mail.trim(), password);
    setBusy(false);
    if (!s) { setError("המייל או הסיסמה לא נכונים."); return false; }
    writeSession(mail.trim(), s.refresh);
    setToken(s.access);
    setEmail(mail.trim());
    return true;
  }, [setToken]);

  const signOut = useCallback(() => {
    forgetSession();
    setToken("");
  }, [setToken]);

  return { token, email, setEmail, busy, error, setError, tried, signIn, signOut };
}
