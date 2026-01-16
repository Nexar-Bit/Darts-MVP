import React, { useEffect, useMemo, useRef, useState } from "react";
import "./app.css";

// Put your logo here: src/assets/logo.png
import logo from "./assets/logo.png";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
const DEV_USER_ID = "dev_user";

// Upload limits (UPDATED)
const MAX_UPLOAD_BYTES = 400 * 1024 * 1024; // 400MB
const MAX_VIDEO_SECONDS = 70; // 1:10

type JobListItem = {
  job_id: string;
  user_id: string;
  created_at_unix: number;
  original_filename?: string | null;
  status: "queued" | "running" | "done" | "failed";
  progress?: number | null;
  stage?: string | null;
  error_message?: string | null;
  overlay_url?: string | null;
  analysis_url?: string | null;
  practice_plan_url?: string | null;
  practice_plan_txt_url?: string | null;
  lesson_plan_url?: string | null;
  throws_detected?: number | null;
};

type JobsListResponse = {
  user_id: string;
  count: number;
  jobs: JobListItem[];
};

type JobStatusResponse = {
  job_id: string;
  status: "queued" | "running" | "done" | "failed" | "not_found";
  progress?: number;
  stage?: string;
  error?: any;
  result?: any;
};

function fmtDate(unixSeconds: number) {
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString();
}

function absUrl(maybeRelative: string) {
  if (!maybeRelative) return "";
  return maybeRelative.startsWith("http") ? maybeRelative : `${API_BASE}${maybeRelative}`;
}

function getViewFromUrl(): { view: "list" | "detail"; jobId?: string } {
  const u = new URL(window.location.href);
  const job = u.searchParams.get("job");
  if (job) return { view: "detail", jobId: job };
  return { view: "list" };
}

function setJobInUrl(jobId: string | null) {
  const u = new URL(window.location.href);
  if (jobId) u.searchParams.set("job", jobId);
  else u.searchParams.delete("job");
  window.history.pushState({}, "", u.toString());
}

function humanFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function initialsFromId(userId: string) {
  const safe = (userId || "").trim();
  if (!safe) return "DU";
  const parts = safe
    .replace(/[_\-]+/g, " ")
    .split(" ")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 1) {
    const s = parts[0].replace(/[^a-zA-Z0-9]/g, "");
    return (s.slice(0, 2) || "DU").toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

async function getVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.src = url;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      v.removeAttribute("src");
      v.load();
    };

    v.onloadedmetadata = () => {
      const dur = Number(v.duration);
      cleanup();
      if (!Number.isFinite(dur) || dur <= 0) reject(new Error("Could not read video duration"));
      else resolve(dur);
    };

    v.onerror = () => {
      cleanup();
      reject(new Error("Could not read video metadata"));
    };
  });
}

async function validateUploadFile(file: File): Promise<{ ok: true } | { ok: false; message: string }> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `File too large. Max is ${humanFileSize(MAX_UPLOAD_BYTES)}. (Yours is ${humanFileSize(file.size)})`,
    };
  }

  try {
    const dur = await getVideoDurationSeconds(file);
    if (dur > MAX_VIDEO_SECONDS + 0.05) {
      return { ok: false, message: `Video too long (${dur.toFixed(1)}s). Max is ${MAX_VIDEO_SECONDS} seconds.` };
    }
  } catch (e: any) {
    return { ok: false, message: e?.message || "Could not read video duration." };
  }

  return { ok: true };
}

function StatusBadge({ status }: { status: JobStatusResponse["status"] | JobListItem["status"] }) {
  const cls =
    status === "running"
      ? "badge badgeRunning"
      : status === "done"
        ? "badge badgeDone"
        : status === "failed"
          ? "badge badgeFailed"
          : status === "not_found"
            ? "badge badgeFailed"
            : "badge badgeQueued";

  return <span className={cls}>{status}</span>;
}

