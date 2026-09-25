"use client";
import { useState } from "react";
import Link from "next/link";
import Btn from "@/components/ui/Btn";
import Icon from "@/components/ui/Icon";
import { useTimelapses } from "@/lib/printer";

const PAGE = 24;

const when = (iso: string) =>
  new Date(iso).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" });

/**
 * Every timelapse, newest first.
 *
 * The live page shows the last six and nothing more: someone who opened it to
 * see what the printer is doing now should not scroll past a hundred videos to
 * reach the machine. The whole archive lives here instead.
 *
 * Loaded a page at a time rather than all at once. Each `<video>` fetches its
 * own metadata to draw a poster frame, so a hundred of them on one screen is a
 * hundred requests before anything is watched.
 */
export default function TimelapsesClient() {
  const [limit, setLimit] = useState(PAGE);
  const clips = useTimelapses(limit);
  // The server gave back a full page, so there is probably another one. The
  // alternative is asking for an exact count on every load to save one click.
  const more = clips.length === limit;

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
      <Link
        href="/livestream"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-200 mb-6"
      >
        <Icon name="chevRight" size={14} />
        חזרה למדפסת בלייב
      </Link>

      <div className="font-mono text-[11px] tracking-widest uppercase text-ink-500 mb-2">TIMELAPSE</div>
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">כל ההדפסות שצולמו.</h1>
      <p className="text-sm text-ink-400 mb-8">
        כל סרטון הוא הדפסה אחת, מהשכבה הראשונה עד האחרונה. מהחדשה לישנה.
      </p>

      {clips.length === 0 ? (
        <p className="text-sm text-ink-500">עוד אין סרטונים.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clips.map((c) => (
              <figure key={c.file} className="rounded-2xl overflow-hidden bg-ink-900 border border-ink-800">
                <video src={c.url} controls preload="metadata" playsInline className="w-full aspect-video bg-ink-950" />
                <figcaption className="p-3 text-[11px] text-ink-400 flex items-center justify-between gap-2">
                  <span className="truncate" dir="ltr">{c.file}</span>
                  <span className="shrink-0">{when(c.recorded_at)}</span>
                </figcaption>
              </figure>
            ))}
          </div>

          {more && (
            <div className="mt-8 flex justify-center">
              <Btn variant="ghost" onClick={() => setLimit((n) => n + PAGE)}>
                הצג עוד
              </Btn>
            </div>
          )}
        </>
      )}
    </main>
  );
}
