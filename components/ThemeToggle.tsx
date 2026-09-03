"use client";
import { useEffect, useState } from "react";
import Icon from "./ui/Icon";

export default function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const isLight = document.documentElement.classList.contains("light");
    setLight(isLight);
  }, []);

  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
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
