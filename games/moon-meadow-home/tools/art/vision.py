import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
BIN = HERE / '.bin' / 'vision'


def _build() -> bool:
    if BIN.exists() and BIN.stat().st_mtime >= (HERE / 'vision.swift').stat().st_mtime:
        return True
    BIN.parent.mkdir(exist_ok=True)
    # The module cache must be writable, also inside the Claude Code sandbox.
    r = subprocess.run(['swiftc', '-O', '-module-cache-path', str(BIN.parent / 'mc'), str(HERE / 'vision.swift'),
                        '-o', str(BIN)], capture_output=True)
    return r.returncode == 0


_works: bool | None = None


def available() -> bool:
    """True when the helper builds and Vision runs. Inside the Claude Code sandbox Vision fails, so this is False."""
    global _works
    if _works is None:
        try:
            _works = _build() and _probe()
        except (OSError, subprocess.SubprocessError):
            _works = False
    return _works


def _probe() -> bool:
    import tempfile

    from PIL import Image
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / 'probe.png'
        Image.new('RGB', (64, 64), 'white').save(p)
        return subprocess.run([str(BIN), 'text', str(p)], capture_output=True, timeout=60).returncode == 0


def detect_text(path: Path) -> list[str]:
    if not available():
        return []
    r = subprocess.run([str(BIN), 'text', str(path)], capture_output=True, text=True, timeout=60)
    return [ln for ln in r.stdout.splitlines() if ln.strip()]


def foreground_mask(path: Path, out: Path) -> bool:
    if not available():
        return False
    r = subprocess.run([str(BIN), 'mask', str(path), str(out)], capture_output=True, timeout=120)
    return r.returncode == 0 and out.exists()
