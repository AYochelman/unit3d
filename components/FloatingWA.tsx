import Icon from "./ui/Icon";
import { CONTACT } from "@/lib/contact";

export default function FloatingWA() {
  return (
    <a
      href={CONTACT.whatsapp}
      aria-label="פתח וואטסאפ"
      className="fab fixed left-6 z-30 inline-flex items-center justify-center h-14 w-14 rounded-full bg-good text-ink-950 shadow-soft hover:shadow-glow hover:-translate-y-0.5 transition-all duration-200"
    >
      <Icon name="whatsapp" size={26} />
    </a>
  );
}
