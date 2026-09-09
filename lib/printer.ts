"use client";
import { useEffect, useState } from "react";
import { isConfigured, shopConfig } from "./orders-remote";

/**
 * What the printer is doing, read from the shop's own table.
 *
 * The printer itself is unreachable from here — it sits on a home network, and
 * this page runs in a stranger's browser. The agent beside the printer
 * (agent/printer-agent.mjs) writes its state, a camera still and every finished
 * job into Supabase; this only reads, with the public key, which is allowed to
 * read these rows and nothing else.
 *
 * Until the agent has ever run, every call here comes back empty and the page
 * says the printer is offline — which is exactly what it is.
 */
export type PrinterState = "printing" | "paused" | "idle" | "finished" | "failed" | "offline";

export type PrinterLive = {
  state: PrinterState;
  model: string | null;
  job_name: string | null;
  progress: number | null;
  layer: number | null;
  layers_total: number | null;
  minutes_left: number | null;
  nozzle_temp: number | null;
  nozzle_target: number | null;
  bed_temp: number | null;
  bed_target: number | null;
  speed_level: number | null;
  fan: number | null;
  filament: string | null;
  updated_at: string | null;
};

export type PrinterJob = {
  key: string;
  name: string;
  finished_at: string;
  ok: boolean;
  minutes: number | null;
  layers: number | null;
};

export type Timelapse = { file: string; url: string; size_mb: number | null; recorded_at: string };

const rest = async <T,>(pathAndQuery: string): Promise<T[]> => {
  const c = await shopConfig();
  if (!isConfigured(c)) return [];
  // The new publishable keys are not JWTs, so they go in `apikey` only.
  const legacy = c.supabaseAnonKey.startsWith("ey");
  const res = await fetch(`${c.supabaseUrl}/rest/v1/${pathAndQuery}`, {
    headers: {
      apikey: c.supabaseAnonKey,
      ...(legacy ? { Authorization: `Bearer ${c.supabaseAnonKey}` } : {}),
    },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as T[];
};

/** A status older than a minute is not "live" — the agent stopped, or the machine did. */
const fresh = (row: PrinterLive | null): PrinterLive | null => {
  if (!row) return null;
  const t = row.updated_at ? new Date(row.updated_at).getTime() : 0;
  if (!t || Date.now() - t > 60_000) return { ...row, state: "offline" };
  return row;
};

/**
 * The machine's state, kept current on its own.
 *
 * The agent writes a new row every couple of seconds, so this reads at the same
 * pace: the numbers on screen move while you watch them, without a refresh. The
 * chamber still is heavier than a row of numbers, so it has its own, slower
 * beat. Both pause while the tab is in the background — a page nobody is
 * looking at has no reason to keep asking.
 */
export function usePrinterLive(everyMs = 2_000, cameraEveryMs = 6_000) {
  const [live, setLive] = useState<PrinterLive | null>(null);
  const [camera, setCamera] = useState<string | null>(null);
  const [stream, setStream] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    let statusId: ReturnType<typeof setInterval> | null = null;
    let cameraId: ReturnType<typeof setInterval> | null = null;

    const pullStatus = async () => {
      const rows = await rest<PrinterLive>("printer_status?id=eq.live&select=*");
      if (!alive) return;
      setLive(fresh(rows[0] ?? null));
      setReady(true);
    };

    const pullCamera = async () => {
      const c = await shopConfig();
      if (!alive || !isConfigured(c)) return;
      // The still is overwritten in place, so the URL needs a new tail each time.
      setCamera(`${c.supabaseUrl}/storage/v1/object/public/printer/live.jpg?t=${Date.now()}`);
      // The video only exists while a print is running, and the agent says so
      // in a small file beside it — cheaper and simpler than a database column,
      // and it costs nothing to read from where the video already lives.
      if (!c.liveUrl) return;
      const res = await fetch(`${c.liveUrl}/live/status.json?t=${Date.now()}`, { cache: "no-store" })
        .catch(() => null);
      if (!alive) return;
      const on = res?.ok ? (await res.json().catch(() => null))?.live === true : false;
      setStream(on ? `${c.liveUrl}/live/stream.m3u8` : null);
    };

    const stop = () => {
      if (statusId) clearInterval(statusId);
      if (cameraId) clearInterval(cameraId);
      statusId = cameraId = null;
    };

    const start = () => {
      stop();
      void pullStatus();
      void pullCamera();
      statusId = setInterval(() => void pullStatus(), everyMs);
      cameraId = setInterval(() => void pullCamera(), cameraEveryMs);
    };

    const onVisibility = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [everyMs, cameraEveryMs]);

  return { live, camera, stream, ready, online: !!live && live.state !== "offline" };
}

export function usePrinterJobs(limit = 60) {
  const [jobs, setJobs] = useState<PrinterJob[]>([]);
  useEffect(() => {
    let alive = true;
    void rest<PrinterJob>(`printer_jobs?select=*&order=finished_at.desc&limit=${limit}`)
      .then((r) => { if (alive) setJobs(r); });
    return () => { alive = false; };
  }, [limit]);
  return jobs;
}

export function useTimelapses(limit = 12) {
  const [clips, setClips] = useState<Timelapse[]>([]);
  useEffect(() => {
    let alive = true;
    void rest<Timelapse>(`printer_timelapses?select=*&order=recorded_at.desc&limit=${limit}`)
      .then((r) => { if (alive) setClips(r); });
    return () => { alive = false; };
  }, [limit]);
  return clips;
}

/** The numbers the shop is happy to show: how much it printed, and how it went. */
export function jobStats(jobs: PrinterJob[]) {
  const done = jobs.filter((j) => j.ok);
  const minutes = done.reduce((s, j) => s + (j.minutes ?? 0), 0);
  const month = Date.now() - 30 * 864e5;
  return {
    total: jobs.length,
    ok: done.length,
    failed: jobs.length - done.length,
    hours: Math.round(minutes / 60),
    lastMonth: jobs.filter((j) => new Date(j.finished_at).getTime() > month).length,
    successRate: jobs.length ? Math.round((done.length / jobs.length) * 100) : null,
  };
}

export const fmtLeft = (minutes: number | null): string => {
  if (minutes == null || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
};
