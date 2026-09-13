/**
 * The unit emblem on the "לחיילים" slide, drawn.
 *
 * The photograph of it never reaches this machine — it arrives in the
 * conversation, not on the disk — so rather than leave a generic shield there,
 * this is a vector rendition of the print itself: spread green wings, a blue
 * bird's head with a red open beak, and a commando dagger laid across them.
 *
 * It is a stand-in with a deadline. `HeroCarousel` asks for
 * /img/hero/soldiers.webp first; the moment that file exists in the repo the
 * photograph wins and this is never drawn. Nothing needs changing for that to
 * happen — drop the file in.
 */
export default function UnitWings({ className }: { className?: string }) {
  const feathers = [
    "M0,-34 C110,-52 230,-78 322,-104 C300,-72 250,-46 190,-30 C130,-15 60,-12 0,-14 Z",
    "M0,-14 C120,-22 250,-34 372,-44 C348,-12 292,6 222,14 C150,22 70,20 0,12 Z",
    "M0,12 C130,10 260,16 386,30 C352,58 290,72 216,70 C146,68 68,54 0,38 Z",
    "M0,38 C120,44 236,62 344,92 C300,116 238,122 176,110 C116,98 54,74 0,58 Z",
    "M0,58 C104,74 200,100 286,138 C238,152 186,150 138,134 C88,118 38,88 0,74 Z",
  ];

  return (
    <svg viewBox="0 0 960 420" className={className} role="img" aria-label="סמל יחידה — כנפיים, ראש ופגיון">
      <title>סמל יחידה</title>

      {/* The black layer the whole emblem is printed on top of. */}
      <g stroke="#0b0b0c" strokeWidth="13" strokeLinejoin="round" fill="#1f7a34">
        <g transform="translate(480,206) scale(1.34,0.86)">
          {feathers.map((d, i) => <path key={`r${i}`} d={d} />)}
          <g transform="scale(-1,1)">
            {feathers.map((d, i) => <path key={`l${i}`} d={d} />)}
          </g>
        </g>
      </g>

      {/* The head: a blue shield with two eyes and an open beak. */}
      <g transform="translate(480,200) scale(0.84)">
        <path
          d="M-78,-72 C-78,-104 -44,-124 0,-124 C44,-124 78,-104 78,-72 C78,-18 44,26 0,46 C-44,26 -78,-18 -78,-72 Z"
          fill="#1b47a8" stroke="#0b0b0c" strokeWidth="13" strokeLinejoin="round"
        />
        <path d="M-52,-66 L-16,-56 L-50,-40 Z" fill="#c0392b" stroke="#0b0b0c" strokeWidth="7" strokeLinejoin="round" />
        <path d="M52,-66 L16,-56 L50,-40 Z" fill="#c0392b" stroke="#0b0b0c" strokeWidth="7" strokeLinejoin="round" />
        <path d="M-34,-14 L34,-14 L0,34 Z" fill="#c0392b" stroke="#0b0b0c" strokeWidth="9" strokeLinejoin="round" />
      </g>

      {/* The dagger, laid across everything. */}
      <g transform="translate(480,214)" stroke="#0b0b0c" strokeWidth="11" strokeLinejoin="round">
        <path d="M-386,0 L-232,-26 L-232,26 Z" fill="#e9ecef" />
        <path d="M-232,-24 L92,-19 L92,19 L-232,24 Z" fill="#dfe3e8" />
        <path d="M88,-42 L112,-42 L112,42 L88,42 Z" fill="#c9ced6" />
        <path d="M118,-21 L246,-21 L246,21 L118,21 Z" fill="#e3e7ec" />
        {[0, 1, 2, 3, 4].map((i) => (
          <path key={i} d={`M${132 + i * 23},-21 L${146 + i * 23},21`} stroke="#0b0b0c" strokeWidth="8" fill="none" />
        ))}
        <path d="M250,-25 L288,0 L250,25 Z" fill="#c9ced6" />
      </g>
    </svg>
  );
}
