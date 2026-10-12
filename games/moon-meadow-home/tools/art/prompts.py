STYLE = ('in exactly the style of the attached picture: clean shapes, smooth soft shading, a warm outline in a '
         'darker shade of each fill, light from the top left, no paint, gouache, watercolour or brush texture')
SAVE = 'Save it as {stem}.png in the current working directory.'


def sheet_prompt(descs: list[str], cols: int, rows: int, stem: str, grey: bool = False) -> str:
    items = '\n'.join(f'{i + 1}. {d}' for i, d in enumerate(descs))
    grey_line = (' Draw every object in plain light grey only, with no other colour, the same soft shading and a '
                 'darker grey outline, so it can be coloured later.') if grey else ''
    return (f'Use your image generation tool to draw one square picture: a sheet of {len(descs)} separate objects '
            f'arranged in a grid of {cols} columns and {rows} rows on a plain white background, {STYLE}. Each object '
            'is drawn alone and whole, centred in its own grid cell, filling about 70 percent of the cell, with wide '
            'empty white gutters between the cells. Objects never touch or overlap each other or the picture edge. '
            'No text, letters, numbers, labels, grid lines, frames, ground shadows or people. Animals are always soft '
            f'plush toys. Leave unused cells empty.{grey_line} Reading order is left to right, top to bottom:\n'
            f'{items}\n' + SAVE.format(stem=stem))


def breed_prompt(change: str, stem: str) -> str:
    return ('Use your image generation tool to redraw the attached baby unicorn as a new breed, in exactly the '
            'same style, pose, size, camera angle and position on the canvas. Keep exactly these colours: lilac body, '
            'pink mane and tail with mint green streaks, gold horn and hooves, cream markings, the same eyes and rosy '
            f'cheeks. Change only this: {change}. The whole body is visible with white space around it, all four '
            'hooves on one level, the tail clear of the body. Plain white background, no ground shadow, no text. '
            + SAVE.format(stem=stem))


def foal_prompt(stem: str) -> str:
    return ('Use your image generation tool to draw the attached baby unicorn one stage older, as a foal: the same '
            'breed, the same colours and markings, the same style, facing the same way, with slightly longer legs and '
            'neck, a slightly longer mane and tail and a slightly smaller head for its body, still young, round and '
            'cute. The whole body is visible with white space around it, all four hooves on one level, the tail '
            'clear of the body. Plain white background, no ground shadow, no text. ' + SAVE.format(stem=stem))


def background_prompt(desc: str, stem: str) -> str:
    return (f'Use your image generation tool to draw a wide landscape picture in a 3:2 shape, as large as you can, '
            f'{STYLE}. The scene: {desc}. Keep a large calm open area free of objects for characters and word '
            'panels. No characters, no unicorns, no people, no animals, no text. ' + SAVE.format(stem=stem))


def lumi_prompt(stem: str) -> str:
    return ('Use your image generation tool to draw Queen Lumi, a kind grown-up unicorn queen, as a head and '
            f'neck portrait looking at the viewer, {STYLE}. She is white with a soft lilac glow, a long silver-blue '
            'mane, a golden horn and a small golden crown behind the horn, gentle eyes and a closed smiling mouth. '
            'She is framed inside a glowing pale yellow crescent moon. Plain white background, no text. '
            + SAVE.format(stem=stem))


def lumi_mouth_prompt(stem: str) -> str:
    return ('Use your image generation tool to redraw the attached picture exactly the same, with every line, '
            'colour and position unchanged, except that her mouth is open a little as if she is talking. '
            + SAVE.format(stem=stem))
