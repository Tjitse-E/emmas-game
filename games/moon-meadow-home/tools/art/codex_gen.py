import json
import re
import shutil
import subprocess
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path

from . import paths

_ledger_lock = threading.Lock()
_GEN_RE = re.compile(r'(/[^\s\'"]*generated_images/[^\s\'"]+\.png)')


@dataclass
class Job:
    id: str
    prompt: str
    refs: list[Path]
    out: Path


@dataclass
class JobResult:
    id: str
    ok: bool
    out: Path | None
    attempts: int
    seconds: float
    error: str = ''


def build_command(job: Job, codex_bin: str = 'codex') -> list[str]:
    cmd = [codex_bin, 'exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', job.prompt]
    if job.refs:
        cmd += ['-i', *[r.name for r in job.refs]]
    return cmd


def extract_generated_path(stdout: str) -> Path | None:
    found = _GEN_RE.findall(stdout)
    return Path(found[-1]) if found else None


def _run_one(job: Job, retries: int, timeout: int, codex_bin: str, work_dir: Path) -> JobResult:
    t0 = time.time()
    if job.out.exists():
        return JobResult(job.id, True, job.out, 0, 0.0)
    err = ''
    for attempt in range(1, retries + 2):
        wd = work_dir / job.id
        shutil.rmtree(wd, ignore_errors=True)
        wd.mkdir(parents=True)
        for r in job.refs:
            shutil.copy(r, wd / r.name)
        try:
            p = subprocess.run(build_command(job, codex_bin), cwd=wd, stdin=subprocess.DEVNULL,
                               capture_output=True, text=True, timeout=timeout)
        except subprocess.TimeoutExpired:
            err = 'timeout'
            continue
        made = wd / f'{job.id}.png'
        if not made.exists():
            elsewhere = extract_generated_path(p.stdout + p.stderr)
            if elsewhere and elsewhere.exists():
                made = elsewhere
        if p.returncode == 0 and made.exists():
            job.out.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(made, job.out)
            return JobResult(job.id, True, job.out, attempt, time.time() - t0)
        err = f'exit {p.returncode}: {(p.stderr or p.stdout)[-300:]}'
    return JobResult(job.id, False, None, retries + 1, time.time() - t0, err)


def run_jobs(jobs: list[Job], *, parallel: int = 4, retries: int = 2, timeout: int = 900, codex_bin: str = 'codex',
             work_dir: Path = paths.WORK, ledger: Path | None = None) -> list[JobResult]:
    parallel = max(1, min(parallel, 4))

    def task(job: Job) -> JobResult:
        r = _run_one(job, retries, timeout, codex_bin, work_dir)
        if ledger:
            with _ledger_lock:
                ledger.parent.mkdir(parents=True, exist_ok=True)
                with ledger.open('a') as f:
                    f.write(json.dumps({'id': r.id, 'ok': r.ok, 'attempts': r.attempts,
                                        'seconds': round(r.seconds, 1), 'error': r.error,
                                        'at': time.strftime('%Y-%m-%dT%H:%M:%S')}) + '\n')
        return r

    with ThreadPoolExecutor(max_workers=parallel) as ex:
        return list(ex.map(task, jobs))
