"use client";
import { useEffect } from "react";

/**
 * Puts a class on <body> for as long as it is mounted.
 *
 * A component, not a hook, on purpose: the thing that wants the class (the
 * product page's buy bar) is rendered conditionally, and a hook called
 * conditionally is a hook called in a different order on the next render.
 * Rendering this beside the bar keeps its effect unconditional.
 */
export default function BodyClass({ name }: { name: string }) {
  useEffect(() => {
    document.body.classList.add(name);
    return () => document.body.classList.remove(name);
  }, [name]);
  return null;
}
