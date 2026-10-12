# tools/art/tests/test_lists.py
import re
import unittest

from art import lists, paths

PLURAL_ONES = ['hat', 'pin', 'cup', 'mug', 'ring', 'bell', 'duck', 'boat', 'shell', 'bow', 'bead', 'cape', 'cake',
               'kite', 'bike', 'chair', 'key', 'carrot', 'apple', 'pancake', 'plank', 'brick', 'castle', 'horse',
               'fox', 'box', 'dress', 'glass', 'brush', 'bush', 'peach', 'bench', 'branch', 'sash', 'mouse']
TWINS = [('pan', 'pen'), ('hat', 'hut'), ('cap', 'cup'), ('peg', 'pig'), ('net', 'nut'), ('bed', 'bud'),
         ('boot', 'boat'), ('sheep', 'ship'), ('pie', 'pea'), ('cap', 'cape'), ('cub', 'cube'), ('tap', 'tape'),
         ('pin', 'pine'), ('can', 'cane')]
ANIMALS = ['pig', 'dog', 'cat', 'pup', 'hen', 'cub', 'fox', 'chick', 'fish', 'bee', 'sheep', 'goat', 'toad', 'cow',
           'owl', 'starfish', 'frog', 'crab', 'swan', 'rabbit', 'kitten', 'whale', 'seal', 'bird', 'crow', 'mouse',
           'horse', 'duck']
TINTABLE = {'bow', 'hat', 'cape', 'bead', 'ball', 'cup', 'sock', 'dress', 'shirt', 'kite', 'ribbon', 'scarf', 'coat',
            'bag', 'mug', 'balloon', 'skirt', 'jeans'}
LOADED_STEPS = {'R01', 'R02', 'R03', 'R04', 'R05', 'R07', 'R08', 'R09', 'R10', 'R11', 'R13', 'R14', 'R15', 'R16',
                'R17', 'R18', 'R19', 'R20', 'R21', 'R22', 'R23', 'R26', 'R27', 'R30', 'R32', 'R34', 'R36', 'R38',
                'R39', 'R41'}
HEX = re.compile(r'^#[0-9a-f]{6}$')


class WordsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.words = lists.load_words()
        cls.ids = [w.id for w in cls.words]

    def test_seed_size_and_unique_ids(self):
        self.assertEqual(len(self.ids), 273)
        self.assertEqual(len(set(self.ids)), 273)
        for i in self.ids:
            self.assertTrue(paths.is_word_id(i), i)

    def test_plural_one_words_present(self):
        for w in PLURAL_ONES:
            self.assertIn(w, self.ids)

    def test_twin_pairs_present(self):
        for a, b in TWINS:
            self.assertIn(a, self.ids)
            self.assertIn(b, self.ids)

    def test_steps_are_loaded_steps(self):
        for w in self.words:
            self.assertIn(w.step, LOADED_STEPS, w.id)

    def test_every_word_has_a_plain_description(self):
        for w in self.words:
            self.assertTrue(w.desc.startswith(('a ', 'an ', 'one ')), w.id)
            self.assertNotRegex(w.desc, r'\d', w.id)

    def test_animals_are_toys(self):
        by_id = {w.id: w for w in self.words}
        for a in ANIMALS:
            self.assertIn('toy', by_id[a].desc, a)

    def test_tintables(self):
        tinted = {w.id: w.tint for w in self.words if w.tint}
        self.assertEqual(set(tinted), TINTABLE)
        for hexv in tinted.values():
            self.assertRegex(hexv, HEX)

    def test_no_body_parts_or_people(self):
        for bad in ['leg', 'ear', 'nose', 'hand', 'foot', 'feet', 'toe', 'chin', 'hair', 'man', 'doll', 'girl']:
            self.assertNotIn(bad, self.ids)

    def test_priority_order(self):
        pr = [w.priority for w in self.words]
        self.assertEqual(pr, sorted(pr))
        self.assertEqual(self.words[0].priority, 1)
        p1 = {w.id for w in self.words if w.priority == 1}
        self.assertTrue(set(PLURAL_ONES) <= p1)


class ItemsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.items = lists.load_items()

    def test_ids_kinds_waves(self):
        ids = [i.id for i in self.items]
        self.assertEqual(len(ids), len(set(ids)))
        word_ids = {w.id for w in lists.load_words()}
        for i in self.items:
            self.assertTrue(paths.is_valid_id(i.id) and not paths.is_word_id(i.id), i.id)
            self.assertNotIn(i.id, word_ids)
            self.assertIn(i.kind, lists.KINDS)
            self.assertIn(i.wave, ('A', 'B', 'C'))
            self.assertGreaterEqual(i.size, 96)
            if i.tint:
                self.assertRegex(i.tint, HEX)
            if i.kind == 'outfit':
                self.assertIn(i.slot, lists.SLOTS, i.id)

    def test_counts_per_wave(self):
        count = {w: sum(1 for i in self.items if i.wave == w) for w in 'ABC'}
        self.assertEqual(count, {'A': 75, 'B': 91, 'C': 30})

    def test_pin_sets(self):
        pins = [i.id for i in self.items if i.kind == 'pin']
        for s in ('flower', 'sweet', 'sea', 'moon'):
            self.assertEqual(sum(1 for p in pins if p.startswith(f'pin-{s}-')), 10, s)


    def test_svg_only_lines(self):
        svg = {i.id for i in self.items if i.desc.startswith('svg:')}
        self.assertEqual(svg, {'ui-ghost-hand', 'ui-replay', 'ui-turn-ipad', 'ui-play'})

    def test_scene_art_ids_are_listed(self):
        src = (paths.REPO / 'docs/v3/plan/contracts.ts').read_text()
        block = src[src.index('export const SCENE_ART_IDS'):]
        block = block[:block.index('} as const')]
        wanted = set(re.findall(r"'([a-z0-9-]+)'", block))
        have = {i.id for i in self.items} | {b.id for b in lists.load_backgrounds()}
        self.assertGreater(len(wanted), 40)
        self.assertEqual(wanted - have, set())
        for w in ('item-moon', 'item-brush', 'item-treat', 'item-heart'):
            self.assertEqual(next(i for i in self.items if i.id == w).wave, 'A', w)


class BreedsAndBackgroundsTest(unittest.TestCase):
    def test_breeds(self):
        b = lists.load_breeds()
        self.assertEqual([x['id'] for x in b],
                         ['moon', 'nestling', 'pebble', 'cosy', 'bubble', 'berry', 'snow', 'post', 'sparkle'])
        self.assertEqual([x['wave'] for x in b], ['A'] * 5 + ['B'] * 3 + ['C'])
        for x in b:
            self.assertIn(x['horn'], ('gold', 'bronze', 'silver', 'pearl'))

    def test_backgrounds(self):
        bgs = lists.load_backgrounds()
        self.assertEqual(len(bgs), 11)
        self.assertEqual(sum(1 for b in bgs if b.wave == 'A'), 6)
        for b in bgs:
            self.assertTrue(b.id.startswith('bg-'))


if __name__ == '__main__':
    unittest.main()
