/* ============================================================================
   Unit 3D — האוספים והלייקים שלך במייקרוורלד, בהדבקה אחת.

   ⚠️ לא ללחוץ פעמיים על הקובץ. הוא רץ בתוך הדפדפן בלבד.

   למה זה קיים, אחרי שנבדק ולא נותר ספק:
     · כל דף אוסף מחזיר 403 לשרת שלנו. Cloudflare חוסם את הכתובת, לא את
       הבקשה — גם עם דפדפן אמיתי, גם מחובר עם ה-cookie שלך, שמונה מתוך שמונה.
     · אין למייקרוורלד API של אוספים. כל נתיב סביר מחזיר 404.
     · הפרמטרים collectionId / collection / filter בשירות החיפוש מתעלמים
       ומחזירים טרנדינג — נראה כמו הצלחה, ואינו.
     · קורא טקסט ציבורי חיצוני נחסם גם הוא.
     · אין גם נתיב API ללייקים. נבדקו שבעה.
     · ב-13:00 שירות החיפוש עדיין ענה לשרת; ב-21:12 אותו נתיב בדיוק החזיר
       403. Cloudflare הידק, והדלת שהייתה פתוחה בצהריים נסגרה בערב.
   כלומר: החסר היחיד הוא רשימת המספרים, והדפדפן שלך הוא הדלת היחידה אליה.

   איך משתמשים:
   1. פתח את מייקרוורלד בדפדפן, מחובר לחשבון שלך. כל עמוד באתר מתאים.
      (הוא עובר על הלייקים ועל כל האוספים בעצמו — אין צורך לפתוח אותם.)
   2. F12 ← לשונית Console.
   3. הדבק את כל הקובץ הזה ו-Enter.
   4. חכה. הוא עובר אוסף אחרי אוסף ומדפיס התקדמות.
   5. בסוף הרשימה מועתקת ללוח, ויורד גם קובץ makerworld-ids.json.

   מה עושים עם הרשימה: שולח לי אותה כאן, ואני מכניס אותה לתור האישורים —
   או GitHub ← Actions ← "Model candidates" ← Run workflow ← להדביק בשדה.
   בשני המקרים הכל נוחת ב-/admin ← "מודלים לאישור". כלום לא עולה לחנות לבד.
   ========================================================================== */
