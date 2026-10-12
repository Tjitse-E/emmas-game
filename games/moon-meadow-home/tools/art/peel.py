"""Layer rig spike (Task A12): paste a Codex edit back only where a part was removed, and measure the seam."""
import numpy as np
from PIL import Image

from .imageops import dilate


def paste_back(original: Image.Image, edited: Image.Image, mask: np.ndarray, grow: int = 6) -> Image.Image:
    """Edited pixels inside the mask grown by `grow`, original pixels everywhere else."""
    o = np.asarray(original.convert('RGBA'))
    e = np.asarray(edited.convert('RGBA').resize(original.size, Image.LANCZOS))
    m = dilate(mask, grow)
    return Image.fromarray(np.where(m[..., None], e, o).astype(np.uint8), 'RGBA')


def seam_error(original: Image.Image, result: Image.Image, mask: np.ndarray, grow: int = 6) -> float:
    """Mean absolute RGB difference in the ring just inside the edge of the grown mask, where the
    removed part has ended and the edit should match the original."""
    ring = dilate(mask, grow) & ~dilate(mask, max(0, grow - 3))
    if not ring.any():
        return 0.0
    o = np.asarray(original.convert('RGB')).astype(np.float32)
    r = np.asarray(result.convert('RGB').resize(original.size, Image.LANCZOS)).astype(np.float32)
    return float(np.abs(o - r)[ring].mean())
