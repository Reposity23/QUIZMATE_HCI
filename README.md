# QuizForge Prototype

Production-ready single-service Node.js app for generating quizzes from uploaded learning files using xAI Grok (Files API + Responses API).

## Features
- Upload up to **10 files** per request, **20MB max per file**.
- Quiz types: `mcq`, `fill_blank`, `identification`, `matching`, `mixed`.
- Question count presets (5/10/20/30/50/100) + custom (max 100).
- Optional difficulty (`easy`, `medium`, `hard`).
- Backend local text extraction + SOURCE PACK fallback.
- xAI Files API upload + optional deletion cleanup (`XAI_KEEP_FILES=false` by default).
- xAI Responses API generation with strict JSON constraints and Zod validation.
- Frontend quiz taking, scoring, result breakdown, answer/explanation toggles.
- Math rendering with KaTeX and code rendering with Prism.
- Debug panel for raw output, schema issues, source pack preview/length, and xAI file IDs.

## Project structure
- `server/` Express + TypeScript backend
- `web/` Vite + TypeScript frontend
- Root scripts orchestrate local dev and production build/start

## Local development
1. Install dependencies:
   ```bash
   npm install
   npm install --prefix server
   npm install --prefix web
   ```
2. Configure xAI key:
   - Copy `server/src/config.example.ts` to `server/src/config.ts`
   - Set `export const XAI_API_KEY = "...";`
   - Do **not** commit `config.ts`.
3. Run app:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:5173`.

## Production (any Node host)
1. Install dependencies:
   ```bash
   npm install
   npm install --prefix server
   npm install --prefix web
   ```
2. Set environment variables (at minimum):
   - `XAI_API_KEY=...`
   - Optional: `XAI_MODEL=grok-4`
   - Optional: `XAI_KEEP_FILES=false`
3. Build and start:
   ```bash
   npm run build
   npm start
   ```
4. Verify health endpoint:
   - `GET /api/health`

## Deploy notes (Railway / Render / Fly.io / Replit / VPS)
- Use standard Node build/start commands:
  - Build: `npm run build`
  - Start: `npm start`
- Set `XAI_API_KEY` in host environment settings.
- App listens on `process.env.PORT`.

## Limits & behavior
- Max 10 files per request.
- Max 20MB per file.
- Image OCR is optional and not enabled in this prototype.
- Grok may reduce `question_count` if source content is insufficient.
- If file attachment retrieval is unreliable for some formats, generation still works using SOURCE PACK extraction.
