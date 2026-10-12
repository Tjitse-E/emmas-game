"""Runs `art.pipeline` with SVG fallbacks rendered by rsvg-convert instead of ImageMagick.

ImageMagick's built-in SVG renderer drops strokes, stroke-only paths and rotated groups, so the hand-drawn
fallbacks come out broken. rsvg-convert (librsvg) renders them correctly. Same commands and options as the pipeline:
  PYTHONPATH=tools python3 art-src/tools/run.py svg --batch items-a
"""
import shutil
import subprocess
import sys
from pathlib import Path

from art import pipeline


def render_svg(svg: Path, png: Path) -> bool:
    png.parent.mkdir(parents=True, exist_ok=True)
    if shutil.which('rsvg-convert') is None:
        return pipeline_render(svg, png)
    r = subprocess.run(['rsvg-convert', '-w', '1280', '-o', str(png), str(svg)], capture_output=True)
    return r.returncode == 0 and png.exists()


pipeline_render = pipeline.render_svg
pipeline.render_svg = render_svg

if __name__ == '__main__':
    sys.exit(pipeline.main())
