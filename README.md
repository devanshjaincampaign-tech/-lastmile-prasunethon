# LastMile — Vernacular AI Doubt Solver

A doubt-solving platform for Tier 3–5 India, built around shared, evening-use
household devices instead of assuming personal smartphone access. Built for
Prasunethon 2.0 by Team Pudgala Matrix.

## How it works

1. **Capture** — a student types a doubt (Hinglish is fine) or photographs a
   handwritten problem. It's queued instantly — no AI call happens yet.
2. **Batch-solve** — one tap on "Solve My Doubts" resolves everything pending
   in a single session, via Google Gemini's multimodal API.
3. **Register-matched answers** — explanations preserve the student's own
   phrasing (natural Hinglish stays Hinglish) instead of formal textbook
   English, with a "Simplify Further" option per answer.
4. **Classroom Mode** — one shared device can tag doubts by student name and
   serve a whole classroom from a single queue, no individual logins.

## Tech stack

- **Frontend:** React (Vite) + Tailwind CSS
- **Backend:** Node.js + Express (thin relay — keeps the Gemini key server-side)
- **AI:** Google Gemini API (free tier, no card required)
- **Auth / DB / Storage:** Firebase (Anonymous Auth, Firestore, Storage)

---

## Setup (local development)

You'll need two free accounts before running this: **Google AI Studio**
(for Gemini) and **Firebase** (for auth/database/storage). Both are free,
no credit card required.

### 1. Get a Gemini API key

1. Go to https://aistudio.google.com/apikey
2. Sign in with a Google account, click "Create API key"
3. Copy the key — you'll need it in step 3

### 2. Create a Firebase project

1. Go to https://console.firebase.google.com and click "Add project"
2. Once created, go to **Build → Authentication → Sign-in method** and enable
   **Anonymous** sign-in
3. Go to **Build → Firestore Database → Create database** — start in
   **test mode** (fine for a hackathon demo; tighten rules before any real
   production use)
4. Go to **Build → Storage → Get started** — also start in test mode
5. Go to **Project settings** (gear icon) → scroll to "Your apps" → click
   the **Web** icon (`</>`) to register a web app → copy the config values
   shown (apiKey, authDomain, projectId, etc.)

### 3. Configure the backend

```bash
cd backend
cp .env.example .env
# Open .env and paste your Gemini API key into GEMINI_API_KEY
npm install
npm run dev
```

The backend runs at `http://localhost:5000`. Visit
`http://localhost:5000/api/health` in a browser — you should see
`{"status":"ok",...}`.

### 4. Configure the frontend

```bash
cd frontend
cp .env.example .env
# Open .env and paste in your Firebase config values from step 2
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`. Open it, and you should see
the LastMile interface. Try adding a text doubt and tapping "Solve My Doubts".

### If something doesn't work

- **"Could not connect to Firebase"** on screen → double check your `.env`
  values in `frontend/.env` match the Firebase console exactly, and that
  Anonymous auth is enabled.
- **Solve button fails / network error** → make sure the backend is running
  (`npm run dev` in `backend/`) and `VITE_API_BASE_URL` in `frontend/.env`
  points to it.
- **Gemini returns a 404 for the model** → Google's model names change
  fast. Go to https://aistudio.google.com/, check the current free Flash
  model name under "Models", and update `GEMINI_MODEL` in `backend/.env`.

---

## Deployment (for your Round 2 live demo link)

### Backend → Render

1. Push this repo to GitHub
2. Go to https://render.com → New → Web Service → connect your repo
3. Root directory: `backend`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variables (`GEMINI_API_KEY`, `GEMINI_MODEL`,
   `ALLOWED_ORIGINS` — set this to your Vercel URL once you have it)
7. Deploy — note the resulting URL (e.g. `https://lastmile-backend.onrender.com`)

### Frontend → Vercel

1. Go to https://vercel.com → New Project → import the same repo
2. Root directory: `frontend`
3. Framework preset: Vite (should auto-detect)
4. Add environment variables (all the `VITE_FIREBASE_*` values, plus
   `VITE_API_BASE_URL` set to your Render backend URL from above)
5. Deploy

Once both are live, go back to your Render backend's environment variables
and update `ALLOWED_ORIGINS` to include your actual Vercel URL, then
redeploy the backend so CORS allows requests from your live frontend.

---

## Project structure

```
lastmile_project/
├── backend/
│   ├── server.js          # Express app, /api/solve and /api/simplify routes
│   ├── geminiService.js   # Gemini prompt design + API calls
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Main app logic
│   │   ├── components/
│   │   │   ├── DoubtCapture.jsx       # Text/photo input form
│   │   │   └── AnswerCard.jsx         # Renders one doubt/answer
│   │   └── lib/
│   │       ├── firebase.js            # Firebase init + anonymous auth
│   │       ├── doubtsStore.js         # Firestore read/write functions
│   │       └── api.js                 # Calls to the backend
│   └── .env.example
└── assets/
    └── prasunet_logo_transparent.png  # For use in the pitch deck
```

## Known limitations (MVP scope, honest about what's not built)

- No offline queueing (PWA/service worker) — requires an active connection
  to add or solve doubts, though the *batching* pattern still matches real
  shared-device usage.
- No voice input — text and photo only for this round.
- Firestore/Storage security rules are left permissive ("test mode") for
  demo speed — would need proper rules before any real deployment.
- Sequential (not parallel) Gemini calls when solving a batch, to stay
  safely within free-tier rate limits — a batch of 5 doubts takes a few
  seconds longer than if parallelized, but it's more demo-reliable.
