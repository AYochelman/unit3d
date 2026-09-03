import Icon from "./ui/Icon";

export default function FloatingWA() {
  return (
    <a
      href="https://wa.me/972500000000"
      aria-label="פתח וואטסאפ"
      className="fixed bottom-6 left-6 z-30 inline-flex items-center justify-center h-14 w-14 rounded-full bg-good text-ink-950 shadow-soft hover:shadow-glow hover:-translate-y-0.5 transition-all duration-200"
    >
      <Icon name="whatsapp" size={26} />
    </a>
  );
}
