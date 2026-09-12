"use client";
import { useEffect, useState } from "react";
import { REVIEWS } from "./data";
import { publicReviews } from "./reviews-remote";
import type { Review } from "./types";

/**
 * Every review the page should show: the ones that live in the repo, plus the
 * ones customers published themselves.
 *
 * The repo's list renders on the server, so the page is never empty while the
 * table is being read. What comes back from the table goes first — newest
 * first is what a reviews page is for — and a failed read leaves exactly what
 * was already on screen.
 */
export function useReviews(): { reviews: Review[]; loading: boolean } {
  const [remote, setRemote] = useState<Review[] | null>(null);

  useEffect(() => {
    let alive = true;
    publicReviews().then((r) => {
      if (alive) setRemote(r);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { reviews: remote ? [...remote, ...REVIEWS] : REVIEWS, loading: remote === null };
}
