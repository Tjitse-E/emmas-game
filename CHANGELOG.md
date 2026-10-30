# Changelog

Every deploy to https://emmas-games.vendic.cloud gets a new version here, at the top. The picture menu and the games
show the newest version, bottom right. `scripts/deploy.sh` refuses to deploy a version that was deployed before.

- **Major:** a new game.
- **Minor:** new levels or features in an existing game, or in the menu.
- **Patch:** bug fixes.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.3.2] - 2026-10-30

A patch after two test plays of 2.3.1, in which the eggs felt slow.

### Changed
- Moon Meadow World: the eggs are quicker. The stones wake as soon as Elizabeth has said both numbers of a sum. After a right answer in the first and the second sum she says one short line, the sum itself, while the heart lights up. "Fill all three hearts" is said before the first egg of a play only.
- Moon Meadow World: when a baby wishes for something, Elizabeth waits longer before she reminds Emma to read the wish: 20 seconds for a word and 25 seconds for two words, and the wait starts again after each touch.
- Moon Meadow World: the last wish before free play is a pond toy instead of something to eat, with none of the words of the first pond wish. The royal picnic has two food wishes of its own, so she no longer meets three food baskets in a row.

### Fixed
- Moon Meadow World: when she slides the star along a name she built, the last letter sound no longer plays under the baby's name or under "Listen again".

## [2.3.1] - 2026-10-29

A small patch. In the easy sums a stone of 2 is never the answer. This stays as it is for now, by Tjitse's choice: her first tries show whether it needs to change.

### Changed
- Moon Meadow World: the snow egg can ask nine take away six again. Tjitse listened to Elizabeth's clip and approved it.

## [2.3.0] - 2026-10-29

The finished 2.3.0. This entry lists everything that is new since 2.2.0, so it repeats 2.3.0-pre.1.

Still open: Tjitse listens to the new clips and sound effects (until he approves them, the game plays them all). The snow egg's sum nine take away six waits until he has listened to its clip. Waiting for 2.3.1: the flower crown's 3D shape does not match its picture, the white swatches and the gala gloves need an outline, the bead string sits close to the corner buttons, a present is saved about 1.6 seconds after she picks it, copying the bead on the left still wins her first own bead gap 1 time in 3, and there is no night sound yet. In the easy sums a stone of 2 is never right, so a child who leaves it out and takes the smallest stone is right about half the time; the fix needs Tjitse's choice. When a snow stone is bigger than the number of warm cups, Elizabeth says the wrong number of cups too many.

