# Technical Details

## 🚀 Tech Stack

- **Framework**: TanStack Start — React 19, SSR, file-based routing (TanStack Router)
- **Data fetching**: TanStack Query + tRPC v11 (type-safe end-to-end, SuperJSON transformer)
- **Styling**: Tailwind CSS v4 + shadcn/ui (Base UI primitives)
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Server layer**: [Effect](https://effect.website) — `dbRunHttp` / storage / AI access are modelled as Effect services with typed errors
- **Auth**: Better Auth (Google sign-in)
- **Client state**: Jotai
- **Transliteration**: [`lipilekhika`](https://lipilekhika.in)
- **AI**: OpenAI image generation for puzzle/collection art, OpenRouter for prompt + metadata generation
- **Storage**: S3 (assets) + CloudFront (delivery)
- **Scheduling**: QStash (listing schedules, notifications)
- **Analytics**: PostHog
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Deployment**: Vercel (Nitro)

## 🎮 How to Play

### Padāvalī — word search

1. **Find the hidden word** in the letter grid
2. **Click & drag** across adjacent letters (including diagonals) to select it
3. **Submit** — correct words lock into the grid
4. **Complete** every word to finish the puzzle, then compare times and accuracy

### Padajāla — crossword

1. **Read the clues** for the across and down entries
2. **Type letters** into empty cells; some cells are prefilled as hints
3. **Cross-check** — shared letters confirm your answers
4. **Complete** the grid to finish, then compare times and accuracy

## 🌐 Multi-Script Support

Krida uses the `lipilekhika` transliteration engine to convert Sanskrit text between Indian scripts in real time, which means:

- The **same puzzle** can be played in 16 scripts (12 modern + 4 ancient: Brahmi, Siddham, Grantha, Sharada)
- Switching scripts is instant and keeps the puzzle state intact
- Players can read Sanskrit in the script they are most comfortable with, and see how the same word is written elsewhere

## 🗂️ Content model

- **Puzzles** live in per-game tables (`padavali_puzzles`, `crossword_puzzles`) and can be **listed** publicly on a schedule
- **Collections** are curated, ordered sets of puzzles that can mix both games
- **Tags** are shared labels used for grouping in the puzzle catalog
- **Sessions** record every play attempt (game, script, location, signed-in user) and **gameplay stats** record completions (time taken, accuracy, attempts)
- Images are AI-generated at `1536x1024` and stored as WebP at `768x512` (3:2 landscape), with per-asset `width`/`height` recorded in `image_assets`
