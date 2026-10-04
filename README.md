# Krida (क्रीडा) — Sanskrit Games

**Play, learn, grow.** An open-source hub of interactive Sanskrit games for learning Sanskrit through play, built by [The Sanskrit Channel](https://www.youtube.com/@TheSanskritChannel).

Krida hosts multiple Sanskrit games under one roof — pick a game, pick a puzzle, and play in the script you are most comfortable reading.

## 🎮 Games

### पदावली (Padāvalī) — Sanskrit Word Search

Find hidden Sanskrit words in a grid of letters by clicking and dragging across them.

- Drag across adjacent letters (including diagonals) to select a word
- Practice / no-hint modes, hints, and per-puzzle word lists
- Live timer, accuracy and attempt tracking

### पदाजाल (Padajāla) — Sanskrit Crossword

Solve Sanskrit crossword grids with across and down clues.

- Prefilled hint cells, letter inputs and incorrect-attempt tracking
- Clue navigation and completion stats

## ✨ Features

- **Multi-Script Support** — play any puzzle in **16 scripts**, switchable at any time with real-time transliteration:
  - Main: Devanagari (देवनागरी), Telugu (తెలుగు), Kannada (ಕನ್ನಡ), Gujarati (ગુજરાતી), Bengali (বাংলা), Odia (ଓଡ଼ିଆ), Malayalam (മലയാളം), Tamil (தமிழ்), Assamese (অসমীয়া), Gurumukhi (ਗੁਰਮੁਖੀ), Sinhala (සිංහල), Romanized
  - Ancient: Brahmi (𑀩𑁆𑀭𑁍𑀫), Siddham (𑖭𑖿𑖨𑖱𑖾), Grantha (𑌅𑌗𑍍𑌰𑍍), Sharada (𑆳𑆫𑆢𑆳)
- **Daily & Scheduled Puzzles** — new puzzles go live on a schedule, with reminders
- **Explore** — browse every listed puzzle, topic and tag across both games
- **Collections** — curated, ordered sets of puzzles that can mix both games
- **AI-Generated Art** — puzzle cards and collection covers are illustrated with AI (prompt written for a centred, 3:2 landscape composition)
- **Player Dashboard** — sign in to track your own starts, completions, best time/accuracy and recent plays
- **Modern UI** — responsive, mobile-first, with dark theme support
- **Progressive Web App** — install Krida and play straight from the home screen
- **Open Source** — MIT licensed

## 🔗 Links

- Sanskrit Channel projects: [projects.thesanskritchannel.org](http://projects.thesanskritchannel.org/)
- YouTube: [@TheSanskritChannel](https://www.youtube.com/@TheSanskritChannel)
- Instagram: [@thesanskritchannel](https://www.instagram.com/thesanskritchannel/)
- More projects: [Lipi Lekhika](https://lipilekhika.in) · [Svara Darshini](https://svara.thesanskritchannel.org/)

## 🛠️ Stack

- **Framework**: TanStack Start (React 19, SSR, file-based routing)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **API**: tRPC (type-safe, end-to-end)
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Auth**: Better Auth (Google sign-in)
- **Server effects**: [Effect](https://effect.website) for database / AI / storage layers
- **Transliteration**: `lipilekhika`
- **AI**: OpenAI image generation + OpenRouter for prompt generation
- **Storage**: S3 + CloudFront
- **Deployment**: Vercel (Nitro)

[Technical Details](./TechnicalDetails.md)

## 📄 License

MIT — see [LICENSE](./LICENSE).