### Added
- Moon Meadow World: the Dressing Corner at Lumi's gazebo. After her first side quest a trunk bubble invites her there. Her two babies dress up first, and she reads what each one wishes for. Then she dresses Princess Emma at the trunk and the mirror while a music box plays for 30 to 60 seconds. When the tune ends, Princess Emma curtsies and her look is kept.
- Moon Meadow World: a bigger wardrobe. There are 12 hair styles instead of 4, and new rows for the crown, the shoes, earrings and a necklace. Hair, gown, crown, shoes, hair things and jewels each take any of 12 colours or rainbow, so green eyes, a green gown and green hair work together. Every colour is free from the first play. Elizabeth says the name of each colour she picks, and the short colour words are printed.
- Moon Meadow World: presents she keeps. Every finished side quest lets her pick one of two new things: a crown at the picnic, shoes at the hay rack, earrings or a necklace at the bead tree, and a hair style or a hair thing at the Dressing Corner. She keeps wearing it. The inside of the trunk lid shows her collection, and a full row gets a sticker.
- Moon Meadow World: the bead tree, a new side quest. She finishes a necklace for her baby by filling three gaps in a pattern of beads that differ in shape and colour. On her first visit a ghost hand fills the first gap to show her how.
- Moon Meadow World: phrase wishes at the Dressing Corner. From her first play a baby wishes for a coloured thing, such as "the green sock", and she must read both words to pick the right picture. Gold and brown never share a basket.
- Moon Meadow World: a picture check page for Tjitse (`check.html`). Emma names each of the 30 coloured pictures and Tjitse taps a tick or a cross. A cross turns that picture off in the game at once on that iPad, without a new build.
- Moon Meadow World: a bigger meadow, with the Dressing Corner, the bead tree, and a moon mist with a saddle sign that says what opens next.
- Moon Meadow World: 16 sound effects (among them an egg crack, a unicorn's nicker, splashes, a bedtime bell and an owl), a soft day sound and the music box tune. No sound plays over Elizabeth's words or letter sounds, and the day sound is silent while Emma works on a sum or a word.

### Changed
- Moon Meadow World: each egg hatches after three sums instead of one, all within 10 as at her school: an easy one, a middle one and a bond to 10. The easy one comes first, then the two harder ones in either order. A heart lights up after each right answer. The hay rack's sum is within 10 too.
- Moon Meadow World: the side quests take turns. Free play offers the royal picnic and one maths quest, the bead tree or the hay rack, and the one she did not finish comes again next time. Free play lasts two minutes, or up to two and a half while a quest bubble still waits.
- Moon Meadow World: at the start she has 45 seconds at the mirror to dress, with the same music box. Her look from 2.2 carries over.

### Fixed
- Moon Meadow World: since 2.3.0-pre.1, the bead trays are fairer. Matching only the colour or only the shape rarely fills a whole string.
- Moon Meadow World: since 2.3.0-pre.1, the babies at the Dressing Corner no longer wish for a dress-up word she read earlier in the same play.
- Moon Meadow World: since 2.3.0-pre.1, a touch after a wrong egg stone stops the hint, so Elizabeth's hint no longer starts after Emma has picked up a stone.
- Moon Meadow World: since 2.3.0-pre.1, every egg sum and the hay rack's sum stay within 10. The pre-release asked sums up to 16.
- Moon Meadow World: since 2.3.0-pre.1, the start mirror gives her 45 seconds again instead of 30, as Tjitse decided.

## [2.3.0-pre.1] - 2026-10-29

A pre-release of 2.3.0, so Emma can play it before the last checks are done. 2.3.0 adds fairer bead trays and the picture check page.

### Added
- Moon Meadow World: the Dressing Corner at Lumi's gazebo. After her first side quest a trunk bubble invites her there. Her two babies dress up first, and she reads what they wish for. Then she dresses Princess Emma at the trunk and the mirror while a music box plays. Her look is kept.
- Moon Meadow World: presents she keeps. Every finished side quest lets her pick one of two new things: crowns, shoes, earrings, a necklace, hair styles and hair things. They go into the trunk, and the inside of its lid shows her collection.
- Moon Meadow World: more to wear. There are 12 hair styles instead of 4, and new rows for the crown, the shoes, earrings and a necklace. Hair, gown, crown, shoes, hair things and jewels each take any of about 12 colours or rainbow, so green eyes, a green gown and green hair work together.
- Moon Meadow World: the bead tree, a new side quest where she finishes colour and shape patterns on a string.
- Moon Meadow World: a bigger meadow, with a moon mist and a saddle sign that says what opens next.
- Moon Meadow World: 16 new sound effects and a soft day sound.

### Changed
- Moon Meadow World: each egg hatches after three sums instead of one: an easy sum within 10, one just past 10 and one across ten. A heart lights up after each right answer.
- Moon Meadow World: the side quests take turns. Free play offers the royal picnic and one maths quest, the bead tree or the hay rack. It lasts two minutes, or up to two and a half while a quest bubble still waits.
- Moon Meadow World: at the start she has 30 seconds at the mirror to dress. Her look from 2.2 carries over.

## [2.2.0] - 2026-10-28

### Added
- Moon Meadow World: Emma dresses Princess Emma before she plays. She picks hair colour, eyes, gown, hair style and a hair thing (bows, a unicorn clip, flowers, stars, butterflies or hearts) from rows of pictures, and Princess Emma shows each choice in 3D. The game remembers her look on this iPad.
- Moon Meadow World: two side quests in free play, both optional. At a royal picnic by Lumi's gazebo two babies each wish for something she reads, and she gets a rose for her hair. At a new hay rack by the stable the herd is hungry, with a maths moment.
- Moon Meadow World: new words. The babies' wishes come from about 80 words in three kinds (dress-up, pond and picnic) and change every play.
- Moon Meadow World: the goodnight ribbons are a collection. Each play adds a ribbon colour, and she keeps the ones she has.

### Changed
- Moon Meadow World: guessing is harder. Wish baskets hold 4, then 5 pictures whose words look alike (seal, sail, shell). After a wrong pick, that picture shows its own word and the letters that differ light up. The game follows how well she reads and makes the baskets easier after two struggles.
- Moon Meadow World: the eggs have 4 or 5 number stones, and the wrong stones are real mistakes (one off, or the number she just heard). The stones wake only after Elizabeth has said both numbers. The sums change every play and never repeat within a play.
- Moon Meadow World: the second naming has one more wrong letter gem, and the first gem can be a near capital (B for P).
- Moon Meadow World: from the second play, Lumi's welcome is shorter.

### Fixed
- Moon Meadow World: taps, the name star, the sound dots, the home button and the play-again moon always finish, also when the iPad loses the finger's release. A lost release on the home button no longer takes her out of the game.
- Moon Meadow World: one lost release on the meadow no longer blocks every later tap in the world.

## [2.1.0] - 2026-10-26

### Added
- The picture menu shows the version, bottom right.

### Changed
- Moon Meadow World's start screen shows the version instead of the commit.

## [2.0.2] - 2026-10-26

### Fixed
- Moon Meadow World: the name bells no longer lock up on the iPad. A bell stayed lifted after a touch and every drag stopped working.

## [2.0.1] - 2026-10-26

### Fixed
- Moon Meadow World: a picture or name that fails to load is tried again, so the bells no longer show broken pictures or ring without a name.

## [2.0.0] - 2026-10-26

### Added
- Moon Meadow World, a one-level 3D demo: warm two eggs with number stones, name the babies, read their wishes, play at the pond slide and call the herd to bed by door numbers. It is the first card in the menu.

## [1.0.0] - 2026-10-15

### Added
- The picture menu with Moon Meadow Home (1.0.1), Unicorn Egg Nest, Pippa's Word Wand and Fluffle Nursery.