/* -----------------------------
   Profile dropdown (dev mode)
------------------------------ */
function ProfileMenu({
  userId,
  onOpenHealth,
}: {
  userId: string;
  onOpenHealth: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as any)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const initials = useMemo(() => initialsFromId(userId), [userId]);

  return (
    <div className="profileWrap" ref={ref}>
      <button
        type="button"
        className="profileButton profileButtonCompact"
        onClick={() => setOpen((v) => !v)}
        aria-label="Profile"
        title="Profile"
      >
        <span className="avatarInitials" aria-hidden="true">
          {initials}
        </span>
        <span className="chev" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div className="menu" role="menu" aria-label="Profile menu">
          <div className="menuHeader">
            <div className="menuTitle">Pro Darts Coach</div>
            <div className="menuMuted">
              Developer mode · <code>{userId}</code>
            </div>
          </div>

          <button type="button" className="menuItem" onClick={onOpenHealth}>
            Open API health
          </button>

          <div className="menuDivider" />

          <button
            type="button"
            className="menuItem"
            onClick={() => {
              setOpen(false);
              alert("This is dev mode. Auth will replace this later.");
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* -----------------------------
   Empty state (CSS illustration)
------------------------------ */
function EmptyState({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="emptyState">
      <div className="emptyArt" aria-hidden="true">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
      </div>
      <div className="emptyTitle">{title}</div>
      <div className="emptySub">{subtitle}</div>
      {action ? <div style={{ marginTop: 12 }}>{action}</div> : null}
    </div>
  );
}

/* -----------------------------
   Scorecard renderer
------------------------------ */
function ScorecardView({ scorecard }: { scorecard: any }) {
  if (!scorecard || !Array.isArray(scorecard.categories) || scorecard.categories.length === 0) {
    return null;
  }

  return (
    <div className="section">
      <h3>Scorecard</h3>

      <div className="kpi-row">
        <div className="kpi">
          <div className="label">Overall score</div>
          <div className="value">
            {typeof scorecard.overall_score_1_to_10 === "number" ? `${scorecard.overall_score_1_to_10}/10` : "-"}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {scorecard.categories.map((c: any, i: number) => (
          <div key={i} className="subcard">
            <div className="rowWrap" style={{ justifyContent: "space-between" }}>
              <div style={{ fontWeight: 850 }}>{c?.name || "Category"}</div>
              <div style={{ opacity: 0.9 }}>
                {typeof c?.score_1_to_10 === "number" ? `${c.score_1_to_10}/10` : "-"}
              </div>
            </div>

            {c?.what_it_means ? (
              <div className="bodyText" style={{ marginTop: 8 }}>
                {c.what_it_means}
              </div>
            ) : null}

            {c?.quick_win ? (
              <div className="bodyText" style={{ marginTop: 8 }}>
                <b>Quick win:</b> {c.quick_win}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -----------------------------
   Drill blocks renderer
------------------------------ */
function LessonDrillsView({ lesson }: { lesson: any }) {
  const blocks = lesson?.lesson_plan?.blocks;
  if (!lesson || !lesson.lesson_plan || !Array.isArray(blocks) || blocks.length === 0) return null;

  return (
    <div className="section">
      <h3>Drill-based session</h3>

      {lesson?.lesson_plan?.structure_note ? (
        <div className="bodyText">{lesson.lesson_plan.structure_note}</div>
      ) : null}

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {blocks.map((b: any, bi: number) => (
          <div key={bi} className="subcard">
            <div className="rowWrap" style={{ justifyContent: "space-between" }}>
              <div style={{ fontWeight: 850 }}>{b?.block_name || "Block"}</div>
              <div style={{ opacity: 0.85 }}>{typeof b?.minutes === "number" ? `${b.minutes} min` : ""}</div>
            </div>

            {b?.goal ? (
              <div className="bodyText" style={{ marginTop: 6 }}>
                <b>Goal:</b> {b.goal}
              </div>
            ) : null}

            {Array.isArray(b?.drills) ? (
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {b.drills.map((d: any, di: number) => (
                  <div key={di} className="subcard drillCard">
                    <div className="rowWrap" style={{ justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 850 }}>{d?.drill_name || "Drill"}</div>
                      <div style={{ opacity: 0.85 }}>{typeof d?.minutes === "number" ? `${d.minutes} min` : ""}</div>
                    </div>

                    {d?.purpose ? <div className="bodyText" style={{ marginTop: 6 }}>{d.purpose}</div> : null}

                    {Array.isArray(d?.steps) ? (
                      <ul className="bullets" style={{ marginTop: 8 }}>
                        {d.steps.map((s: string, i: number) => <li key={i}>{s}</li>)}
                      </ul>
                    ) : null}

                    {d?.success_criteria ? (
                      <div className="bodyText" style={{ marginTop: 8 }}>
                        <b>Success check:</b> {d.success_criteria}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -----------------------------
   PracticePlanView
------------------------------ */
function PracticePlanView({ plan, lesson }: { plan: any; lesson: any }) {
  if (!plan && !lesson) return null;

  const drills = plan?.practice_plan || [];
  const focusLegacy = plan?.next_upload_focus || [];

  const overview = lesson?.session_overview?.coach_summary || plan?.overview_of_throw || "";
  const primaryFocus = lesson?.session_overview?.one_thing_focus || plan?.primary_focus || "-";
  const sessionMinutes = lesson?.lesson_plan?.total_minutes ?? plan?.session_length_minutes ?? "-";
  const confidence = lesson?.session_overview?.confidence_note || plan?.confidence_note || "";

  const nextUploadList = lesson?.next_upload_checklist?.recording_setup || focusLegacy || [];

  return (
    <div>
      <div className="kpi-row">
        <div className="kpi">
          <div className="label">Session length</div>
          <div className="value">{sessionMinutes} {typeof sessionMinutes === "number" ? "min" : ""}</div>
        </div>
        <div className="kpi">
          <div className="label">Primary focus</div>
          <div className="value">{primaryFocus}</div>
        </div>
      </div>

      <div className="section">
        <h3>Overview</h3>
        <div className="bodyText">{overview}</div>
      </div>

      <ScorecardView scorecard={lesson?.scorecard} />
      <LessonDrillsView lesson={lesson} />

      {!lesson?.lesson_plan?.blocks?.length ? (
        <div className="section">
          <h3>Practice plan (drills)</h3>
          {drills.map((d: any, idx: number) => (
            <div key={idx} className="subcard">
              <div className="rowWrap" style={{ justifyContent: "space-between" }}>
                <div style={{ fontWeight: 850 }}>{d.drill}</div>
                <div style={{ opacity: 0.85 }}>{d.duration_minutes} min</div>
              </div>
              <ul className="bullets" style={{ marginTop: 8 }}>
                {(d.steps || []).map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
              {d.success_check ? (
                <div className="bodyText" style={{ marginTop: 8 }}>
                  <b>Success check:</b> {d.success_check}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="section">
        <h3>Next upload</h3>
        <ul className="bullets">{(nextUploadList || []).map((f: string, i: number) => <li key={i}>{f}</li>)}</ul>
        {lesson?.next_upload_checklist?.how_many_throws ? (
          <div className="bodyText" style={{ marginTop: 8 }}>
            <b>How many throws:</b> {lesson.next_upload_checklist.how_many_throws}
          </div>
        ) : null}
      </div>

      {confidence ? (
        <div className="section">
          <h3>Confidence note</h3>
          <div className="bodyText">{confidence}</div>
        </div>
      ) : null}
    </div>
  );
}

function RecentResults({
  jobs,
  onOpen,
}: {
  jobs: JobListItem[];
  onOpen: (jobId: string) => void;
}) {
  const recent = (jobs || []).slice(0, 5);

  return (
    <div className="card">
      <div className="rowWrap" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Recent results</h2>
        <div className="mutedSmall">Last {recent.length}</div>
      </div>

      {!recent.length ? (
        <EmptyState title="No results yet" subtitle="Upload a video to generate your first coaching report." />
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {recent.map((j) => (
            <button
              key={j.job_id}
              type="button"
              className="recentRow"
              onClick={() => onOpen(j.job_id)}
              title="Open this job"
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {j.original_filename || "(unknown)"}
                  </div>

                  <div className="mutedSmall">
                    Last analysed: {fmtDate(j.created_at_unix)}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <StatusBadge status={j.status} />
                  <span className="mutedSmall" style={{ minWidth: 48, textAlign: "right" }}>
                    {typeof j.throws_detected === "number" ? `${j.throws_detected} throws` : ""}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OverlayPanel({
  overlayUrl,
  overlaySideUrl,
  overlayFrontUrl,
}: {
  overlayUrl: string; // legacy fallback
  overlaySideUrl?: string; // new (optional)
  overlayFrontUrl?: string; // new (optional)
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const hasSide = !!overlaySideUrl;
  const hasFront = !!overlayFrontUrl;

  const [tab, setTab] = useState<"side" | "front">(() => {
    if (hasSide) return "side";
    if (hasFront) return "front";
    return "side";
  });

  useEffect(() => {
    if (tab === "side" && !hasSide && hasFront) setTab("front");
    if (tab === "front" && !hasFront && hasSide) setTab("side");
  }, [hasSide, hasFront, tab]);

  const src =
    tab === "front"
      ? (overlayFrontUrl || overlayUrl)
      : (overlaySideUrl || overlayUrl);

  function seek(seconds: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, (v.currentTime || 0) + seconds);
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }

  if (!src) {
    return (
      <section className="card sticky overlayCard">
        <div className="rowWrap" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0 }}>Overlay video</h2>
            <div className="mutedSmall">No overlay available for this job.</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="card sticky overlayCard">
      <div className="rowWrap" style={{ justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0 }}>Overlay video</h2>
          <div className="mutedSmall">Use the control buttons to review aim → release.</div>
        </div>
      </div>

      {(hasSide || hasFront) ? (
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {hasSide ? (
            <button
              type="button"
              className={tab === "side" ? "buttonPrimary" : "buttonSecondary"}
              onClick={() => setTab("side")}
            >
              Side view
            </button>
          ) : null}
          {hasFront ? (
            <button
              type="button"
              className={tab === "front" ? "buttonPrimary" : "buttonSecondary"}
              onClick={() => setTab("front")}
            >
              Front view
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="videoShell">
        <video ref={videoRef} src={src} controls />
      </div>

      <div className="videoControls">
        <button type="button" className="buttonSecondary" onClick={() => seek(-2)}>-2s</button>
        <button type="button" className="buttonSecondary" onClick={() => seek(-0.5)}>-0.5s</button>
        <button type="button" className="buttonPrimary" onClick={togglePlay}>Play / Pause</button>
        <button type="button" className="buttonSecondary" onClick={() => seek(0.5)}>+0.5s</button>
        <button type="button" className="buttonSecondary" onClick={() => seek(2)}>+2s</button>
      </div>

      <div className="mutedSmall" style={{ marginTop: 10 }}>
        Tip: +0.5s steps are ideal for checking mechanics frame-to-frame.
      </div>
    </section>
  );
}


/* -----------------------------
   Reusable file picker card (side/front)
------------------------------ */
function UploadCard({
  label,
  hint,
  file,
  setFile,
  busy,
  validate,
}: {
  label: string;
  hint: string;
  file: File | null;
  setFile: (f: File | null) => void;
  busy: boolean;
  validate: (f: File) => Promise<{ ok: true } | { ok: false; message: string }>;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  function pick() {
    inputRef.current?.click();
  }

  async function acceptFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];

    setErr("");

    const verdict = await validate(f);
    if (!verdict.ok) {
      setFile(null);
      setErr(verdict.message);
      return;
    }

    setFile(f);
  }

  return (
    <div className="subcard" style={{ padding: 14 }}>
      <div className="rowWrap" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900 }}>{label}</div>
          <div className="mutedSmall" style={{ marginTop: 4 }}>{hint}</div>
        </div>
        <div>
          {file ? <span className="badge badgeDone">Ready</span> : <span className="badge badgeQueued">Optional</span>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/*,.mov,.mp4"
        disabled={busy}
        style={{ display: "none" }}
        onChange={async (e) => {
          // IMPORTANT: reset value so selecting the same file again still triggers change
          const files = e.target.files;
          await acceptFiles(files);
          e.currentTarget.value = "";
        }}
      />

      <div
        className={`dropzone ${dragOver ? "dropzoneStrong" : ""}`}
        onClick={() => !busy && pick()}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); if (!busy) setDragOver(true); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (!busy) setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          if (busy) return;
          acceptFiles(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
        style={{ marginTop: 12 }}
      >
        <div className="dropzoneTitle">Drag and drop a video</div>
        <div className="dropzoneMeta">
          or click to select (.mov or .mp4) — max {MAX_VIDEO_SECONDS}s, {humanFileSize(MAX_UPLOAD_BYTES)}
        </div>

        {file ? (
          <div className="fileChip">
            <div style={{ minWidth: 0 }}>
              <div className="fileName">{file.name}</div>
              <div className="mutedSmall">{humanFileSize(file.size)}</div>
            </div>
            <button
              type="button"
              className="buttonSecondary"
              onClick={(ev) => { ev.stopPropagation(); setFile(null); setErr(""); }}
              disabled={busy}
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="dropActions">
            <button
              type="button"
              className="buttonSecondary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                pick();
              }}
              disabled={busy}
            >
              Choose video
            </button>

            <div className="mutedSmall">Tip: include a second before you start aiming</div>
          </div>
        )}
      </div>

      {err ? <div className="error" style={{ marginTop: 10 }}>{err}</div> : null}
    </div>
  );
}

export default function App() {
  const initial = getViewFromUrl();

  const [view, setView] = useState<"list" | "detail">(initial.view);
  const [selectedJobId, setSelectedJobId] = useState<string>(initial.jobId || "");

  // NEW: separate uploads
  const [sideFile, setSideFile] = useState<File | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);

  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");

  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listErr, setListErr] = useState("");

  const [detail, setDetail] = useState<JobStatusResponse | null>(null);
  const [detailErr, setDetailErr] = useState("");
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    const onPop = () => {
      const s = getViewFromUrl();
      setView(s.view);
      setSelectedJobId(s.jobId || "");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  async function loadJobs() {
    setListErr("");
    setListLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/${DEV_USER_ID}/jobs?limit=100`);
      if (!res.ok) throw new Error(`List error ${res.status}`);
      const json = (await res.json()) as JobsListResponse;
      setJobs(json.jobs || []);
    } catch (e: any) {
      setListErr(e?.message || "Failed to load jobs");
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    if (view === "list") loadJobs();
  }, [view]);

  async function loadJobStatus(jobId: string) {
    const res = await fetch(`${API_BASE}/jobs/${jobId}`);
    if (!res.ok) throw new Error(`Status error ${res.status}`);
    const json = (await res.json()) as JobStatusResponse;
    setDetail(json);
    return json;
  }

  useEffect(() => {
    let timer: any = null;
    let cancelled = false;

    async function loop() {
      if (view !== "detail" || !selectedJobId) return;
      setDetailErr("");

      try {
        const j = await loadJobStatus(selectedJobId);
        if (cancelled) return;

        const done = j.status === "done" || j.status === "failed" || j.status === "not_found";
        if (done) {
          setPolling(false);
          loadJobs();
          return;
        }

        setPolling(true);
        timer = setTimeout(loop, 1000);
      } catch (e: any) {
        if (!cancelled) setDetailErr(e?.message || "Failed to load status");
        setPolling(false);
        timer = setTimeout(loop, 1500);
      }
    }

    loop();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [view, selectedJobId]);

  const overlayUrl = useMemo(() => absUrl(detail?.result?.overlay_url || ""), [detail]);
  const overlaySideUrl = useMemo(() => absUrl(detail?.result?.overlay_side_url || ""), [detail]);
  const overlayFrontUrl = useMemo(() => absUrl(detail?.result?.overlay_front_url || ""), [detail]);

  const pdfUrl = useMemo(() => absUrl(detail?.result?.practice_plan_pdf_url || ""), [detail]);

  // NOTE: with your updated backend, lesson_plan is returned as a URL, not embedded.
  // Your existing UI expects lesson_plan object. If you want it embedded, we can add that to backend.
  // For now, keep compatibility: use embedded if present, otherwise null.
  const lessonPlan = useMemo(() => detail?.result?.lesson_plan || null, [detail]);

  const progressPct = useMemo(() => {
    if (!detail) return 0;
    if (typeof detail.progress === "number") return Math.max(0, Math.min(100, Math.round(detail.progress * 100)));
    return detail.status === "queued" ? 5 : 10;
  }, [detail]);

  const isWorking = !!detail && (detail.status === "queued" || detail.status === "running");

  function openDetail(jobId: string) {
    setSelectedJobId(jobId);
    setView("detail");
    setJobInUrl(jobId);
    setDetail(null);
    setDetailErr("");
  }

  function backToList() {
    setView("list");
    setSelectedJobId("");
    setDetail(null);
    setDetailErr("");
    setJobInUrl(null);
  }

  function startNewAnalysis() {
    backToList();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function startUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploadErr("");
    setUploadMsg("");

    if (!sideFile && !frontFile) {
      setUploadErr("Upload at least one video: side-on and/or front-on.");
      return;
    }

    // Validate again (defence-in-depth)
    setUploadBusy(true);
    try {
      if (sideFile) {
        const v = await validateUploadFile(sideFile);
        if (!v.ok) throw new Error(`Side-on: ${v.message}`);
      }
      if (frontFile) {
        const v = await validateUploadFile(frontFile);
        if (!v.ok) throw new Error(`Front-on: ${v.message}`);
      }

      const fd = new FormData();
      if (sideFile) fd.append("side_video", sideFile);
      if (frontFile) fd.append("front_video", frontFile);
      fd.append("user_id", DEV_USER_ID);

      const model = "gpt-5-mini";
      const res = await fetch(`${API_BASE}/analyze?model=${encodeURIComponent(model)}`, {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(`API error ${res.status}: ${t}`);
      }

      const json = await res.json();
      const jobId = json.job_id as string;

      setUploadMsg("Upload complete. Starting analysis…");
      setSideFile(null);
      setFrontFile(null);

      await loadJobs();
      openDetail(jobId);
    } catch (e: any) {
      setUploadErr(e?.message || "Upload failed.");
    } finally {
      setUploadBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="shellWrap">
        <div className="appShell">
          <header className="hero heroLogo">
            <div className="heroTop heroTopLogo">
              <div className="brandHeroInline">
                <img className="brandLogoSmall" src={logo} alt="Pro Darts Coach" />
                <div className="heroSub">
                  Upload side-on and/or front-on. Get a drill-based coaching plan and an overlay video to review mechanics.
                </div>
              </div>

              <ProfileMenu
                userId={DEV_USER_ID}
                onOpenHealth={() => window.open(`${API_BASE}/health`, "_blank")}
              />
            </div>

            <div className="heroDivider" aria-hidden="true" />
          </header>

          <main className="container">
            {view === "list" ? (
              <>
                <section className="card cardHero">
                  <div className="rowWrap" style={{ justifyContent: "space-between" }}>
                    <div>
                      <h2 style={{ margin: 0 }}>Upload your videos</h2>
                      <div className="mutedSmall" style={{ marginTop: 6 }}>
                        You can upload <b>side-on</b>, <b>front-on</b>, or <b>both</b>. If you upload both, we combine them into one scorecard and one plan.
                        <br />
                        Limits: max {MAX_VIDEO_SECONDS}s per video, max {humanFileSize(MAX_UPLOAD_BYTES)} per video.
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      {(sideFile || frontFile) ? (
                        <span className="badge badgeDone">Ready</span>
                      ) : (
                        <span className="badge badgeQueued">Choose file(s)</span>
                      )}
                    </div>
                  </div>

                  <form onSubmit={startUpload}>
                    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                      <UploadCard
                        label="Side-on video (recommended)"
                        hint="Best for elbow path, tempo, and release-line mechanics."
                        file={sideFile}
                        setFile={setSideFile}
                        busy={uploadBusy}
                        validate={validateUploadFile}
                      />

                      <UploadCard
                        label="Front-on video (optional)"
                        hint="Best for sway, alignment, and shoulder/hip drift."
                        file={frontFile}
                        setFile={setFrontFile}
                        busy={uploadBusy}
                        validate={validateUploadFile}
                      />
                    </div>

                    <div className="uploadActions" style={{ marginTop: 12 }}>
                      <button className="buttonPrimary" type="submit" disabled={uploadBusy || (!sideFile && !frontFile)}>
                        {uploadBusy ? "Uploading..." : "Analyse video(s)"}
                      </button>
                      {uploadMsg ? <div className="mutedSmall">{uploadMsg}</div> : null}
                    </div>
                  </form>

                  {uploadErr ? <div className="error" style={{ marginTop: 12 }}>{uploadErr}</div> : null}
                </section>

                <section className="card">
                  <div className="rowWrap" style={{ justifyContent: "space-between" }}>
                    <h2 style={{ margin: 0 }}>My analyses</h2>
                    <button type="button" className="buttonSecondary" onClick={loadJobs} disabled={listLoading}>
                      {listLoading ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>

                  {listErr ? <div className="error" style={{ marginTop: 12 }}>{listErr}</div> : null}

                  {jobs.length === 0 && !listLoading ? (
                    <EmptyState
                      title="No analyses yet"
                      subtitle="Upload a throw video to generate your first report."
                      action={
                        <button type="button" className="buttonPrimary" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                          Upload video
                        </button>
                      }
                    />
                  ) : null}

                  {listLoading && jobs.length === 0 ? (
                    <p className="mutedSmall" style={{ marginTop: 12 }}>Loading…</p>
                  ) : null}

                  {jobs.length > 0 ? (
                    <div className="jobsResponsive" style={{ marginTop: 12 }}>
                      <div className="jobsTableWrap">
                        <table>
                          <thead>
                            <tr style={{ textAlign: "left" }}>
                              <th>Date</th>
                              <th>File</th>
                              <th>Status</th>
                              <th>Throws</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {jobs.map((j) => (
                              <tr key={j.job_id}>
                                <td style={{ whiteSpace: "nowrap" }}>{fmtDate(j.created_at_unix)}</td>
                                <td>
                                  <div style={{ fontWeight: 850 }}>{j.original_filename || "(unknown)"}</div>
                                  <div className="mutedSmall">
                                    Job: <code>{j.job_id}</code>
                                  </div>
                                </td>
                                <td style={{ whiteSpace: "nowrap" }}>
                                  <StatusBadge status={j.status} />
                                  {j.status === "running" && typeof j.progress === "number" ? (
                                    <span className="mutedSmall" style={{ marginLeft: 8 }}>
                                      {Math.round((j.progress || 0) * 100)}%
                                    </span>
                                  ) : null}
                                  {j.status === "failed" && j.error_message ? (
                                    <div className="mutedSmall" style={{ marginTop: 6 }}>{j.error_message}</div>
                                  ) : null}
                                </td>
                                <td style={{ whiteSpace: "nowrap" }}>
                                  {typeof j.throws_detected === "number" ? j.throws_detected : "-"}
                                </td>
                                <td>
                                  <button type="button" className="buttonPrimary" onClick={() => openDetail(j.job_id)}>
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="jobsCardsWrap">
                        <div style={{ display: "grid", gap: 10 }}>
                          {jobs.map((j) => (
                            <button
                              key={j.job_id}
                              type="button"
                              className="jobCard"
                              onClick={() => openDetail(j.job_id)}
                              title="Open this job"
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                                <div style={{ minWidth: 0 }}>
                                  <div className="jobTitle">{j.original_filename || "(unknown)"}</div>
                                  <div className="mutedSmall">Last analysed: {fmtDate(j.created_at_unix)}</div>
                                </div>
                                <StatusBadge status={j.status} />
                              </div>

                              <div className="jobMetaRow">
                                <div className="mutedSmall">
                                  {typeof j.throws_detected === "number" ? `${j.throws_detected} throws` : "Throws: -"}
                                </div>
                                <div className="mutedSmall">
                                  <code>{j.job_id}</code>
                                </div>
                              </div>

                              {j.status === "failed" && j.error_message ? (
                                <div className="jobError">{j.error_message}</div>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </section>
              </>
            ) : null}

            {view === "detail" ? (
              <>
                <section className="card">
                  <div className="rowWrap" style={{ justifyContent: "space-between" }}>
                    <div>
                      <h2 style={{ margin: 0 }}>Analysis</h2>
                      <div className="mutedSmall" style={{ marginTop: 6 }}>
                        Job: <code>{selectedJobId}</code> {polling ? <span>(updating…)</span> : null}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <button type="button" className="buttonSecondary" onClick={startNewAnalysis}>
                        Start new analysis
                      </button>
                      <button type="button" className="buttonSecondary" onClick={backToList}>
                        Back
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    {detail?.status ? <StatusBadge status={detail.status} /> : null}
                    {detail?.stage ? <span className="mutedSmall">Stage: {detail.stage}</span> : null}
                    {typeof detail?.progress === "number" ? (
                      <span className="mutedSmall">Progress: {Math.round(detail.progress * 100)}%</span>
                    ) : null}
                  </div>

                  {detailErr ? <div className="error" style={{ marginTop: 12 }}>{detailErr}</div> : null}

                  {detail && isWorking ? (
                    <div style={{ marginTop: 12 }}>
                      <div className={`progressWrap ${isWorking ? "progressAnim" : ""}`} aria-label="Progress">
                        <div className="progressBar" style={{ width: `${progressPct}%` }} />
                      </div>
                      <div className="mutedSmall" style={{ marginTop: 8 }}>
                        {detail.status === "queued" ? "Queued…" : `Working… ${progressPct}%`}
                      </div>
                    </div>
                  ) : null}

                  {detail?.status === "failed" ? (
                    <div className="error" style={{ marginTop: 12 }}>
                      {detail?.error?.message || "Failed"}
                    </div>
                  ) : null}
                </section>

                <div className="detailGrid">
                  <div className="detailLeft">
                    {detail?.status === "done" ? (
                      <section className="card">
                        <div className="rowWrap" style={{ justifyContent: "space-between", alignItems: "center" }}>
                          <h2 style={{ margin: 0 }}>Practice plan</h2>
                          {pdfUrl ? (
                            <a className="buttonPrimaryLink" href={pdfUrl} target="_blank" rel="noreferrer">
                              Download PDF
                            </a>
                          ) : null}
                        </div>

                        <PracticePlanView plan={detail.result?.practice_plan} lesson={lessonPlan} />
                      </section>
                    ) : null}

                    <RecentResults jobs={jobs} onOpen={openDetail} />
                  </div>

                  <div className="detailRight">
                    <OverlayPanel
  overlayUrl={overlayUrl}
  overlaySideUrl={overlaySideUrl}
  overlayFrontUrl={overlayFrontUrl}
/>

                  </div>
                </div>
              </>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
