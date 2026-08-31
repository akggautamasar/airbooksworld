"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Download,
  Ban,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
} from "lucide-react";
import {
  startChannelImport,
  fetchImportProgress,
  cancelChannelImport,
  fetchEnrichStatus,
  startEnrichPass,
  type ImportProgress,
} from "@/lib/api";

const POLL_MS = 2500;

const STATUS_LABEL: Record<string, string> = {
  validating: "Checking the channel…",
  scanning: "Scanning messages…",
  fetching: "Reading message list…",
  deduplicating: "Filtering out books you already have…",
  importing: "Forwarding books into your library…",
  enriching: "Reading metadata and building covers…",
  done: "Finished",
  cancelled: "Cancelled",
  error: "Failed",
};

function isRunning(status?: string) {
  return !!status && !["done", "cancelled", "error"].includes(status);
}

/**
 * Progress bar for whichever phase is actually running. The scan phase and the
 * import phase have different denominators, so picking the wrong one made the
 * bar jump backwards; each phase reports its own pair here instead.
 */
function phaseFraction(p: ImportProgress): number | null {
  if (p.status === "scanning" || p.status === "fetching") {
    return p.total_scan > 0 ? p.fetched / p.total_scan : null;
  }
  if (p.status === "importing" || p.status === "deduplicating") {
    return p.total_media > 0 ? p.imported / p.total_media : null;
  }
  if (p.status === "enriching") {
    return p.enrich_total > 0 ? (p.enrich_done ?? 0) / p.enrich_total : null;
  }
  if (p.status === "done") return 1;
  return null;
}

