// Comprehensive IDF unit hierarchy: Branch (זרוע/אגף) → Corps (חיל) → Brigade (חטיבה) → Battalion (גדוד)
// Slugs are used for emblem file lookups: /emblems/<slug>.png

import type { EmblemShape } from "./types";

export type UnitBranch =
  | "ground"
  | "air"
  | "sea"
  | "intel"
  | "tech"
  | "comm"
  | "med"
  | "mp"
  | "commando"
  | "elite";

export type Battalion = {
  slug: string;
  name: string;
  number?: string;
  nickname?: string;
  desc?: string;
  fallbackShape?: EmblemShape;
  fallbackHue?: number;
};

export type Brigade = {
  slug: string;
  name: string;
  number?: string;
  desc?: string;
  fallbackShape?: EmblemShape;
  fallbackHue?: number;
  battalions: Battalion[];
};

export type Corps = {
  slug: string;
  name: string;
  desc?: string;
  fallbackShape?: EmblemShape;
  fallbackHue?: number;
  brigades: Brigade[];
};

export type BranchNode = {
  id: UnitBranch;
  slug: string;
  name: string;
  shortName: string;
  desc?: string;
  fallbackHue: number;
  fallbackShape?: EmblemShape;
  corps: Corps[];
};

export const BRANCH_TREE: BranchNode[] = [
  // =========================================================================
  // זרוע היבשה
  // =========================================================================
  {
    id: "ground",
    slug: "ground",
    name: "זרוע היבשה",
    shortName: "יבשה",
    desc: "החטיבות, החילות וגדודי הקרב היבשתיים של צה\"ל.",
    fallbackHue: 90,
    fallbackShape: "shield",
    corps: [
      {
        slug: "infantry",
        name: "חיל הרגלים (חי\"ר)",
        desc: "חטיבות הצנחנים, גולני, גבעתי, נחל, כפיר.",
        fallbackHue: 90,
        fallbackShape: "shield",
        brigades: [
          {
            slug: "golani",
            name: "חטיבת גולני",
            number: "1",
            desc: "החטיבה הוותיקה ביותר בצה\"ל. 'העץ הירוק'.",
            fallbackHue: 100,
            fallbackShape: "shield",
            battalions: [
              { slug: "golani-12-barak", number: "12", name: "גדוד 12", nickname: "ברק" },
              { slug: "golani-13-gideon", number: "13", name: "גדוד 13", nickname: "גדעון" },
              { slug: "golani-51-habokim", number: "51", name: "גדוד 51", nickname: "הבוקעים הראשונים" },
              { slug: "golani-egoz", number: "621", name: "סיירת אגוז", nickname: "אגוז" },
              { slug: "golani-recon", number: "631", name: "גדוד הסיור גולני", nickname: "פלס\"ר גולני" },
            ],
          },
          {
            slug: "paratroopers",
            name: "חטיבת הצנחנים",
            number: "35",
            desc: "הכומתה האדומה. חטיבת לוחמת ראשונה במעלה.",
            fallbackHue: 0,
            fallbackShape: "wings",
            battalions: [
              { slug: "para-101-peten", number: "101", name: "גדוד 101", nickname: "פתן" },
              { slug: "para-202-cobra", number: "202", name: "גדוד 202", nickname: "צפע" },
              { slug: "para-890-efe", number: "890", name: "גדוד 890", nickname: "אפעה" },
              { slug: "para-5135-james", number: "5135", name: "גדוד 5135 (מיל')", nickname: "ג'יימס" },
              { slug: "para-pelsar", number: "5173", name: "פלס\"ר צנחנים", nickname: "פלס\"ר" },
            ],
          },
          {
            slug: "givati",
            name: "חטיבת גבעתי",
            number: "84",
            desc: "החטיבה הסגולה. דרום הארץ ועזה.",
            fallbackHue: 280,
            fallbackShape: "shield",
            battalions: [
              { slug: "givati-432-tzabar", number: "432", name: "גדוד 432", nickname: "צבר", desc: "גדוד צבר. הגדוד הראשי של חטיבת גבעתי." },
              { slug: "givati-433-shaked", number: "433", name: "גדוד 433", nickname: "שקד" },
              { slug: "givati-435-rotem", number: "435", name: "גדוד 435", nickname: "רותם" },
              { slug: "givati-424-shualey-shimshon", number: "424", name: "גדוד 424", nickname: "שועלי שמשון (פלס\"ר)" },
              { slug: "givati-605-engineering", number: "605", name: "גדוד 605", nickname: "מחץ (הנדסה)" },
            ],
          },
          {
            slug: "nahal",
            name: "חטיבת הנח\"ל",
            number: "933",
            desc: "הכומתה הכהה. חטיבת ה-933.",
            fallbackHue: 150,
            fallbackShape: "shield",
            battalions: [
              { slug: "nahal-50-haharel", number: "50", name: "גדוד 50", nickname: "החרל" },
              { slug: "nahal-931", number: "931", name: "גדוד 931", nickname: "ההצבא הראשון" },
              { slug: "nahal-932-granite", number: "932", name: "גדוד 932", nickname: "גרניט" },
              { slug: "nahal-pelsar", number: "9325", name: "פלס\"ר נח\"ל", nickname: "פלס\"ר" },
            ],
          },
          {
            slug: "kfir",
            name: "חטיבת כפיר",
            number: "900",
            desc: "החטיבה הצעירה. חטיבת לוחמה בערים ופעילות באיו\"ש.",
            fallbackHue: 50,
            fallbackShape: "shield",
            battalions: [
              { slug: "kfir-90-nachshon", number: "90", name: "גדוד 90", nickname: "נחשון" },
              { slug: "kfir-92-shimshon", number: "92", name: "גדוד 92", nickname: "שמשון" },
              { slug: "kfir-93-haruv", number: "93", name: "גדוד 93", nickname: "חרוב" },
              { slug: "kfir-94-duchifat", number: "94", name: "גדוד 94", nickname: "דוכיפת" },
              { slug: "kfir-97-netzah-yehuda", number: "97", name: "גדוד 97", nickname: "נצח יהודה" },
            ],
          },
        ],
      },
      {
        slug: "armor",
        name: "חיל השריון",
        desc: "חטיבות הטנקים. כומתה שחורה.",
        fallbackHue: 20,
        fallbackShape: "diamond",
        brigades: [
          {
            slug: "armor-7",
            name: "חטיבה 7",
            number: "7",
            desc: "חטיבת 'סער מגולן'. החטיבה הסדירה הוותיקה.",
            fallbackHue: 35,
            fallbackShape: "diamond",
            battalions: [
              { slug: "armor-7-75-romach", number: "75", name: "גדוד 75", nickname: "רומח" },
              { slug: "armor-7-77-oz", number: "77", name: "גדוד 77", nickname: "עוז" },
              { slug: "armor-7-82-bnei-itshar", number: "82", name: "גדוד 82", nickname: "בני יצהר" },
              { slug: "armor-7-recon-75", number: "75", name: "גדוד הסיור 75", nickname: "פלס\"ר 7" },
            ],
          },
          {
            slug: "armor-188",
            name: "חטיבה 188",
            number: "188",
            desc: "חטיבת 'ברק'.",
            fallbackHue: 200,
            fallbackShape: "diamond",
            battalions: [
              { slug: "armor-188-53-shualey-habashan", number: "53", name: "גדוד 53", nickname: "שועלי הבשן" },
              { slug: "armor-188-71-ahihoud", number: "71", name: "גדוד 71", nickname: "אחיהוד" },
              { slug: "armor-188-74-habokim", number: "74", name: "גדוד 74", nickname: "הבוקעים" },
            ],
          },
          {
            slug: "armor-401",
            name: "חטיבה 401",
            number: "401",
            desc: "חטיבת 'עקבות הברזל'.",
            fallbackHue: 220,
            fallbackShape: "diamond",
            battalions: [
              { slug: "armor-401-9-eshet", number: "9", name: "גדוד 9", nickname: "אשת" },
              { slug: "armor-401-46-shelah", number: "46", name: "גדוד 46", nickname: "שלח" },
              { slug: "armor-401-52-habokim", number: "52", name: "גדוד 52", nickname: "הבוקעים השניים" },
              { slug: "armor-401-recon-601", number: "601", name: "גדוד הסיור 601" },
            ],
          },
          {
            slug: "armor-460",
            name: "חטיבה 460",
            number: "460",
            desc: "חטיבת 'בני אור' - חטיבת ההדרכה.",
            fallbackHue: 50,
            fallbackShape: "diamond",
            battalions: [
              { slug: "armor-460-195", number: "195", name: "גדוד 195" },
              { slug: "armor-460-198", number: "198", name: "גדוד 198" },
              { slug: "armor-460-9203", number: "9203", name: "גדוד 9203" },
            ],
          },
        ],
      },
      {
        slug: "reserve-brigades",
        name: "חטיבות מילואים",
        desc: "חטיבות מילואים היסטוריות וקרביות.",
        fallbackHue: 130,
        fallbackShape: "shield",
        brigades: [
          {
            slug: "res-jerusalem",
            name: "חטיבת ירושלים",
            number: "16",
            desc: "חטיבת מילואים, אזור ירושלים והרי יהודה.",
            fallbackHue: 280,
            fallbackShape: "shield",
            battalions: [
              { slug: "res-jerusalem-bn", name: "חטיבת ירושלים", nickname: "חטיבה 16" },
            ],
          },
          {
            slug: "res-alexandroni",
            name: "חטיבת אלכסנדרוני",
            number: "3",
            desc: "חטיבת מילואים היסטורית. אחת מחטיבות 1948.",
            fallbackHue: 200,
            fallbackShape: "shield",
            battalions: [
              { slug: "res-alexandroni-bn", name: "חטיבת אלכסנדרוני", nickname: "חטיבה 3" },
            ],
          },
          {
            slug: "res-harel",
            name: "חטיבת הראל",
            number: "10",
            desc: "חטיבת מילואים. סמל פלמ\"ח עם גפנים של קריית ענבים.",
            fallbackHue: 150,
            fallbackShape: "shield",
            battalions: [
              { slug: "res-harel-bn", name: "חטיבת הראל", nickname: "חטיבה 10" },
            ],
          },
          {
            slug: "res-yiftach",
            name: "חטיבת יפתח",
            desc: "חטיבת מילואים היסטורית. ראשיתה בפלמ\"ח.",
            fallbackHue: 220,
            fallbackShape: "shield",
            battalions: [
              { slug: "res-yiftach-bn", name: "חטיבת יפתח" },
            ],
          },
          {
            slug: "res-brigade-5",
            name: "חטיבה 5 (קציעות)",
            number: "5",
            desc: "חטיבת מילואים. סמל עם צבר, הרים, חרב וקשת.",
            fallbackHue: 90,
            fallbackShape: "shield",
            battalions: [
              { slug: "res-brigade-5-bn", name: "חטיבה 5" },
            ],
          },
          {
            slug: "res-brigade-14",
            name: "חטיבה 14 (הביזון)",
            number: "14",
            desc: "חטיבת מילואים השריון. סמל הביזון.",
            fallbackHue: 30,
            fallbackShape: "diamond",
            battalions: [
              { slug: "res-brigade-14-bn", name: "חטיבה 14" },
            ],
          },
          {
            slug: "res-brigade-55",
            name: "חטיבה 55 (צנחנים מילואים)",
            number: "55",
            desc: "חטיבת צנחני מילואים.",
            fallbackHue: 0,
            fallbackShape: "wings",
            battalions: [
              { slug: "res-brigade-55-bn", name: "חטיבה 55" },
            ],
          },
          {
            slug: "res-brigade-551",
            name: "חטיבה 551 (חצי האש)",
            number: "551",
            desc: "עוצבת חצי האש - צנחני מילואים.",
            fallbackHue: 10,
            fallbackShape: "wings",
            battalions: [
              { slug: "res-brigade-551-bn", name: "חטיבה 551" },
            ],
          },
          {
            slug: "res-menashe",
            name: "חטיבת מנשה",
            desc: "חטיבת מילואים. סמל עם הרי הגלבוע.",
            fallbackHue: 50,
            fallbackShape: "shield",
            battalions: [
              { slug: "res-menashe-bn", name: "חטיבת מנשה" },
            ],
          },
        ],
      },
      {
        slug: "artillery",
        name: "חיל התותחנים",
        desc: "האש העקיפה. רקטות, תותחים ומל\"טי מטרה.",
        fallbackHue: 15,
        fallbackShape: "hex",
        brigades: [
          {
            slug: "art-215",
            name: "אגד אש 215",
            number: "215",
            desc: "אגד אש בצפון.",
            fallbackHue: 25,
            fallbackShape: "hex",
            battalions: [
              { slug: "art-215-334-marav", number: "334", name: "גדוד 334", nickname: "מארב" },
              { slug: "art-215-405-cheetz-shahor", number: "405", name: "גדוד 405", nickname: "חץ שחור" },
              { slug: "art-215-411-yuri", number: "411", name: "גדוד 411", nickname: "יורי" },
            ],
          },
          {
            slug: "art-282",
            name: "אגד אש 282",
            number: "282",
            desc: "אגד אש בדרום.",
            fallbackHue: 40,
            fallbackShape: "hex",
            battalions: [
              { slug: "art-282-403", number: "403", name: "גדוד 403" },
              { slug: "art-282-454", number: "454", name: "גדוד 454" },
              { slug: "art-282-55", number: "55", name: "גדוד 55", nickname: "תותחני הקרקע" },
            ],
          },
          {
            slug: "art-meteor",
            name: "אגד מטאור",
            desc: "אגד טילים וניתוב אש.",
            fallbackHue: 195,
            fallbackShape: "hex",
            battalions: [
              { slug: "art-meteor-rocket", name: "גדוד טילים" },
              { slug: "art-meteor-uav", name: "גדוד מל\"טים תוקפניים" },
            ],
          },
        ],
      },
      {
        slug: "engineering",
        name: "חיל הנדסה קרבית",
        desc: "פתיחת ציר, פינוי מוקשים, חבלה והשמדה.",
        fallbackHue: 30,
        fallbackShape: "hex",
        brigades: [
          {
            slug: "eng-yahalom",
            name: "יחידת יהל\"ם",
            desc: "יחידת הנדסה הקרבית של חיל ההנדסה. ימ\"ם, סיור הנדסי, פירוק מטענים, תת-קרקע.",
            fallbackHue: 320,
            fallbackShape: "hex",
            battalions: [
              { slug: "yahalom-sayfan", name: "סייפן" },
              { slug: "yahalom-yael", name: "יע\"ל" },
              { slug: "yahalom-samur", name: "סמור (תת-קרקע)" },
              { slug: "yahalom-maavarim", name: "מעברים" },
            ],
          },
          {
            slug: "eng-sadir",
            name: "סדיר (גדודי הנדסה)",
            desc: "גדודי הנדסה קרבית בחטיבות.",
            fallbackHue: 60,
            fallbackShape: "hex",
            battalions: [
              { slug: "eng-601-asaf", number: "601", name: "גדוד 601", nickname: "אסף (שריון)" },
              { slug: "eng-603-machatz", number: "603", name: "גדוד 603", nickname: "מחץ (שריון)" },
              { slug: "eng-605-machatz", number: "605", name: "גדוד 605", nickname: "מחץ (גבעתי)" },
            ],
          },
        ],
      },
      {
        slug: "combat-intel",
        name: "חיל האיסוף הקרבי",
        desc: "סיור, איסוף ומודיעין גזרתי.",
        fallbackHue: 280,
        fallbackShape: "hex",
        brigades: [
          {
            slug: "ci-recon",
            name: "גדודי סיור גזרתיים",
            desc: "גדודי סיור הנפרסים במרחבים.",
            fallbackHue: 285,
            fallbackShape: "hex",
            battalions: [
              { slug: "ci-595-nesher", number: "595", name: "גדוד 595", nickname: "נשר" },
              { slug: "ci-636-rotem", number: "636", name: "גדוד 636", nickname: "רותם" },
              { slug: "ci-727-eitam", number: "727", name: "גדוד 727", nickname: "איתם" },
              { slug: "ci-869-nitzan", number: "869", name: "גדוד 869", nickname: "ניצן/שחף" },
            ],
          },
          {
            slug: "ci-oketz",
            name: "יחידת עוקץ",
            desc: "יחידת הכלבנים של חיל האיסוף הקרבי.",
            fallbackHue: 270,
            fallbackShape: "hex",
            battalions: [
              { slug: "ci-oketz-bn", name: "יחידת עוקץ" },
            ],
          },
        ],
      },
      {
        slug: "border-defense",
        name: "חי\"ר גבולות ופלח\"ץ",
        desc: "חטיבת החילוץ וההדרכה ומערך הגבולות.",
        fallbackHue: 120,
        fallbackShape: "shield",
        brigades: [
          {
            slug: "bd-plahatz",
            name: "חטיבת החילוץ וההדרכה (פלח\"ץ)",
            desc: "חילוץ והדרכה בתנאי שטח קשים.",
            fallbackHue: 130,
            fallbackShape: "shield",
            battalions: [
              { slug: "plahatz-669", number: "669", name: "יחידה 669", nickname: "חילוץ קרבי" },
              { slug: "plahatz-search-rescue", name: "גדוד חיפוש והצלה" },
            ],
          },
          {
            slug: "bd-borders",
            name: "מערך הגבולות",
            desc: "אבטחת הגבולות הצפוני, המזרחי והדרומי.",
            fallbackHue: 110,
            fallbackShape: "shield",
            battalions: [
              { slug: "borders-bardelas", name: "גדוד ברדלס" },
              { slug: "borders-caracal", name: "גדוד קרקל" },
              { slug: "borders-lions-of-jordan", name: "גדוד אריות הירדן" },
              { slug: "borders-cheetah", name: "גדוד צ'יטה" },
            ],
          },
          {
            slug: "bd-territorial",
            name: "חטיבות מרחביות",
            desc: "חטיבות אחריות גזרתית — איו\"ש, הבקעה והערבה.",
            fallbackHue: 130,
            fallbackShape: "shield",
            battalions: [
              { slug: "bd-ephraim", name: "חטיבת אפרים", desc: "צפון השומרון." },
              { slug: "bd-etzion", name: "חטיבת עציון", desc: "גוש עציון ודרום ירושלים." },
              { slug: "bd-judea", name: "חטיבת יהודה", desc: "חברון ודרום הר חברון. סמל מערת המכפלה." },
              { slug: "bd-arava", name: "חטיבת הערבה", desc: "אזור הערבה הדרומית." },
            ],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // חטיבת הקומנדו (אוגדה מיוחדת תחת זרוע היבשה)
  // =========================================================================
  {
    id: "commando",
    slug: "commando",
    name: "חטיבת הקומנדו (89)",
    shortName: "קומנדו",
    desc: "חטיבת לוחמה מיוחדת. חמש יחידות שונות.",
    fallbackHue: 320,
    fallbackShape: "diamond",
    corps: [
      {
        slug: "commando-89",
        name: "חטיבה 89",
        desc: "קומנדו צבא היבשה.",
        fallbackHue: 330,
        fallbackShape: "diamond",
        brigades: [
          {
            slug: "commando-units",
            name: "יחידות הקומנדו",
            desc: "יחידות לוחמת ים, אוויר ויבשה.",
            fallbackHue: 340,
            fallbackShape: "diamond",
            battalions: [
              { slug: "commando-maglan", number: "212", name: "מגלן", nickname: "צוות איתור בעומק" },
              { slug: "commando-egoz-89", number: "621", name: "אגוז (תחת קומנדו)" },
              { slug: "commando-duvdevan", number: "217", name: "דובדבן", nickname: "מסתערבים" },
              { slug: "commando-rimon", name: "רימון", nickname: "מסתערבי הדרום" },
              { slug: "commando-shaldag-link", name: "שלדג (תיאום)" },
            ],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // זרוע האוויר והחלל
  // =========================================================================
  {
    id: "air",
    slug: "air",
    name: "זרוע האוויר והחלל",
    shortName: "אוויר",
    desc: "טייסות המטוסים, המסוקים, המל\"טים וההגנה האווירית.",
    fallbackHue: 200,
    fallbackShape: "wings",
    corps: [
      {
        slug: "fighter-squadrons",
        name: "טייסות קרב",
        desc: "מטוסי קרב - F-16, F-15, F-35.",
        fallbackHue: 210,
        fallbackShape: "wings",
        brigades: [
          {
            slug: "f35-squadrons",
            name: "טייסות F-35 (אדיר)",
            desc: "מטוסי הקרב הדור החמישי.",
            fallbackHue: 215,
            fallbackShape: "wings",
            battalions: [
              { slug: "sq-140-golden-eagle", number: "140", name: "טייסת 140", nickname: "עקרבים זהובים" },
              { slug: "sq-116-flying-wing", number: "116", name: "טייסת 116", nickname: "אגף מעופף" },
            ],
          },
          {
            slug: "f15-squadrons",
            name: "טייסות F-15 (בז/רעם)",
            desc: "מטוסי קרב כבדים.",
            fallbackHue: 220,
            fallbackShape: "wings",
            battalions: [
              { slug: "sq-133-knights-of-twin-tail", number: "133", name: "טייסת 133", nickname: "אבירי הזנב הכפול" },
              { slug: "sq-106-spear-tip", number: "106", name: "טייסת 106", nickname: "ראש החנית" },
              { slug: "sq-69-hammers", number: "69", name: "טייסת 69", nickname: "הפטישים" },
            ],
          },
          {
            slug: "f16-squadrons",
            name: "טייסות F-16 (סופה/ברק)",
            desc: "מטוסי קרב רב-תכליתיים.",
            fallbackHue: 230,
            fallbackShape: "wings",
            battalions: [
              { slug: "sq-101-first", number: "101", name: "טייסת 101", nickname: "הטייסת הראשונה" },
              { slug: "sq-102-flying-tiger", number: "102", name: "טייסת 102", nickname: "הנמר המעופף" },
              { slug: "sq-105-scorpion", number: "105", name: "טייסת 105", nickname: "העקרב" },
              { slug: "sq-107-knights-of-orange-tail", number: "107", name: "טייסת 107", nickname: "אבירי הזנב הכתום" },
              { slug: "sq-109-valley", number: "109", name: "טייסת 109", nickname: "העמק" },
              { slug: "sq-110-knights-of-north", number: "110", name: "טייסת 110", nickname: "אבירי הצפון" },
              { slug: "sq-117-first-jet", number: "117", name: "טייסת 117", nickname: "הסילון הראשון" },
              { slug: "sq-119-bat", number: "119", name: "טייסת 119", nickname: "העטלף" },
              { slug: "sq-149-smashing-parrot", number: "149", name: "טייסת 149", nickname: "התוכי המנפץ" },
              { slug: "sq-201-one", number: "201", name: "טייסת 201", nickname: "האחת" },
              { slug: "sq-253-negev", number: "253", name: "טייסת 253", nickname: "הנגב" },
              { slug: "sq-254-eaglets", number: "254", name: "טייסת 254", nickname: "גוזלי הנגב" },
            ],
          },
          {
            slug: "training-squadrons",
            name: "טייסות הדרכה ואימון",
            desc: "טייסות בית הספר לטיסה והדרכה מתקדמת.",
            fallbackHue: 25,
            fallbackShape: "wings",
            battalions: [
              { slug: "sq-115-red-dragon", number: "115", name: "טייסת 115", nickname: "הדרקון האדום (אדומים)" },
              { slug: "sq-red-baron", name: "טייסת הברון האדום", nickname: "אימון מתקדם" },
            ],
          },
        ],
      },
      {
        slug: "helicopter-squadrons",
        name: "טייסות מסוקים",
        desc: "מסוקים יעודיים, תקיפה והובלה.",
        fallbackHue: 250,
        fallbackShape: "wings",
        brigades: [
          {
            slug: "attack-helicopters",
            name: "מסוקי תקיפה (AH-64 'פטן')",
            fallbackHue: 255,
            fallbackShape: "wings",
            battalions: [
              { slug: "sq-113-hornet", number: "113", name: "טייסת 113", nickname: "הצרעה" },
              { slug: "sq-190-southern-magen", number: "190", name: "טייסת 190", nickname: "מגן הדרום" },
            ],
          },
          {
            slug: "transport-helicopters",
            name: "מסוקי הובלה (CH-53/UH-60)",
            fallbackHue: 260,
            fallbackShape: "wings",
            battalions: [
              { slug: "sq-114-night-leaders", number: "114", name: "טייסת 114", nickname: "מנהיגי הלילה" },
              { slug: "sq-118-night-riders", number: "118", name: "טייסת 118", nickname: "רוכבי הלילה" },
              { slug: "sq-123-desert-birds", number: "123", name: "טייסת 123", nickname: "ציפורי המדבר" },
              { slug: "sq-124-rolling-sword", number: "124", name: "טייסת 124", nickname: "החרב המסתחררת" },
              { slug: "sq-125-rescue", number: "125", name: "טייסת 125", nickname: "מסוקי חילוץ" },
              { slug: "sq-193-defenders-west", number: "193", name: "טייסת 193", nickname: "מגיני המערב" },
            ],
          },
        ],
      },
      {
        slug: "uav-squadrons",
        name: "טייסות מל\"ט",
        desc: "כלי טיס ללא טייס.",
        fallbackHue: 270,
        fallbackShape: "wings",
        brigades: [
          {
            slug: "uav-units",
            name: "טייסות מל\"ט",
            fallbackHue: 275,
            fallbackShape: "wings",
            battalions: [
              { slug: "sq-100-flying-camel", number: "100", name: "טייסת 100", nickname: "גמלי הקסם" },
              { slug: "sq-144-asam", number: "144", name: "טייסת 144", nickname: "אסם" },
              { slug: "sq-147-hammers", number: "147", name: "טייסת 147", nickname: "פטישים" },
              { slug: "sq-160-falcons", number: "160", name: "טייסת 160", nickname: "הבזים" },
              { slug: "sq-161-eagles-of-jordan", number: "161", name: "טייסת 161", nickname: "נשר הירדן" },
              { slug: "sq-166-training-uav", number: "166", name: "טייסת 166", nickname: "אימון מל\"ט" },
              { slug: "sq-200-first-uav", number: "200", name: "טייסת 200", nickname: "המל\"ט הראשון" },
              { slug: "sq-210-white-eagle", number: "210", name: "טייסת 210", nickname: "הנשר הלבן" },
            ],
          },
        ],
      },
      {
        slug: "transport-squadrons",
        name: "טייסות תובלה",
        desc: "Hercules, Boeing 707, ב.מ.ע.",
        fallbackHue: 290,
        fallbackShape: "wings",
        brigades: [
          {
            slug: "transport-units",
            name: "טייסות תובלה",
            fallbackHue: 295,
            fallbackShape: "wings",
            battalions: [
              { slug: "sq-103-elephants", number: "103", name: "טייסת 103", nickname: "הפילים המעופפים" },
              { slug: "sq-120-international", number: "120", name: "טייסת 120", nickname: "המדינה הבינלאומית" },
              { slug: "sq-122-nahshon", number: "122", name: "טייסת 122", nickname: "נחשון" },
              { slug: "sq-131-knights-of-yellow-bird", number: "131", name: "טייסת 131", nickname: "אבירי הציפור הצהובה" },
              { slug: "sq-135-light-transport", number: "135", name: "טייסת 135", nickname: "תובלה קלה" },
              { slug: "sq-192-jet-trainers", number: "192", name: "טייסת 192", nickname: "מאמני סילון" },
              { slug: "sq-249-airwork", number: "249", name: "טייסת 249", nickname: "כריזת אוויר" },
            ],
          },
        ],
      },
      {
        slug: "air-defense",
        name: "מערך ההגנה האווירית",
        desc: "כיפת ברזל, חץ, פטריוט, מערך הראם.",
        fallbackHue: 180,
        fallbackShape: "hex",
        brigades: [
          {
            slug: "iron-dome",
            name: "כיפת ברזל",
            desc: "סוללות יירוט טווח קצר.",
            fallbackHue: 185,
            fallbackShape: "hex",
            battalions: [
              { slug: "ad-138-iron-dome", number: "138", name: "גדוד 138 - כיפת ברזל" },
              { slug: "ad-947-iron-dome", number: "947", name: "גדוד 947 - כיפת ברזל" },
            ],
          },
          {
            slug: "arrow",
            name: "מערך החץ",
            desc: "יירוט טילים בליסטיים.",
            fallbackHue: 175,
            fallbackShape: "hex",
            battalions: [
              { slug: "ad-arrow-136", number: "136", name: "גדוד 136 - חץ" },
            ],
          },
          {
            slug: "patriot-davids",
            name: "פטריוט ושרביט קסמים",
            desc: "יירוט טווח בינוני וטילי שיוט.",
            fallbackHue: 170,
            fallbackShape: "hex",
            battalions: [
              { slug: "ad-879-patriot", number: "879", name: "גדוד 879 - פטריוט" },
              { slug: "ad-davids-sling", name: "סוללת שרביט קסמים" },
            ],
          },
        ],
      },
      {
        slug: "air-special",
        name: "יחידות מיוחדות באוויר",
        desc: "שלדג, ל\"מ, יע\"ל אווירית.",
        fallbackHue: 350,
        fallbackShape: "wings",
        brigades: [
          {
            slug: "air-elite-units",
            name: "יחידות עילית של חיל האוויר",
            fallbackHue: 355,
            fallbackShape: "wings",
            battalions: [
              { slug: "shaldag-5101", number: "5101", name: "יחידת שלדג", nickname: "מצבעת מטרות מהאוויר" },
              { slug: "669-rescue", number: "669", name: "יחידה 669", nickname: "חילוץ קרבי מוטס" },
              { slug: "5707-lotem", number: "5707", name: "ל\"מ - לוחמה מודיעינית אווירית" },
            ],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // זרוע הים
  // =========================================================================
  {
    id: "sea",
    slug: "sea",
    name: "זרוע הים",
    shortName: "ים",
    desc: "ספינות, צוללות, ושייטות לוחמה ימית.",
    fallbackHue: 220,
    fallbackShape: "anchor",
    corps: [
      {
        slug: "fleet",
        name: "מערך הספינות",
        desc: "טיל, סער ומגן.",
        fallbackHue: 225,
        fallbackShape: "anchor",
        brigades: [
          {
            slug: "fleet-3",
            name: "שייטת 3 - שייטת הטילים",
            number: "3",
            desc: "ספינות הטילים סער 5/6.",
            fallbackHue: 215,
            fallbackShape: "anchor",
            battalions: [
              { slug: "sea-3-saar-5", name: "סער 5 (אילת)" },
              { slug: "sea-3-saar-6", name: "סער 6 (מגן)" },
              { slug: "sea-3-flotilla", name: "מטה שייטת 3" },
            ],
          },
          {
            slug: "fleet-7",
            name: "שייטת 7 - הצוללות",
            number: "7",
            desc: "צוללות דקאר ודולפין.",
            fallbackHue: 230,
            fallbackShape: "anchor",
            battalions: [
              { slug: "sea-7-dolphin", name: "צוללות דולפין" },
              { slug: "sea-7-tanin", name: "צוללות תנין" },
              { slug: "sea-7-flotilla", name: "מטה שייטת 7" },
            ],
          },
          {
            slug: "fleet-9",
            name: "שייטת ספינות פטרול",
            number: "9",
            desc: "ספינות סער 4.5 ודבור 3.",
            fallbackHue: 240,
            fallbackShape: "anchor",
            battalions: [
              { slug: "sea-9-dvora", name: "ספינות דבורה/שלדג" },
              { slug: "sea-9-tzofit", name: "ספינות צופית" },
            ],
          },
        ],
      },
      {
        slug: "sea-special",
        name: "שייטת 13 - הקומנדו הימי",
        desc: "יחידת הלוחמה הימית. הסיירת של חיל הים.",
        fallbackHue: 260,
        fallbackShape: "anchor",
        brigades: [
          {
            slug: "shayetet-13",
            name: "שייטת 13",
            number: "13",
            desc: "יחידת הקומנדו הימי. הכומתה הירוקה.",
            fallbackHue: 265,
            fallbackShape: "anchor",
            battalions: [
              { slug: "sea-13-strike", name: "מחלקת תקיפה" },
              { slug: "sea-13-recon", name: "מחלקת איסוף ימי" },
              { slug: "sea-13-engineering", name: "מחלקת חבלה ימית" },
            ],
          },
        ],
      },
      {
        slug: "sea-coastal",
        name: "מערך החוף וההגנה",
        desc: "סטחי\"ם, פלוגות הגנה לאורך החוף.",
        fallbackHue: 195,
        fallbackShape: "anchor",
        brigades: [
          {
            slug: "coastal-units",
            name: "פלוגות הגנת חוף",
            fallbackHue: 200,
            fallbackShape: "anchor",
            battalions: [
              { slug: "sea-coast-north", name: "פלוגת הגנה צפון" },
              { slug: "sea-coast-center", name: "פלוגת הגנה מרכז" },
              { slug: "sea-coast-south", name: "פלוגת הגנה דרום (אשדוד/אילת)" },
            ],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // אגף המודיעין
  // =========================================================================
  {
    id: "intel",
    slug: "intel",
    name: "אגף המודיעין (אמ\"ן)",
    shortName: "אמ\"ן",
    desc: "מודיעין צה\"לי - סיגינט, ויזינט וחומינט.",
    fallbackHue: 285,
    fallbackShape: "hex",
    corps: [
      {
        slug: "sigint",
        name: "מודיעין אותות (סיגינט)",
        desc: "8200, האזנה ותקיפה סייברית.",
        fallbackHue: 290,
        fallbackShape: "hex",
        brigades: [
          {
            slug: "intel-8200",
            name: "יחידה 8200",
            number: "8200",
            desc: "יחידת המודיעין הטכנולוגית הראשית.",
            fallbackHue: 295,
            fallbackShape: "hex",
            battalions: [
              { slug: "8200-hatsav", name: "חצב - איסוף גלוי" },
              { slug: "8200-cyber", name: "סייבר התקפי" },
              { slug: "8200-dev", name: "פיתוח טכנולוגי" },
            ],
          },
        ],
      },
      {
        slug: "visint",
        name: "מודיעין ויזואלי (ויזינט)",
        desc: "פענוח לוויינים וצילומי אוויר.",
        fallbackHue: 280,
        fallbackShape: "hex",
        brigades: [
          {
            slug: "intel-9900",
            name: "יחידה 9900",
            number: "9900",
            desc: "פענוח חזותי. מצלמות, לוויינים, מל\"טים.",
            fallbackHue: 285,
            fallbackShape: "hex",
            battalions: [
              { slug: "9900-roim", name: "פלוגת רואים רחוק" },
              { slug: "9900-mapping", name: "מחלקת מיפוי" },
            ],
          },
        ],
      },
      {
        slug: "humint",
        name: "מודיעין אנושי (חומינט)",
        desc: "יחידה 504, חקירות ושב\"כ-תיאום.",
        fallbackHue: 270,
        fallbackShape: "hex",
        brigades: [
          {
            slug: "intel-504",
            name: "יחידה 504",
            number: "504",
            desc: "יחידת חקירות אנושיות באמ\"ן.",
            fallbackHue: 275,
            fallbackShape: "hex",
            battalions: [
              { slug: "504-north", name: "פלוגת צפון" },
              { slug: "504-south", name: "פלוגת דרום" },
              { slug: "504-judea-samaria", name: "פלוגת מרכז (איו\"ש)" },
            ],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // אגף התקשוב
  // =========================================================================
  {
    id: "comm",
    slug: "comm",
    name: "אגף התקשוב וההגנה בסייבר (ת\"ק)",
    shortName: "תקשוב",
    desc: "רשתות, סייבר הגנתי ולוט\"ם.",
    fallbackHue: 160,
    fallbackShape: "hex",
    corps: [
      {
        slug: "comm-lotem",
        name: "לוט\"ם",
        desc: "לוחמה ותקשוב מבצעי.",
        fallbackHue: 165,
        fallbackShape: "hex",
        brigades: [
          {
            slug: "lotem-units",
            name: "יחידות לוט\"ם",
            fallbackHue: 170,
            fallbackShape: "hex",
            battalions: [
              { slug: "lotem-mamram", name: "ממר\"ם - מרכז מחשבים ומידע" },
              { slug: "lotem-matzov", name: "מצו\"ב - מערכות שו\"ב" },
              { slug: "lotem-hoshen", name: "חוש\"ן - חטיבת השרתים" },
            ],
          },
        ],
      },
      {
        slug: "cyber-defense",
        name: "מערך ההגנה בסייבר",
        desc: "ההגנה הסייברית של צה\"ל.",
        fallbackHue: 155,
        fallbackShape: "hex",
        brigades: [
          {
            slug: "cyber-defense-units",
            name: "יחידות הגנת סייבר",
            fallbackHue: 158,
            fallbackShape: "hex",
            battalions: [
              { slug: "cyber-c4i", name: "מטה ההגנה בסייבר" },
              { slug: "cyber-soc", name: "מרכז שליטה והגנה (SOC)" },
            ],
          },
        ],
      },
      {
        slug: "comm-field",
        name: "תקשוב יחידתי",
        desc: "גדודי תקשוב באוגדות וחיילים.",
        fallbackHue: 150,
        fallbackShape: "hex",
        brigades: [
          {
            slug: "comm-field-units",
            name: "גדודי תקשוב",
            fallbackHue: 152,
            fallbackShape: "hex",
            battalions: [
              { slug: "comm-fld-yiftah", name: "גדוד יפתח (אוגדה 162)" },
              { slug: "comm-fld-shaked", name: "גדוד שקד (אוגדה 36)" },
              { slug: "comm-fld-southern", name: "גדוד תקשוב פיקוד דרום" },
            ],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // חיל הטכנולוגיה והאחזקה (הטכנולוגי/לוגיסטיקה)
  // =========================================================================
  {
    id: "tech",
    slug: "tech",
    name: "חיל הטכנולוגיה והאחזקה",
    shortName: "טכנולוגיה",
    desc: "אחזקת מערכות, חימוש וטכנולוגיה.",
    fallbackHue: 40,
    fallbackShape: "rect",
    corps: [
      {
        slug: "tech-corps",
        name: "החיל הטכנולוגי",
        desc: "חימוש, אחזקה ותחזוקה.",
        fallbackHue: 45,
        fallbackShape: "rect",
        brigades: [
          {
            slug: "ordnance",
            name: "חיל החימוש",
            desc: "תיקון וטיפול בנשק ותחמושת.",
            fallbackHue: 50,
            fallbackShape: "rect",
            battalions: [
              { slug: "ordnance-7100", number: "7100", name: "גדוד תחזוקה 7100" },
              { slug: "ordnance-7150", number: "7150", name: "גדוד 7150 - מרכז שיקום מסוקים" },
              { slug: "ordnance-650", number: "650", name: "גדוד 650 - מרכז שיקום שריון" },
            ],
          },
          {
            slug: "logistics",
            name: "חיל הלוגיסטיקה",
            desc: "שינוע, חלוקה ואספקה.",
            fallbackHue: 55,
            fallbackShape: "rect",
            battalions: [
              { slug: "log-trans-6320", number: "6320", name: "גדוד הובלה 6320" },
              { slug: "log-trans-6356", number: "6356", name: "גדוד הובלה 6356" },
              { slug: "log-supply-3530", number: "3530", name: "גדוד אספקה 3530" },
            ],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // חיל הרפואה
  // =========================================================================
  {
    id: "med",
    slug: "med",
    name: "חיל הרפואה",
    shortName: "רפואה",
    desc: "טיפול רפואי בלוחמים. רופאים, חובשים ואחים.",
    fallbackHue: 0,
    fallbackShape: "circle",
    corps: [
      {
        slug: "med-corps",
        name: "מערך הרפואה הצבאי",
        desc: "טיפול בקו הראשון, פינוי ובתי חולים שדה.",
        fallbackHue: 5,
        fallbackShape: "circle",
        brigades: [
          {
            slug: "med-field",
            name: "גדודי רפואה",
            desc: "גדודי הרפואה בחטיבות וחילים.",
            fallbackHue: 10,
            fallbackShape: "circle",
            battalions: [
              { slug: "med-7008", number: "7008", name: "גדוד רפואה 7008 (גולני)" },
              { slug: "med-7058", number: "7058", name: "גדוד רפואה 7058 (גבעתי)" },
              { slug: "med-7159", number: "7159", name: "גדוד רפואה 7159 (צנחנים)" },
              { slug: "med-7261", number: "7261", name: "גדוד רפואה 7261 (נחל)" },
              { slug: "med-7308", number: "7308", name: "גדוד רפואה 7308 (כפיר)" },
            ],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // המשטרה הצבאית
  // =========================================================================
  {
    id: "mp",
    slug: "mp",
    name: "המשטרה הצבאית",
    shortName: "מ\"צ",
    desc: "אכיפת חוק ומשמעת, אבטחת אישים והליכים.",
    fallbackHue: 240,
    fallbackShape: "shield",
    corps: [
      {
        slug: "mp-units",
        name: "יחידות המשטרה הצבאית",
        desc: "סדיר, חקירות וכליאה.",
        fallbackHue: 245,
        fallbackShape: "shield",
        brigades: [
          {
            slug: "mp-yamam-yatzbam",
            name: "מ\"צ - פיקוחיים",
            fallbackHue: 250,
            fallbackShape: "shield",
            battalions: [
              { slug: "mp-yatzbam-mercaz", name: "יצב\"ם מרכז" },
              { slug: "mp-yatzbam-north", name: "יצב\"ם צפון" },
              { slug: "mp-yatzbam-south", name: "יצב\"ם דרום" },
            ],
          },
          {
            slug: "mp-investigations",
            name: "מצ\"ח - חקירות פליליות",
            desc: "המשטרה הצבאית החוקרת.",
            fallbackHue: 255,
            fallbackShape: "shield",
            battalions: [
              { slug: "mp-mtzh-mercaz", name: "מצ\"ח מרכז" },
              { slug: "mp-mtzh-north", name: "מצ\"ח צפון" },
              { slug: "mp-mtzh-south", name: "מצ\"ח דרום" },
            ],
          },
          {
            slug: "mp-prisons",
            name: "שב\"ם וכליאה",
            fallbackHue: 260,
            fallbackShape: "shield",
            battalions: [
              { slug: "mp-prison-6", name: "כלא 6" },
              { slug: "mp-prison-10-tzrifin", name: "כלא 4 - צריפין" },
              { slug: "mp-prison-394-neve-tzedek", name: "כלא 394 - נווה צדק" },
            ],
          },
        ],
      },
    ],
  },

  // =========================================================================
  // יחידות מובחרות ועילית (מטכ"ל)
  // =========================================================================
  {
    id: "elite",
    slug: "elite",
    name: "יחידות מובחרות ועילית",
    shortName: "עילית",
    desc: "יחידות הסיירות המיוחדות תחת המטכ\"ל וזרועות.",
    fallbackHue: 60,
    fallbackShape: "diamond",
    corps: [
      {
        slug: "matkal-units",
        name: "יחידות מטכ\"ל",
        desc: "סיירות עילית הכפופות ישירות לרמטכ\"ל.",
        fallbackHue: 65,
        fallbackShape: "diamond",
        brigades: [
          {
            slug: "sayeret-matkal",
            name: "סיירת מטכ\"ל",
            number: "269",
            desc: "היחידה. סיור עומק, חילוץ ומיוחדות.",
            fallbackHue: 70,
            fallbackShape: "diamond",
            battalions: [
              { slug: "matkal-269", name: "סיירת מטכ\"ל (269)" },
            ],
          },
          {
            slug: "shaldag",
            name: "שלדג",
            number: "5101",
            desc: "יחידת הצבעת מטרות מהאוויר.",
            fallbackHue: 200,
            fallbackShape: "wings",
            battalions: [
              { slug: "shaldag-5101-bn", name: "יחידת שלדג" },
            ],
          },
          {
            slug: "shayetet-13-elite",
            name: "שייטת 13 (עילית)",
            number: "13",
            desc: "הקומנדו הימי.",
            fallbackHue: 230,
            fallbackShape: "anchor",
            battalions: [
              { slug: "shayetet-13-elite-bn", name: "שייטת 13" },
            ],
          },
          {
            slug: "yahalom-elite",
            name: "יהל\"ם",
            desc: "הנדסה קרבית עילית.",
            fallbackHue: 320,
            fallbackShape: "hex",
            battalions: [
              { slug: "yahalom-elite-bn", name: "יהל\"ם" },
            ],
          },
          {
            slug: "lotar-eilat",
            name: "לוט\"ר",
            desc: "לוחמה בטרור ושחרור חטופים.",
            fallbackHue: 0,
            fallbackShape: "shield",
            battalions: [
              { slug: "lotar-eilat-bn", name: "יחידת לוט\"ר" },
            ],
          },
        ],
      },
    ],
  },
];

// Flat list of all battalions for search
export function flattenBattalions() {
  const out: Array<{
    battalion: Battalion;
    brigade: Brigade;
    corps: Corps;
    branch: BranchNode;
  }> = [];
  for (const branch of BRANCH_TREE) {
    for (const corps of branch.corps) {
      for (const brigade of corps.brigades) {
        for (const battalion of brigade.battalions) {
          out.push({ battalion, brigade, corps, branch });
        }
      }
    }
  }
  return out;
}
