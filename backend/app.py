import json
import sqlite3
import subprocess
import sys
import threading
import time
import uuid
import re

print("FASTAPI PYTHON:", sys.executable)

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles


ROOT = Path(__file__).resolve().parents[1]
UPLOADS_DIR = ROOT / "uploads"
RESULTS_DIR = ROOT / "results"
RUN_ENGINE = ROOT / "run_engine.py"
COMBINE_VIEWS = ROOT / "combine_views.py"
BUILD_COMBINED = ROOT / "build_combined_outputs.py"
DB_PATH = ROOT / "engine.db"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# -------------------------
# Upload limits (UPDATED)
# -------------------------
MAX_UPLOAD_BYTES = 400 * 1024 * 1024  # 400MB
MAX_VIDEO_SECONDS = 70.0  # 1:10

app = FastAPI(title="Darts Analysis API", version="0.7.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/results", StaticFiles(directory=str(RESULTS_DIR)), name="results")

# -------------------------
# Video duration helpers
# -------------------------

_DURATION_RE = re.compile(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)")


def _parse_duration_from_ffmpeg_stderr(stderr: str) -> Optional[float]:
    if not stderr:
        return None
    m = _DURATION_RE.search(stderr)
    if not m:
        return None
    hh = int(m.group(1))
    mm = int(m.group(2))
    ss = float(m.group(3))
    return hh * 3600 + mm * 60 + ss


def get_video_duration_seconds(path: Path) -> float:
    """
    Uses imageio-ffmpeg binary for portability.
    Tries ffprobe if present next to ffmpeg, otherwise falls back to parsing ffmpeg output.
    """
    try:
        import imageio_ffmpeg
    except Exception as e:
        raise RuntimeError("imageio-ffmpeg is required to validate duration") from e

    ffmpeg_exe = Path(imageio_ffmpeg.get_ffmpeg_exe())
    ffprobe_exe = ffmpeg_exe.with_name("ffprobe.exe" if ffmpeg_exe.name.endswith(".exe") else "ffprobe")

    if ffprobe_exe.exists():
        cmd = [
            str(ffprobe_exe),
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(path),
        ]
        p = subprocess.run(cmd, capture_output=True, text=True)
        if p.returncode == 0:
            out = (p.stdout or "").strip()
            try:
                return float(out)
            except Exception:
                pass

    cmd2 = [str(ffmpeg_exe), "-i", str(path)]
    p2 = subprocess.run(cmd2, capture_output=True, text=True)
    dur = _parse_duration_from_ffmpeg_stderr(p2.stderr or "")
    if dur is None:
        raise RuntimeError("Could not detect video duration")
    return dur


def save_upload_with_limit(upload: UploadFile, dest: Path, max_bytes: int) -> int:
    dest.parent.mkdir(parents=True, exist_ok=True)
    written = 0
    try:
        with dest.open("wb") as f:
            while True:
                chunk = upload.file.read(1024 * 1024)  # 1MB chunks
                if not chunk:
                    break
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Max is {max_bytes // (1024 * 1024)}MB.",
                    )
                f.write(chunk)
        return written
    except HTTPException:
        try:
            if dest.exists():
                dest.unlink()
        except Exception:
            pass
        raise
    except Exception as e:
        try:
            if dest.exists():
                dest.unlink()
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {type(e).__name__}: {e}")


# -------------------------
# SQLite helpers
# -------------------------

def db_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    rows = conn.execute(f"PRAGMA table_info({table});").fetchall()
    for r in rows:
        if (r["name"] if isinstance(r, sqlite3.Row) else r[1]) == column:
            return True
    return False


def db_init() -> None:
    conn = db_conn()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS jobs (
              job_id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              created_at_unix REAL NOT NULL,
              original_filename TEXT,
              upload_ext TEXT,
              upload_path TEXT,
              status TEXT NOT NULL,
              progress REAL,
              stage TEXT,
              error_message TEXT,
              overlay_url TEXT,
              analysis_url TEXT,
              practice_plan_url TEXT,
              practice_plan_txt_url TEXT,
              lesson_plan_url TEXT,
              throws_detected INTEGER
            );
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_user_created ON jobs(user_id, created_at_unix DESC);")

        if not _column_exists(conn, "jobs", "lesson_plan_url"):
            conn.execute("ALTER TABLE jobs ADD COLUMN lesson_plan_url TEXT;")

        conn.commit()
    finally:
        conn.close()


@app.on_event("startup")
def _startup():
    db_init()


