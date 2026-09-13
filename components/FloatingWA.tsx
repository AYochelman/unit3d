"use client";
import Icon from "./ui/Icon";
import { CONTACT } from "@/lib/contact";
import { track } from "@/lib/analytics";

export default function FloatingWA() {
  return (
    <a
      href={CONTACT.whatsapp}
      aria-label="פתח וואטסאפ"
      // The one number worth having: how many people who opened the shop
      // actually reached for it.
      onClick={() => track("whatsapp_click", { from: window.location.pathname })}
      className="fab fixed left-6 z-30 inline-flex items-center justify-center h-14 w-14 rounded-full bg-good text-ink-950 shadow-soft hover:shadow-glow hover:-translate-y-0.5 transition-all duration-200"
    >
      <Icon name="whatsapp" size={26} />
    </a>
  );
}
