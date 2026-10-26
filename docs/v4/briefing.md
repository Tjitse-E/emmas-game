# Moon Meadow Home v4: briefing

Working notes from the interview with Emma and Tjitse (25 October 2026). This is not the design yet. The design document follows when the interview is done.

## Intent

v4 rebuilds Moon Meadow Home (v3) as a 3D world in three.js. Emma plays a main character who walks around the world and plays with her unicorns. There is a real game element, but reading English and maths stay the most important part: they are how she makes progress in the game. Emma likes role play a lot, so the world gives her room to look after, talk to and play with her herd.

## What Emma said

- She wants to make a lot of unicorns. The herd must be able to grow much bigger than in v3.
- The maths is too easy. "5 + 1 = 6" is too easy for her. Every sum should be a small challenge. (v3 1.0.1 already asks egg totals from 7 to 15, so the easy sums probably come from other jobs in the game. To check.)
- Some words are too hard, for example "beetroot". Words must fit a 6-year-old who is learning to read: short words she can sound out, plus a few common tricky words.
- She likes everything from Unicorn Egg Nest: the eggs, warming them, hatching, naming and nursing all come along into v4.
- What Princess Emma does: play with the unicorns, bring them to the stables, take care of them, ride on them, and ride in a unicorn chariot with Princess Emma on the back.
- She wants a main character she can play as: Princess Emma, with two blonde ponytails that almost reach the ground and a pretty pink dress.
- At the pond there is a small slide, but she cannot get the unicorns to go down the slide into the water. She wants that to work. This is the kind of free play she wants with her unicorns.

## What Tjitse said

- There must be a learning element: reading English and maths are still the most important.
- Emma likes role play a lot.

## Decided

- The 3D world holds the meadow, the pond, the stable and the nest in one place she can walk around. Walking from one place to another replaces the menu buttons.
- v4 gets a card in Emma's picture menu (`index.html`).
- Target device: iPad Air 2 (Safari 15, 2 GB memory). The 3D world must stay small and light: low-poly models, few lights, no real-time shadows, a capped render resolution.
- The main character is Princess Emma: two blonde ponytails that almost reach the ground and a pretty pink dress. Emma plays as her.

- Play in the world (agreed on 25 October 2026):
  - Princess Emma walks around the meadow on foot with her unicorns following her. She plays with them at the pond and on the slide, feeds, brushes and beds them, and brings them to the stables.
  - Riding a unicorn and the chariot are how she travels further. On foot she stays in the meadow.
  - The chariot is a goal to work towards. She does not have it at the start.
  - Reading and maths come in through the role play: a unicorn says what it wants and she reads the word; she works out how many unicorns or carrots the chariot needs.
  - Only the unicorns she plays with walk with her. The rest of the herd rests in the stables or grazes far away, so the iPad Air 2 keeps up.

## Next

The design is in [spec.md](spec.md).