def db_insert_job(
    job_id: str,
    user_id: str,
    created_at_unix: float,
    original_filename: str,
    upload_ext: str,
    upload_path: str,
) -> None:
    conn = db_conn()
    try:
        conn.execute(
            """
            INSERT INTO jobs (
              job_id, user_id, created_at_unix, original_filename, upload_ext, upload_path,
              status, progress, stage, error_message,
              overlay_url, analysis_url, practice_plan_url, practice_plan_txt_url, lesson_plan_url, throws_detected
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                job_id, user_id, created_at_unix, original_filename, upload_ext, upload_path,
                "queued", 0.0, "starting", None,
                None, None, None, None, None, None
            )
        )
        conn.commit()
    finally:
        conn.close()


def db_update_job_status(job_id: str, status: str, progress: Optional[float] = None, stage: Optional[str] = None) -> None:
    conn = db_conn()
    try:
        conn.execute(
            """
            UPDATE jobs
            SET status = COALESCE(?, status),
                progress = COALESCE(?, progress),
                stage = COALESCE(?, stage)
            WHERE job_id = ?;
            """,
            (status, progress, stage, job_id)
        )
        conn.commit()
    finally:
        conn.close()


def db_mark_job_failed(job_id: str, error_message: str) -> None:
    conn = db_conn()
    try:
        conn.execute(
            """
            UPDATE jobs
            SET status = 'failed',
                progress = 1.0,
                stage = 'failed',
                error_message = ?
            WHERE job_id = ?;
            """,
            (error_message, job_id)
        )
        conn.commit()
    finally:
        conn.close()


def db_mark_job_done(
    job_id: str,
    overlay_url: Optional[str],
    analysis_url: Optional[str],
    practice_plan_url: Optional[str],
    practice_plan_txt_url: Optional[str],
    lesson_plan_url: Optional[str],
    throws_detected: Optional[int],
) -> None:
    conn = db_conn()
    try:
        conn.execute(
            """
            UPDATE jobs
            SET status = 'done',
                progress = 1.0,
                stage = 'done',
                error_message = NULL,
                overlay_url = ?,
                analysis_url = ?,
                practice_plan_url = ?,
                practice_plan_txt_url = ?,
                lesson_plan_url = ?,
                throws_detected = ?
            WHERE job_id = ?;
            """,
            (overlay_url, analysis_url, practice_plan_url, practice_plan_txt_url, lesson_plan_url, throws_detected, job_id)
        )
        conn.commit()
    finally:
        conn.close()


def db_list_jobs_for_user(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    conn = db_conn()
    try:
        rows = conn.execute(
            """
            SELECT
              job_id, user_id, created_at_unix, original_filename,
              status, progress, stage, error_message,
              overlay_url, analysis_url, practice_plan_url, practice_plan_txt_url, lesson_plan_url,
              throws_detected
            FROM jobs
            WHERE user_id = ?
            ORDER BY created_at_unix DESC
            LIMIT ?;
            """,
            (user_id, limit)
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


# -------------------------
# Job status files
# -------------------------

def _job_dir(job_id: str) -> Path:
    return RESULTS_DIR / job_id


def _job_file(job_id: str, filename: str) -> Path:
    return _job_dir(job_id) / filename


def _safe_read_json(path: Path) -> Optional[Dict[str, Any]]:
    try:
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _status_path(job_id: str) -> Path:
    return _job_dir(job_id) / "status.json"


def write_status(job_id: str, payload: Dict[str, Any]) -> None:
    d = _job_dir(job_id)
    d.mkdir(parents=True, exist_ok=True)
    _status_path(job_id).write_text(json.dumps(payload, indent=2), encoding="utf-8")


def read_status(job_id: str) -> Dict[str, Any]:
    p = _status_path(job_id)
    if not p.exists():
        if _job_dir(job_id).exists():
            return {
                "job_id": job_id,
                "status": "queued",
                "progress": 0.0,
                "stage": "starting",
                "started_at_unix": None,
                "finished_at_unix": None,
                "error": None,
                "result": None,
            }
        return {"job_id": job_id, "status": "not_found"}
    return json.loads(p.read_text(encoding="utf-8"))


def _infer_txt_url(job_id: str) -> Optional[str]:
    p = _job_dir(job_id) / "combined" / "practice_plan.txt"
    if p.exists():
        return f"/results/{job_id}/combined/practice_plan.txt"
    return None


def _pick_overlay_url(job_id: str, view: str) -> Optional[str]:
    """
    Prefer web overlay if present; else full overlay; else None.
    """
    base = _job_dir(job_id) / view
    web = base / "overlay_release_web.mp4"
    full = base / "overlay_release.mp4"
    if web.exists():
        return f"/results/{job_id}/{view}/overlay_release_web.mp4"
    if full.exists():
        return f"/results/{job_id}/{view}/overlay_release.mp4"
    return None


# -------------------------
# Background worker
# -------------------------

def _run_single_view(job_id: str, view: str, upload_path: Path, model: str, no_ai: bool) -> None:
    """
    Runs run_engine.py for one view into results/<job_id>/<view>/
    """
    outdir = _job_dir(job_id) / view
    outdir.mkdir(parents=True, exist_ok=True)

    cmd = [
        sys.executable,
        "-u",
        str(RUN_ENGINE),
        "--input",
        str(upload_path),
        "--outdir",
        str(outdir),
        "--model",
        model,
    ]
    if no_ai:
        cmd.append("--no-ai")

    p = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"{view} pipeline failed (exit {p.returncode}). STDERR tail: {(p.stderr or '')[-1200:]}")


def start_background_job(job_id: str, side_path: Optional[Path], front_path: Optional[Path], model: str, no_ai: bool) -> None:
    write_status(job_id, {
        "job_id": job_id,
        "status": "running",
        "progress": 0.01,
        "stage": "starting_worker",
        "started_at_unix": time.time(),
        "finished_at_unix": None,
        "error": None,
        "result": None,
    })
    db_update_job_status(job_id, status="running", progress=0.01, stage="starting_worker")

    try:
        # 1) run pipelines per view
        if side_path:
            db_update_job_status(job_id, status="running", progress=0.10, stage="running_side")
            _run_single_view(job_id, "side", side_path, model, no_ai)

        if front_path:
            db_update_job_status(job_id, status="running", progress=0.45, stage="running_front")
            _run_single_view(job_id, "front", front_path, model, no_ai)

        # 2) combine analyses -> results/<job_id>/combined/analysis.json
        combined_dir = _job_dir(job_id) / "combined"
        combined_dir.mkdir(parents=True, exist_ok=True)
        combined_analysis = combined_dir / "analysis.json"

        side_analysis = (_job_dir(job_id) / "side" / "analysis.json") if side_path else None
        front_analysis = (_job_dir(job_id) / "front" / "analysis.json") if front_path else None

        db_update_job_status(job_id, status="running", progress=0.75, stage="combining_views")

        cmd_combine = [
            sys.executable, "-u", str(COMBINE_VIEWS),
            "--out", str(combined_analysis),
        ]
        if side_analysis and side_analysis.exists():
            cmd_combine += ["--side", str(side_analysis)]
        if front_analysis and front_analysis.exists():
            cmd_combine += ["--front", str(front_analysis)]

        p = subprocess.run(cmd_combine, cwd=str(ROOT), capture_output=True, text=True)
        if p.returncode != 0:
            raise RuntimeError(f"combine_views failed. STDERR: {(p.stderr or '')[-1200:]}")

        # 3) build combined lesson + practice plan + PDF in combined/
        db_update_job_status(job_id, status="running", progress=0.88, stage="building_combined_outputs")

        cmd_build = [
            sys.executable, "-u", str(BUILD_COMBINED),
            "--analysis", str(combined_analysis),
            "--outdir", str(combined_dir),
            "--model", model,
        ]
        if no_ai:
            cmd_build.append("--no-ai")

        p2 = subprocess.run(cmd_build, cwd=str(ROOT), capture_output=True, text=True)
        if p2.returncode != 0:
            raise RuntimeError(f"build_combined_outputs failed. STDERR: {(p2.stderr or '')[-1200:]}")

        # 4) Collect overlays (BOTH) + choose default for backward compat
        overlay_side_url = _pick_overlay_url(job_id, "side") if side_path else None
        overlay_front_url = _pick_overlay_url(job_id, "front") if front_path else None

        # Keep legacy overlay_url behavior: prefer side then front
        overlay_url = overlay_side_url or overlay_front_url

        # 5) Read combined outputs and include JSON in result (THIS FIXES THE UI)
        combined_practice_plan_path = combined_dir / "practice_plan.json"
        combined_lesson_plan_path = combined_dir / "lesson_plan.json"

        practice_plan_obj = _safe_read_json(combined_practice_plan_path) if combined_practice_plan_path.exists() else None
        lesson_plan_obj = _safe_read_json(combined_lesson_plan_path) if combined_lesson_plan_path.exists() else None

        analysis_url = f"/results/{job_id}/combined/analysis.json"
        pdf_url = f"/results/{job_id}/combined/practice_plan.pdf"
        lesson_url = f"/results/{job_id}/combined/lesson_plan.json"

        txt_url = _infer_txt_url(job_id)

        combined_obj = _safe_read_json(combined_analysis) or {}
        summary = combined_obj.get("summary") or {}
        throws_detected = summary.get("throws_detected")

        # 6) Final status payload for UI
        result = {
            # Backward compat
            "overlay_url": overlay_url,

            # New: both overlays when available
            "overlay_side_url": overlay_side_url,
            "overlay_front_url": overlay_front_url,

            # Existing links
            "analysis_url": analysis_url,
            "lesson_plan_url": lesson_url,
            "practice_plan_pdf_url": pdf_url,
            "practice_plan_txt_url": txt_url,

            # IMPORTANT: include the actual JSON objects like the old side-only flow did
            "practice_plan": practice_plan_obj,
            "lesson_plan": lesson_plan_obj,

            "analysis_summary": summary,
            "views": {
                "side": bool(side_path),
                "front": bool(front_path),
            }
        }

        write_status(job_id, {
            "job_id": job_id,
            "status": "done",
            "progress": 1.0,
            "stage": "done",
            "started_at_unix": read_status(job_id).get("started_at_unix"),
            "finished_at_unix": time.time(),
            "error": None,
            "result": result,
        })

        db_mark_job_done(
            job_id=job_id,
            overlay_url=overlay_url,
            analysis_url=analysis_url,
            practice_plan_url=pdf_url,
            practice_plan_txt_url=txt_url,
            lesson_plan_url=lesson_url,
            throws_detected=throws_detected if isinstance(throws_detected, int) else None,
        )

    except Exception as e:
        err_msg = f"{type(e).__name__}: {e}"
        db_mark_job_failed(job_id, err_msg)
        st = read_status(job_id)
        write_status(job_id, {
            "job_id": job_id,
            "status": "failed",
            "progress": 1.0,
            "stage": "failed",
            "started_at_unix": st.get("started_at_unix"),
            "finished_at_unix": time.time(),
            "error": {"message": err_msg},
            "result": None,
        })


# -------------------------
# API
# -------------------------

@app.get("/health")
def health():
    return {"ok": True}


@app.post("/analyze")
async def analyze(
    request: Request,
    side_video: Optional[UploadFile] = File(None),
    front_video: Optional[UploadFile] = File(None),
    user_id: str = Form("dev_user"),
    model: str = Query("gpt-5-mini"),
    no_ai: bool = Query(False),
):
    if (side_video is None or not side_video.filename) and (front_video is None or not front_video.filename):
        raise HTTPException(status_code=400, detail="Upload at least one video: side_video and/or front_video")

    job_id = uuid.uuid4().hex[:12]
    created_at = time.time()

    def _save_and_validate(upl: UploadFile, label: str) -> Tuple[Path, str]:
        suffix = Path(upl.filename).suffix.lower() if upl.filename else ""
        if not suffix:
            suffix = ".mov"
        upload_path = UPLOADS_DIR / f"{job_id}_{label}{suffix}"
        save_upload_with_limit(upl, upload_path, MAX_UPLOAD_BYTES)

        try:
            dur = get_video_duration_seconds(upload_path)
        except Exception as e:
            try:
                if upload_path.exists():
                    upload_path.unlink()
            except Exception:
                pass
            raise HTTPException(status_code=400, detail=f"Could not read {label} duration: {type(e).__name__}: {e}")

        if dur > MAX_VIDEO_SECONDS + 0.05:
            try:
                if upload_path.exists():
                    upload_path.unlink()
            except Exception:
                pass
            raise HTTPException(
                status_code=400,
                detail=f"{label} video too long ({dur:.1f}s). Max is {int(MAX_VIDEO_SECONDS)} seconds.",
            )

        return upload_path, suffix

    side_path = None
    front_path = None
    ext_used = ".mov"
    name_for_db = ""

    if side_video and side_video.filename:
        side_path, ext_used = _save_and_validate(side_video, "side")
        name_for_db = side_video.filename

    if front_video and front_video.filename:
        front_path, ext_used2 = _save_and_validate(front_video, "front")
        if not name_for_db:
            name_for_db = front_video.filename

    # Create job dir + immediate queued status
    _job_dir(job_id).mkdir(parents=True, exist_ok=True)
    write_status(job_id, {
        "job_id": job_id,
        "status": "queued",
        "progress": 0.0,
        "stage": "starting",
        "started_at_unix": None,
        "finished_at_unix": None,
        "error": None,
        "result": None,
    })

    # DB insert uses whichever filename/path exists first (history list)
    db_insert_job(
        job_id=job_id,
        user_id=user_id,
        created_at_unix=created_at,
        original_filename=name_for_db or "",
        upload_ext=ext_used or ".mov",
        upload_path=str(side_path or front_path or ""),
    )

    t = threading.Thread(
        target=start_background_job,
        args=(job_id, side_path, front_path, model, no_ai),
        daemon=True,
    )
    t.start()

    return JSONResponse({
        "job_id": job_id,
        "status_url": f"/jobs/{job_id}",
        "message": "Thanks for uploading. Analysis started.",
    })


@app.get("/jobs/{job_id}")
def job(job_id: str):
    st = read_status(job_id)
    return JSONResponse(st)


@app.get("/users/{user_id}/jobs")
def list_jobs(user_id: str, limit: int = Query(50, ge=1, le=200)):
    jobs = db_list_jobs_for_user(user_id=user_id, limit=limit)
    return JSONResponse({
        "user_id": user_id,
        "count": len(jobs),
        "jobs": jobs,
    })
    
