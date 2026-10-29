# Changelog

Every deploy to https://emmas-games.vendic.cloud gets a new version here, at the top. The picture menu and the games
show the newest version, bottom right. `scripts/deploy.sh` refuses to deploy a version that was deployed before.

- **Major:** a new game.
- **Minor:** new levels or features in an existing game, or in the menu.
- **Patch:** bug fixes.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
