"use client";
import { useSyncExternalStore } from "react";
import Icon from "./ui/Icon";

// Light mode is a class on <html> (see app/globals.css). Subscribe to it as an
// external store so the initial value is read without a setState-in-effect.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
const getSnapshot = () => document.documentElement.classList.contains("light");
const getServerSnapshot = () => false;

export default function ThemeToggle() {
  const light = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = () => {
    document.documentElement.classList.toggle("light", !light);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? "מעבר למצב כהה" : "מעבר למצב בהיר"}
      className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-ink-700/60 text-ink-300 hover:text-flame hover:border-flame transition-colors"
    >
      <Icon name={light ? "moon" : "sun"} size={18} />
    </button>
  );
}
