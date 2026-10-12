"""Plans a batch with its own sheet grid, for pictures that need more pixels than a 4 by 4 cell gives.

Run from the game folder:
  PYTHONPATH=tools python3 art-src/tools/plan_grid.py --batch items-a-big --source items --grid 2 --ids a,b,c
The batch file has the same shape as `pipeline plan-sheets` writes, so `gen`, `cut`, `review`, `redo` and `svg`
work on it unchanged. Ids are kept in the order given. Ids whose
description starts with `svg:` get the verdict `svg` and no sheet.
"""
import argparse
import sys

from art import paths, pipeline, review, sheets


def main(argv=None) -> int:
    p = argparse.ArgumentParser()
    p.add_argument('--batch', required=True)
    p.add_argument('--source', required=True)
    p.add_argument('--grid', type=int, required=True, help='columns and rows of each sheet')
    p.add_argument('--ids', required=True)
    a = p.parse_args(argv)
    by_id = {e.id: e for e in pipeline.load_list(a.source)}
    wanted = a.ids.split(',')
    unknown = [i for i in wanted if i not in by_id]
    if unknown:
        raise SystemExit(f'not in {a.source}: {" ".join(unknown)}')
    todo = [by_id[i] for i in wanted]
    specs = sheets.plan_sheets(a.batch, todo, a.grid, a.grid)
    pipeline.save_batch(a.batch, a.source, specs, todo)
    svg_only = [e.id for e in todo if e.desc.startswith('svg:')]
    if svg_only:
        review.init(a.batch, [], paths.REVIEW)
        verdicts = review.load(a.batch, paths.REVIEW)
        for i in svg_only:
            if not pipeline.is_done(verdicts.get(i)):
                verdicts[i] = 'svg'
        pipeline._write_json(paths.REVIEW / f'{a.batch}.json', verdicts)
    for s in specs:
        print(f'{s.id}: {len(s.ids)} pictures{" (grey)" if s.grey else ""}: {" ".join(s.ids)}')
    print(f'{len(specs)} sheets, {len(todo)} pictures')
    return 0


if __name__ == '__main__':
    sys.exit(main())
