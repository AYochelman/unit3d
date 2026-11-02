import LegalPage, { Row, Section } from "@/components/legal/LegalPage";
import Link from "next/link";
import ConsentReset from "@/components/ConsentReset";

export const metadata = {
  title: "מדיניות עוגיות · Unit 3D",
  description: "אילו עוגיות יש באתר (רק Google Analytics, ורק בהסכמה), מה נמדד בלעדיהן, ואיך משנים את הבחירה.",
  alternates: { canonical: "/cookies/" },
};

export default function CookiesPage() {
  return (
    <LegalPage
      current="/cookies"
      title="מדיניות עוגיות"
      lead="רשימה קצרה: עוגייה אחת שזוכרת את הבחירה שלך, ועוגיות של Google Analytics — רק אם אישרת."
    >
      <Section n="1" title="Google Analytics — רק בהסכמה">
        <p>
          כדי להבין איך גולשים באתר (אילו עמודים נצפים, מאיפה מגיעים, מאיזה מכשיר) אנחנו משתמשים
          ב־Google Analytics. <strong className="text-ink-100">הוא לא נטען עד שאתה מאשר</strong> בחלון
          שמופיע בכניסה הראשונה, ובאותו חלון אפשר לדחות בלחיצה אחת, באותה קלות.
        </p>
        <dl className="mt-1">
          <Row k="מה הוא מציב">עוגיות בשם <span dir="ltr">_ga</span> ו־<span dir="ltr">_ga_…</span>, לתקופה של עד שנתיים.</Row>
          <Row k="מי מפעיל">Google LLC. המידע מעובד בשרתים מחוץ לישראל, לפי מדיניות הפרטיות של Google.</Row>
          <Row k="מה לא">לא שם, לא טלפון ולא דוא״ל. לא משמש לפרסום ולא לרימרקטינג.</Row>
        </dl>
        <ConsentReset />
        <p className="text-ink-400 text-sm">בדחייה, או בשינוי הבחירה לדחייה, עוגיות ה־Analytics שכבר הוצבו נמחקות.</p>
      </Section>

      <Section n="2" title="עוגייה אחת שזוכרת את הבחירה">
        <dl className="mt-1">
          <Row k="u3d_consent">
            שומרת &quot;אישרת&quot; או &quot;דחית&quot; לשנה, כדי שלא נשאל אותך שוב בכל עמוד. היא
            חיונית לכך שהבחירה שלך תכובד, ולכן לא נדרשת עליה הסכמה.
          </Row>
        </dl>
      </Section>

      <Section n="3" title="המדידה שלנו — בלי עוגיות">
        <p>
          בנוסף, האתר רושם אצלנו סטטיסטיקה אנונימית: איזה עמוד נפתח, מאיזה מקור הגעת (למשל גוגל
          או אינסטגרם), וסוג המכשיר (טלפון / טאבלט / מחשב). אין בה שם, טלפון, דוא״ל או כתובת IP.
        </p>
        <p>
          כדי שכמה עמודים של אותו ביקור לא ייספרו כמה אנשים, נשמר מזהה אקראי ב־sessionStorage של
          הלשונית. הוא לא מזהה אותך, ונמחק ברגע שסוגרים את הלשונית.
        </p>
      </Section>

      <Section n="4" title="מה לא קיים כאן">
        <p>נבדק אחד־אחד בקוד המקור:</p>
        <dl className="mt-1">
          <Row k="פיקסל פייסבוק / מטא">לא מותקן.</Row>
          <Row k="פיקסל טיקטוק">לא מותקן.</Row>
          <Row k="רשתות פרסום ורימרקטינג">אין.</Row>
          <Row k="הקלטת מסך / מפות חום">אין.</Row>
          <Row k="כפתורי שיתוף של רשתות">אין. הקישורים לאינסטגרם ולוואטסאפ הם קישורים רגילים שלא טוענים כלום עד שלוחצים.</Row>
          <Row k="גופני Google">הגופנים מוגשים מהשרת שלנו. הדפדפן שלך לא פונה ל־Google בזמן טעינת האתר.</Row>
          <Row k="תמונות מאתרי הדגמים">כל התמונות מאוחסנות אצלנו. הדפדפן שלך לא פונה לשרת של פלטפורמת דגמים כדי להציג מוצר.</Row>
        </dl>
      </Section>

      <Section n="5" title="שני חריגים, לשם דיוק">
        <dl className="mt-1">
          <Row k="ממשק הניהול">
            עמוד הניהול (לבעל העסק בלבד) שומר את פרטי ההתחברות שלו ב־localStorage. זה אחסון חיוני
            לתפקוד ההתחברות, הוא לא נוגע למבקרים באתר, והוא פטור מהסכמה גם לפי הדין המחמיר.
          </Row>
          <Row k="יומני שרת">
            שירות האחסון של האתר רושם כתובות IP ביומני השרת שלו, כמו כל שרת אינטרנט. זו לא עוגייה,
            אין לנו גישה לזה, ואנחנו לא משתמשים בזה. מוסבר ב־
            <Link href="/privacy#s3" className="text-flame-300 underline hover:text-flame">סעיף 3ג במדיניות הפרטיות</Link>.
          </Row>
        </dl>
      </Section>

      <Section n="6" title="איך לבדוק אותנו">
        <p>
          בכל דפדפן: F12 ← לשונית Application (או Storage) ← Cookies. לפני שבחרת לא תראה שם כלום;
          אחרי דחייה — רק <span dir="ltr">u3d_consent</span>.
        </p>
      </Section>
    </LegalPage>
  );
}
