# Agents

Learning games for Emma, a 6-year-old who is learning to read English and do basic maths.

Read these first:

- [PERSONA.md](PERSONA.md): who Emma is and what she likes.
- [GOAL.md](GOAL.md): what she must learn and how we work.
- [IDEAS.md](IDEAS.md): the index of game ideas and their status.
- [STACK.md](STACK.md): languages, iPad target, testing, sound and deployment.
- [VOICES.md](VOICES.md): the ElevenLabs voice for each character and the voice rules.

## Rules

- The learning is hidden in the game. No quizzes, memory cards or questionnaires. Reading and maths are the way to make progress in a real game.
- Emma cannot read instructions yet. Everything she must understand is spoken and shown with pictures.
- Build for iPad touch first. Test every mockup with `playwright-cli` at iPad resolution (see STACK.md) before calling it done.
- Every idea lives in `ideas/<idea-slug>/` with a `README.md` and an `index.html` mockup. Add each new idea to the table in IDEAS.md.
- Speech uses ElevenLabs. Elizabeth is the narrator and the only voice for letter sounds and words Emma learns from. Characters use the voices in VOICES.md. Never use browser speech as the voice Emma hears. Generate audio ahead of time. Never put the API key in client code or in git.
- The ElevenLabs API key is `ELEVENLABS_API` in `.env`. Agents never read, print, source or copy `.env`. Scripts that need the key load `.env` themselves (for example Node's `process.loadEnvFile()`), so the command that runs them does not mention `.env`. This is enforced: `.claude/settings.json` denies the file to Claude Code and `.codex/config.toml` denies it to Codex.
- Use our own characters. No trademarked characters (for example, real Furbies or Disney princesses).
- The app is fully British English. There is no Dutch anywhere in the app: no Dutch words, text, audio, names spoken the Dutch way or Dutch help. Emma's Dutch background only decides which English sounds and words get extra practice.
- Code, comments, docs and commit messages are in English.
