# QuizForge Prototype

## Overview
QuizForge is a quiz generation app that uses xAI Grok to create quizzes from uploaded learning files. Users upload documents (PDF, DOCX, etc.), select quiz type and question count, and the app generates interactive quizzes with scoring.

## Project Architecture
- **Monorepo** with two packages:
  - `server/` - Express + TypeScript backend (port 3001 in dev)
  - `web/` - Vite + TypeScript frontend (port 5000 in dev)
- Root `package.json` uses `concurrently` to run both in dev mode
- Vite proxies `/api` requests to the backend server

## Key Dependencies
- Backend: Express, OpenAI SDK (for xAI), multer (file uploads), pdf-parse, mammoth, zod
- Frontend: Vite, KaTeX (math rendering), Prism.js (code highlighting)

## Environment Variables
- `XAI_API_KEY` - Required. xAI API key for Grok quiz generation
- `XAI_MODEL` - Optional. Model name (default: grok-4)
- `XAI_KEEP_FILES` - Optional. Whether to keep uploaded files on xAI (default: false)
- `PORT` - Server port (default: 3001)

## Development Setup
- `npm run dev` starts both server and frontend concurrently
- Frontend: Vite dev server on port 5000 (0.0.0.0, all hosts allowed)
- Backend: Express on port 3001 (localhost)
- Vite proxies `/api/*` to backend

## Production
- Build: `npm run build` (compiles both server TS and Vite frontend)
- Start: `node server/dist/index.js` (serves API + static frontend)
- Server binds to `PORT` env var (set to 5000 for Replit deployment)
