/* ============================================================================
   Unit 3D — איסוף מודלים מדף מייקרוורלד, מתוך הדפדפן שלך.

   ⚠️ אל תלחץ פעמיים על הקובץ הזה. ווינדוס ינסה להריץ אותו כתוכנה ויציג
   "Windows Script Host — Syntax error". הקוד רץ בתוך הדפדפן בלבד.
   הדרך הנוחה: לחץ פעמיים על collect-models.html שבתיקייה הראשית.

   למה זה קיים: מייקרוורלד חוסם הורדה אוטומטית (Cloudflare). הדפדפן שלך לא
   חסום, כי אתה משתמש אמיתי. אז במקום שהסקריפט ייכנס לאתר — אתה נכנס, והוא
   רק אוסף את מה שכבר פתוח על המסך.

   איך משתמשים:
   1. פתח בדפדפן את דף האוסף (למשל האוסף "flexi").
   2. גלול עד הסוף, עד שכל המודלים נטענו.
   3. לחץ F12 → לשונית Console.
   4. הדבק את כל הקובץ הזה ולחץ Enter.
   5. ייווצר קובץ בשם makerworld-raw.json בתיקיית ההורדות.
   6. העבר אותו לתיקייה data/ בפרויקט, ולחץ פעמיים על import-models.bat.

   אפשר לחזור על זה לכל אוסף. הקובץ החדש דורס את הקודם, אז אם רוצים לאחד
   כמה אוספים — פתח אותם בזה אחר זה ופשוט הרץ שוב אחרי שאיחדת ידנית, או
   הוסף את כתובות האוספים ל-scripts/makerworld-sources.json.
   ========================================================================== */
(() => {
  const seen = new Map();
  document.querySelectorAll('a[href*="/models/"]').forEach((a) => {
    const m = (a.getAttribute("href") || "").match(/\/models\/(\d+)-?([a-z0-9-]*)/i);
    if (!m) return;
    const img = a.querySelector("img");
    const lines = (a.innerText || "").split("\n").map((s) => s.trim()).filter(Boolean);
    if (!seen.has(m[1])) {
      seen.set(m[1], {
        id: m[1],
        slug: m[2] || "",
        title: lines[0] || (img && img.alt) || "",
        cover: img ? img.currentSrc || img.src : undefined,
        designerName: lines.find((l) => /^@/.test(l))?.replace(/^@/, ""),
        url: new URL(a.getAttribute("href"), location.origin).href,
      });
    }
  });

  const list = [...seen.values()].filter((x) => x.title);
  if (!list.length) {
    alert("לא נמצאו מודלים בדף הזה. ודא שאתה על דף אוסף ושגללת עד הסוף.");
    return;
  }

  const blob = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "makerworld-raw.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  console.log(`נאספו ${list.length} מודלים. הקובץ ירד בשם makerworld-raw.json`);
  alert(`נאספו ${list.length} מודלים.\nהקובץ ירד בשם makerworld-raw.json — העבר אותו לתיקיית data בפרויקט.`);
})();