(async () => {
  const PROFILE = "Erez.yoch";
  const ORIGIN = "https://makerworld.com";
  const MODEL = /\/models\/(\d{3,9})/g;
  const COLLECTION = /\/collections\/(\d+)-([a-z0-9-]*)/gi;

  // The five that are written down in scripts/makerworld-sources.json. The
  // profile is still read, because there are three more and they change.
  const KNOWN = [
    ["28743692", "flexi"], ["29900505", "fidget"], ["26614634", "mine"],
    ["27816148", "statue"], ["29558316", "game"],
  ];

  const log = (m, s = "color:#7aa2f7") => console.log(`%c${m}`, s);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const idsIn = (text) => [...new Set([...text.matchAll(MODEL)].map((m) => m[1]))];
  const challenged = (t) => /just a moment|cf-chl|challenge-platform/i.test(t);

  if (!location.host.includes("makerworld")) {
    alert("צריך להריץ את זה מתוך makerworld.com, כשאתה מחובר.\nפתח כל עמוד באתר, F12 ← Console, והדבק שוב.");
    return;
  }

  /* ── three ways to read one page, weakest first ─────────────────────────
     The pages are a React app: a plain fetch often returns the shell without
     the model links, so a result of zero from fetch is not an answer. The
     iframe and the background tab both RENDER the page, and both are
     same-origin here, so their DOM can simply be read. */

  async function byFetch(url) {
    try {
      const res = await fetch(url, { credentials: "include", headers: { accept: "text/html" } });
      if (!res.ok) return null;
      const text = await res.text();
      if (challenged(text)) return null;
      const ids = idsIn(text);
      return ids.length ? ids : null;
    } catch { return null; }
  }

  async function byFrame(url) {
    const f = document.createElement("iframe");
    f.style.cssText = "position:fixed;left:-9999px;width:1200px;height:2000px;border:0";
    f.src = url;
    document.body.appendChild(f);
    try {
      for (let i = 0; i < 30; i++) {
        await wait(700);
        let html = "";
        try { html = f.contentDocument?.documentElement?.innerHTML || ""; } catch { break; } // framing refused
        if (html && !challenged(html)) {
          // Scroll it so the list keeps loading, then read again.
          try { f.contentWindow.scrollTo(0, f.contentDocument.body.scrollHeight); } catch { /* ignore */ }
          const ids = idsIn(html);
          if (ids.length && i > 4) return ids;
        }
      }
      try { return idsIn(f.contentDocument?.documentElement?.innerHTML || "") || null; } catch { return null; }
    } finally {
      f.remove();
    }
  }

  async function byTab(url) {
    const w = window.open(url, "_blank");
    if (!w) return "popup-blocked";
    try {
      let best = [];
      for (let i = 0; i < 40; i++) {
        await wait(800);
        let html = "";
        try { html = w.document?.documentElement?.innerHTML || ""; } catch { continue; }
        if (!html || challenged(html)) continue;
        try { w.scrollTo(0, w.document.body.scrollHeight); } catch { /* ignore */ }
        const ids = idsIn(html);
        if (ids.length > best.length) { best = ids; i = Math.max(i, 6); }
        else if (best.length && i > 12) break;
      }
      return best.length ? best : null;
    } finally {
      try { w.close(); } catch { /* ignore */ }
    }
  }

  async function read(url) {
    for (const [how, fn] of [["fetch", byFetch], ["iframe", byFrame], ["tab", byTab]]) {
      const r = await fn(url);
      if (r === "popup-blocked") return { how, ids: [], blocked: true };
      if (r && r.length) return { how, ids: r };
    }
    return { how: "—", ids: [] };
  }

  /* ── 1. which collections exist ─────────────────────────────────────── */
  log("קורא את רשימת האוספים…");
  // The five written down are the floor; the profile page adds the rest, and
  // there are three more than the file knows about.
  let collections = [...KNOWN];
  try {
    const res = await fetch(`${ORIGIN}/en/@${PROFILE}/collections`, { credentials: "include" });
    const html = await res.text();
    const found = [...new Map([...html.matchAll(COLLECTION)].map((m) => [m[1], m[2] || ""])).entries()];
    for (const [id, slug] of found) if (!collections.some(([k]) => k === id)) collections.push([id, slug]);
  } catch { /* the written-down five are enough to start */ }
  log(`${collections.length} אוספים: ${collections.map(([, s]) => s || "?").join(", ")}`, "font-weight:bold");

  /* ── 2. the likes tab ───────────────────────────────────────────────────
     A like is weaker than a collection — "this is good" rather than "I want
     this" — but he asked for both, and the shop's approval queue is where the
     difference gets decided anyway. MakerWorld has moved this tab around, so
     the address is tried rather than assumed. */
  const all = new Map();
  let popupBlocked = false;

  for (const likeUrl of [
    `${ORIGIN}/en/@${PROFILE}/likes`,
    `${ORIGIN}/en/@${PROFILE}?tab=likes`,
    `${ORIGIN}/en/@${PROFILE}/like`,
  ]) {
    const { how, ids, blocked } = await read(likeUrl);
    if (blocked) { popupBlocked = true; continue; }
    if (!ids.length) continue;
    let fresh = 0;
    for (const mid of ids) if (!all.has(mid)) { all.set(mid, "likes"); fresh++; }
    log(`  לייקים: ${ids.length} (${fresh} חדשים) · ${how}`);
    break; // the first address that answers is the right one
  }
  if (!all.size) log("  לייקים: לא נמצאו — ייתכן שהטאב מוסתר, ממשיך לאוספים", "color:#e0af68");

  /* ── 3. every model in every collection ─────────────────────────────── */
  for (const [id, slug] of collections) {
    const url = `${ORIGIN}/en/collections/${id}-${slug}`;
    const { how, ids, blocked } = await read(url);
    if (blocked) { popupBlocked = true; log(`  ${slug}: החלון נחסם — אשר חלונות קופצים ונסה שוב`, "color:#e0af68"); continue; }
    let fresh = 0;
    for (const mid of ids) if (!all.has(mid)) { all.set(mid, slug); fresh++; }
    log(`  ${slug || id}: ${ids.length} (${fresh} חדשים) · ${how}`);
    await wait(400);
  }

  /* ── 4. out ─────────────────────────────────────────────────────────── */
  const list = [...all.keys()];
  if (!list.length) {
    alert(
      popupBlocked
        ? "הדפדפן חסם את החלונות הקופצים.\nאשר אותם לאתר הזה (האייקון בשורת הכתובת) והדבק שוב."
        : "לא נמצאו מודלים.\nוודא שאתה מחובר לחשבון שלך במייקרוורלד, ונסה שוב.",
    );
    return;
  }

  const line = list.join(" ");
  try { await navigator.clipboard.writeText(line); } catch { /* printed below anyway */ }

  // Which collection each model came from, not only that it was seen.
  //
  // The file used to carry the flat list alone, and the shop cannot act on
  // that: a model saved to a collection is approved on the spot, while a
  // model that was merely LIKED waits for him — and a flat list cannot tell
  // the two apart. 82 models arrived that way and all of them had to queue,
  // including the ones he had already decided on by saving them.
  //
  // `all` has known the answer the whole time. It just was not written down.
  const groups = {};
  for (const [mid, from] of all) (groups[from] ??= []).push(mid);
  const pending = Object.entries(groups)
    .filter(([from]) => from !== "likes")
    .map(([collection, ids]) => ({ collection, ids }));

  const blob = new Blob([JSON.stringify({
    readAt: new Date().toISOString(),
    ids: list,
    likes: groups.likes ?? [],
    // Paste this straight into data/pending-models.json.
    pending,
  }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "makerworld-ids.json";
  document.body.appendChild(a);
  a.click();
  a.remove();

  log(`\n${list.length} מודלים מ-${collections.length} אוספים ומהלייקים. הרשימה בלוח:`, "font-weight:bold;color:#9ece6a");
  console.log(line);
  alert(
    `נאספו ${list.length} מודלים מ-${collections.length} אוספים.\n\n` +
      `הרשימה הועתקה ללוח. שלח לי אותה בצ'אט, או:\n` +
      `GitHub ← Actions ← "Model candidates" ← Run workflow\n\n` +
      `הכל ייכנס ל"מודלים לאישור" ב-/admin. כלום לא עולה לחנות לבד.`,
  );
})();
