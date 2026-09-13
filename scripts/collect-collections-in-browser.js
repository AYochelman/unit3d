/* ============================================================================
   Unit 3D — כל האוספים שלך במייקרוורלד, בהדבקה אחת.

   ⚠️ לא ללחוץ פעמיים על הקובץ. הוא רץ בתוך הדפדפן בלבד.

   למה זה קיים: השרת שלנו לא מצליח לפתוח את דפי האוספים — Cloudflare חוסם
   אותו. בדקנו שוב היום, מחובר עם החשבון שלך, ושמונה מתוך שמונה נחסמו.
   הדפדפן שלך לא נחסם, כי אתה משתמש אמיתי עם session אמיתי. אז הסקריפט הזה
   מבקש את הדפים מתוך הדפדפן שלך, ולא מהשרת.

   ההבדל מהקובץ הישן (collect-in-browser.js): שם היית צריך לפתוח כל אוסף
   בנפרד, לגלול עד הסוף, להדביק, ולאחד קבצים. כאן מדביקים פעם אחת.

   איך משתמשים:
   1. פתח את מייקרוורלד בדפדפן, מחובר לחשבון שלך. כל עמוד באתר מתאים.
   2. F12 ← לשונית Console.
   3. הדבק את כל הקובץ הזה ו-Enter.
   4. חכה. הוא עובר אוסף אחרי אוסף ומדפיס התקדמות.
   5. בסוף הרשימה מועתקת ללוח, ויורד גם קובץ makerworld-raw.json.

   מה עושים עם הרשימה:
   GitHub ← Actions ← "Model candidates" ← Run workflow ← להדביק בשדה.
   השרת שם כן מצליח למשוך את פרטי כל מודל לפי מספר — רק את דפי האוספים לא.
   כל מה שייאסף ייכנס ל-/admin ← "מודלים לאישור". שום דבר לא עולה לחנות לבד.
   ========================================================================== */
(async () => {
  const PROFILE = "Erez.yoch";
  const ORIGIN = location.origin.includes("makerworld") ? location.origin : "https://makerworld.com";
  const MODEL = /\/models\/(\d+)/g;
  const COLLECTION = /\/collections\/(\d+)-([a-z0-9-]*)/gi;
  const log = (msg, style = "") => console.log(`%c${msg}`, style || "color:#7aa2f7");

  if (!location.host.includes("makerworld")) {
    alert("צריך להריץ את זה מתוך makerworld.com, כשאתה מחובר.\nפתח כל עמוד באתר, F12 ← Console, והדבק שוב.");
    return;
  }

  /** One page, as HTML, through the session this browser already has. */
  async function grab(url) {
    try {
      const res = await fetch(url, { credentials: "include", headers: { accept: "text/html" } });
      if (!res.ok) return null;
      return await res.text();
    } catch {
      return null;
    }
  }

  const idsIn = (html, re) => {
    const out = new Map();
    let m;
    const r = new RegExp(re.source, re.flags);
    while ((m = r.exec(html))) out.set(m[1], m[2] ?? "");
    return out;
  };

  // ── 1. which collections exist ────────────────────────────────────────────
  log("קורא את רשימת האוספים…");
  const profile = await grab(`${ORIGIN}/en/@${PROFILE}/collections`);
  const collections = profile ? [...idsIn(profile, COLLECTION)] : [];
  if (!collections.length) {
    alert("לא הצלחתי לקרוא את רשימת האוספים.\nוודא שאתה מחובר לחשבון, ונסה שוב מעמוד הפרופיל שלך.");
    return;
  }
  log(`${collections.length} אוספים: ${collections.map(([, s]) => s || "?").join(", ")}`, "font-weight:bold");

  // ── 2. every model in every collection ────────────────────────────────────
  // Collections page rather than scroll, so this asks for page after page until
  // one brings nothing new. 40 is a ceiling, not an expectation.
  const all = new Map();
  for (const [id, slug] of collections) {
    let found = 0;
    for (let page = 1; page <= 40; page++) {
      const html = await grab(`${ORIGIN}/en/collections/${id}-${slug}?page=${page}`);
      if (!html) break;
      const models = idsIn(html, MODEL);
      let fresh = 0;
      for (const [mid] of models) if (!all.has(mid)) { all.set(mid, slug); fresh++; }
      found += models.size;
      // Nothing new on this page means the list has ended (or repeats).
      if (!fresh) break;
      await new Promise((r) => setTimeout(r, 350));
    }
    log(`  ${slug || id}: ${found} קישורים`);
  }

  const ids = [...all.keys()];
  if (!ids.length) {
    alert("האוספים נקראו אבל לא נמצאו מודלים.\nייתכן שהם פרטיים — נסה כשאתה מחובר לחשבון שלך.");
    return;
  }

  // ── 3. out ────────────────────────────────────────────────────────────────
  const line = ids.join(" ");
  try { await navigator.clipboard.writeText(line); } catch { /* printed below anyway */ }

  const blob = new Blob([JSON.stringify(ids.map((id) => ({ id, url: `${ORIGIN}/en/models/${id}` })), null, 2)],
    { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "makerworld-raw.json";
  document.body.appendChild(a);
  a.click();
  a.remove();

  log(`\n${ids.length} מודלים מ-${collections.length} אוספים. הרשימה בלוח:`, "font-weight:bold;color:#9ece6a");
  console.log(line);
  alert(
    `נאספו ${ids.length} מודלים מ-${collections.length} אוספים.\n\n` +
      `הרשימה הועתקה ללוח. להדביק ב:\n` +
      `GitHub ← Actions ← "Model candidates" ← Run workflow\n\n` +
      `הכל ייכנס ל"מודלים לאישור" ב-/admin. כלום לא עולה לחנות לבד.`,
  );
})();