export default function BulkImportPanel({
  password,
  onImported,
  onSessionExpired,
}: {
  password: string;
  onImported: () => void;
  onSessionExpired: () => void;
}) {
  const [open, setOpen] = useState(false);

  const [channel, setChannel] = useState("");
  const [rangeMode, setRangeMode] = useState<"all" | "range">("all");
  const [startId, setStartId] = useState("");
  const [endId, setEndId] = useState("");
  const [enrich, setEnrich] = useState(true);
  const [generateCovers, setGenerateCovers] = useState(true);

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [importId, setImportId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [unenriched, setUnenriched] = useState<number | null>(null);
  const [enriching, setEnriching] = useState(false);

  // A ref so the poller can stop itself without being re-created on every
  // progress update (which would reset the interval and hammer the server).
  const importIdRef = useRef<string | null>(null);
  importIdRef.current = importId;
  const finishedRef = useRef(false);

  // Callbacks come from the page as inline arrows, so their identity changes
  // every render. Reading them through refs keeps them out of the polling
  // effect's dependency list — otherwise the interval was torn down and
  // rebuilt on every single render.
  const onImportedRef = useRef(onImported);
  onImportedRef.current = onImported;
  const onSessionExpiredRef = useRef(onSessionExpired);
  onSessionExpiredRef.current = onSessionExpired;

  const handleAuthError = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof Error && err.message === "Invalid admin password") {
        onSessionExpired();
        return;
      }
      setError(err instanceof Error ? err.message : fallback);
    },
    [onSessionExpired]
  );

  const refreshEnrichStatus = useCallback(async () => {
    try {
      const res = await fetchEnrichStatus(password);
      setUnenriched(res.unenriched);
    } catch {
      // Non-critical: the panel still works without this number.
    }
  }, [password]);

  useEffect(() => {
    if (open) refreshEnrichStatus();
  }, [open, refreshEnrichStatus]);

  // Poll while an import is running.
  useEffect(() => {
    if (!importId) return;
    let cancelled = false;
    finishedRef.current = false;

    async function tick() {
      if (cancelled || !importIdRef.current) return;
      try {
        const p = await fetchImportProgress(password, importIdRef.current);
        if (cancelled) return;
        setProgress(p);
        if (!isRunning(p.status) && !finishedRef.current) {
          finishedRef.current = true;
          // Refresh the book list and the pending-enrichment count once, not
          // on every poll — the list fetch pages through the whole library.
          onImportedRef.current();
          refreshEnrichStatus();
        }
      } catch (err) {
        if (err instanceof Error && err.message === "Invalid admin password") {
          onSessionExpiredRef.current();
          cancelled = true;
        }
        // A 404 means the server restarted and lost the in-memory progress.
        // Stop polling rather than looping on an error forever.
        if (err instanceof Error && err.message.includes("404")) {
          cancelled = true;
        }
      }
    }

    tick();
    const id = setInterval(() => {
      if (finishedRef.current) return;
      tick();
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [importId, password, refreshEnrichStatus]);

  async function handleStart() {
    setError("");
    const trimmed = channel.trim();
    if (!trimmed) {
      setError("Enter the source channel.");
      return;
    }
    let start: number | null = null;
    let end: number | null = null;
    if (rangeMode === "range") {
      const a = Number(startId);
      const b = Number(endId);
      if (!startId || !endId || !Number.isFinite(a) || !Number.isFinite(b)) {
        setError("Give both a start and an end message id, or import everything.");
        return;
      }
      // Accept the ids in either order rather than rejecting a backwards range.
      start = Math.min(a, b);
      end = Math.max(a, b);
    }

    setStarting(true);
    setProgress(null);
    try {
      const res = await startChannelImport(password, {
        channel: trimmed,
        start_msg_id: start,
        end_msg_id: end,
        skip_duplicates: true,
        enrich,
        generate_covers: enrich && generateCovers,
      });
      setImportId(res.import_id);
    } catch (err) {
      handleAuthError(err, "Couldn't start the import.");
    } finally {
      setStarting(false);
    }
  }

  async function handleCancel() {
    if (!importId) return;
    setCancelling(true);
    try {
      await cancelChannelImport(password, importId);
    } catch (err) {
      handleAuthError(err, "Couldn't cancel the import.");
    } finally {
      setCancelling(false);
    }
  }

  async function handleEnrichAll() {
    setError("");
    setEnriching(true);
    try {
      const res = await startEnrichPass(password, true);
      if (res.import_id) {
        setProgress(null);
        setImportId(res.import_id);
      } else {
        setUnenriched(0);
      }
    } catch (err) {
      handleAuthError(err, "Couldn't start the metadata pass.");
    } finally {
      setEnriching(false);
    }
  }

  const running = isRunning(progress?.status) || (!!importId && !progress);
  const fraction = progress ? phaseFraction(progress) : null;

  return (
    <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-900/60 transition-colors"
      >
        <span className="flex items-center gap-2 text-slate-100 font-medium">
          <Download className="w-4 h-4 text-brand-400" />
          Bulk import from a channel
          {running && (
            <span className="flex items-center gap-1.5 text-xs font-normal text-amber-400">
              <Loader2 className="w-3 h-3 animate-spin" /> running
            </span>
          )}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-800 pt-4">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400" htmlFor="import-channel">
              Source channel
            </label>
            <input
              id="import-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="@bookschannel or -1001234567890"
              disabled={running}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 disabled:opacity-50"
            />
            <p className="text-xs text-slate-600">
              The bot has to be a member of this channel. Books are forwarded into
              your books channel — the source is left untouched.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="radio"
                  name="range-mode"
                  checked={rangeMode === "all"}
                  onChange={() => setRangeMode("all")}
                  disabled={running}
                  className="accent-brand-500"
                />
                Everything in the channel
              </label>
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="radio"
                  name="range-mode"
                  checked={rangeMode === "range"}
                  onChange={() => setRangeMode("range")}
                  disabled={running}
                  className="accent-brand-500"
                />
                Message id range
              </label>
            </div>
            {rangeMode === "range" && (
              <div className="flex items-center gap-2">
                <input
                  value={startId}
                  onChange={(e) => setStartId(e.target.value.replace(/\D/g, ""))}
                  placeholder="from"
                  inputMode="numeric"
                  disabled={running}
                  className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 disabled:opacity-50"
                />
                <span className="text-slate-600">→</span>
                <input
                  value={endId}
                  onChange={(e) => setEndId(e.target.value.replace(/\D/g, ""))}
                  placeholder="to"
                  inputMode="numeric"
                  disabled={running}
                  className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-brand-500 disabled:opacity-50"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={enrich}
                onChange={(e) => setEnrich(e.target.checked)}
                disabled={running}
                className="mt-0.5 accent-brand-500"
              />
              <span>
                Read titles and authors out of the files
                <span className="block text-xs text-slate-600">
                  Downloads each book once, one at a time. Much slower, but the
                  library ends up properly filled in. Untick for a fast import
                  that uses filenames only — you can fill the rest in later.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={generateCovers}
                onChange={(e) => setGenerateCovers(e.target.checked)}
                disabled={running || !enrich}
                className="mt-0.5 accent-brand-500"
              />
              <span className={enrich ? "" : "opacity-50"}>
                Generate cover images too
              </span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleStart}
              disabled={running || starting || !channel.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {starting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Start import
            </button>
            {running && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-rose-900/60 text-rose-400 hover:bg-rose-500/10 text-sm transition-colors disabled:opacity-50"
              >
                {cancelling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Ban className="w-4 h-4" />
                )}
                Stop
              </button>
            )}
            {unenriched !== null && unenriched > 0 && !running && (
              <button
                onClick={handleEnrichAll}
                disabled={enriching}
                title="Read metadata and build covers for books that don't have them yet"
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 hover:border-brand-500 hover:text-brand-300 text-slate-300 text-sm transition-colors disabled:opacity-50"
              >
                {enriching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Fill in {unenriched} book{unenriched === 1 ? "" : "s"}
              </button>
            )}
          </div>

          {error && (
            <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {progress && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span
                  className={
                    progress.status === "error"
                      ? "text-rose-400"
                      : progress.status === "done"
                        ? "text-emerald-400"
                        : progress.status === "cancelled"
                          ? "text-slate-400"
                          : "text-amber-400"
                  }
                >
                  {STATUS_LABEL[progress.status] || progress.status}
                </span>
                {typeof progress.elapsed === "number" && (
                  <span className="text-xs text-slate-600">
                    {progress.elapsed}s
                  </span>
                )}
              </div>

              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progress.status === "error"
                      ? "bg-rose-500"
                      : progress.status === "done"
                        ? "bg-emerald-500"
                        : "bg-brand-500"
                  } ${fraction === null ? "animate-pulse" : ""}`}
                  style={{
                    width:
                      fraction === null
                        ? "100%"
                        : `${Math.min(100, Math.round(fraction * 100))}%`,
                  }}
                />
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                <Stat label="Imported" value={progress.imported} highlight />
                {progress.total_media > 0 && (
                  <Stat label="Books found" value={progress.total_media} />
                )}
                {progress.skipped_duplicate > 0 && (
                  <Stat label="Already had" value={progress.skipped_duplicate} />
                )}
                {progress.skipped_not_book > 0 && (
                  <Stat label="Not books" value={progress.skipped_not_book} />
                )}
                {!!progress.skipped_unreadable && (
                  <Stat label="Unreadable" value={progress.skipped_unreadable} />
                )}
                {progress.enrich_total > 0 && (
                  <Stat
                    label="Metadata read"
                    value={`${progress.enrich_done ?? 0}/${progress.enrich_total}`}
                  />
                )}
                {progress.covers > 0 && (
                  <Stat label="Covers made" value={progress.covers} />
                )}
                {!!progress.skipped_memory && (
                  <Stat label="Deferred" value={progress.skipped_memory} />
                )}
                {progress.errors > 0 && (
                  <Stat label="Errors" value={progress.errors} />
                )}
              </dl>

              {progress.error_msg && (
                <p className="text-xs text-rose-400">{progress.error_msg}</p>
              )}

              {progress.status === "enriching" && (
                <p className="text-xs text-slate-600 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Books are downloaded one at a time on purpose, to stay inside
                  the server&apos;s memory limit. This part is slow — you can
                  leave this page and come back.
                </p>
              )}
              {!!progress.skipped_memory && (
                <p className="text-xs text-slate-600">
                  {progress.skipped_memory} book
                  {progress.skipped_memory === 1 ? "" : "s"} were skipped because
                  memory was tight. Use &ldquo;Fill in&rdquo; above to retry them.
                </p>
              )}
              {progress.status === "cancelled" && (
                <p className="text-xs text-slate-600">
                  Books imported before you stopped are still in the library.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-slate-600">{label}</dt>
      <dd className={highlight ? "text-slate-100 font-medium" : "text-slate-400"}>
        {value}
      </dd>
    </div>
  );
}
