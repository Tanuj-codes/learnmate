# LearnMate

[![CI](https://github.com/Tanuj-codes/learnmate.github/actions/workflows/ci.yml/badge.svg)](https://github.com/Tanuj-codes/learnmate.github/actions/workflows/ci.yml)

A gamified learning and accountability platform. Learners work through short courses, prove understanding in **server-scored** quizzes, review flashcards, play verified mini-games, keep a daily XP goal, unlock achievements, and compete on a transparent knowledge leaderboard.

Everything that affects XP, scores, streaks, badges, or rankings is calculated on the server. The browser only sends answers and pairings; it never sends a score.

**Repository:** <https://github.com/Tanuj-codes/learnmate.github>

```bash
git clone https://github.com/Tanuj-codes/learnmate.github.git
cd learnmate.github
```

---

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite 6, React Router 6, Tailwind CSS 3, Recharts 2, plain JavaScript |
| Backend | Node.js 20, Express 4, PostgreSQL, Prisma 6 |
| Auth | JWT in an HttpOnly cookie + signed double-submit CSRF token, bcrypt password hashing, server-side RBAC |
| Validation | Zod schemas on every write endpoint |
| Tests | Vitest + Supertest (server), Vitest (client) |
| Tooling | npm workspaces, concurrently, nodemon, embedded PostgreSQL for local dev |

No TypeScript, Next.js, MongoDB, or Firebase is used.

---

## Features

### Learning
- **Landing page** with product story, feature grid, and demo credentials.
- **Dashboard** with level progress, XP today, current/best streak, cards due, continue-learning card, weekly XP chart, recent achievements, and activity.
- **My Courses** with search, level/topic filters, enrolled/discover tabs, enrollment, progress, and resume links.
- **Course detail** with curriculum, per-lesson completion, quizzes, and flashcard counts.
- **Lesson reader** with markdown content and verified "+10 XP" completion (awarded once per lesson).
- **Learn & Practice** hub that recommends the next best action.
- **Quizzes** with a question bank, random served sets, countdown timer, question map, review screen, server grading, and a results page with per-question explanations.
- **Flashcards** with spaced-repetition scheduling (again/hard/good/easy), due queues, and XP capped per day.
- **Mini-games**: Match the Pairs and a 60-second Timed Knowledge Challenge. Sessions are created on the server with hidden state, then re-verified on submit.
- **Leaderboard** ranked by a configurable formula: **70% performance + 20% improvement + 10% consistency**. Missing assessment history scores zero, never a perfect score.
- **Accountability** with daily goal editing, goal history, streak calendar, and weekly target.
- **Achievements** with 12 badges across lesson, quiz, streak, goal, XP, flashcard, and game milestones.
- **Analytics** with XP trend, category breakdown, quiz score history, and consistency.
- **Profile & Settings** with name, timezone, avatar colour, theme, daily/weekly goals, email notifications, password change, and XP ledger.
- **Admin console** (ADMIN role only) with platform stats, learner directory, and role management.
- **Auth** pages for register/login plus a 404 and error page.
- **Polish**: responsive deep-navy/charcoal shell with indigo/violet accents, light and dark themes, skeleton loaders, empty states, toasts, inline errors, and keyboard-accessible controls.

### Integrity rules
- Quiz answers are served **without** `correctIndex`; grading happens against stored questions.
- Only questions actually served in the attempt are accepted on submit.
- Quiz XP is awarded **at most once per quiz per user per local day**; retakes can improve the score without farming XP.
- Game sessions store hidden mappings and are re-verified (matches, duration, time window) before XP.
- Every reward writes to an append-only `XPTransaction` ledger with a unique `idempotencyKey`.
- Daily-goal XP progress excludes the goal-completion bonus, so goals never inflate themselves.
- All reward finalization (achievements → goal bonus → achievement re-check) happens inside the write request that earned it. Read-only pages cannot create XP or unlock badges.
- Leaderboard history windows and weights are server-side configuration; the client only renders the returned policy.
- Per-user timezones drive "today", streaks, and daily caps.
- Enrollment is required to view a course leaderboard, take its quizzes, or play its games.
- Admin routes are protected in the UI and re-checked by server middleware.

### XP rules (defaults, all configurable)
| Action | XP |
| --- | --- |
| Complete a lesson | 10 (once) |
| Submit a quiz | 5 + 2 per correct answer (once per quiz per day) |
| Review a flashcard | 2 (12h cooldown, 10/day cap) |
| Strong mini-game (≥60%) | 8 (3/day cap) |
| Complete the daily goal | 10 (once per day) |
| Unlock an achievement | badge value (once) |

Levels are linear: **250 XP per level**, level 1 starts at 0 XP.

---

## Project structure

```
.
├── client/                     React + Vite frontend
│   ├── src/
│   │   ├── charts/             Recharts wrappers
│   │   ├── components/         UI kit, layout, auth form, guards, course cards
│   │   ├── context/            Auth, theme, toast providers
│   │   ├── hooks/              useAsync data hook
│   │   ├── layouts/            Authenticated app shell (sidebar + topbar)
│   │   ├── pages/              All 20+ route pages
│   │   ├── services/api.js     Fetch wrapper, CSRF header, typed-ish ApiError
│   │   ├── utils/              Formatting, level curve, class names, tests
│   │   ├── App.jsx             Route table
│   │   └── main.jsx            Providers + router
│   └── vite.config.js          Dev server + `/api` proxy to port 4000
├── server/                     Express + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma       19 models / 9 enums
│   │   ├── migrations/         Initial SQL migration
│   │   └── seed.js             Idempotent demo data + demo accounts
│   ├── scripts/dev-postgres.js Embedded PostgreSQL for local dev
│   ├── src/
│   │   ├── config/             Env schema, Prisma client
│   │   ├── controllers/        Thin HTTP layer
│   │   ├── middleware/         Auth, CSRF, validation, errors, rate limits
│   │   ├── routes/             Versioned API routers
│   │   ├── services/           Auth, XP, goals, quizzes, games, leaderboard, analytics, achievements, notifications
│   │   ├── utils/              Dates/timezones, tokens, errors, serializers, level
│   │   ├── app.js              Express app
│   │   └── server.js           HTTP server + graceful shutdown
│   └── test/                   Vitest + Supertest suite against `learnmate_test`
├── .env.example                Every supported variable
├── package.json                Workspace scripts
└── README.md
```

### Data model (Prisma)
`User`, `Course`, `Topic`, `Lesson`, `Enrollment`, `LessonProgress`, `Quiz`, `Question`, `QuizAttempt`, `QuizAnswer`, `Flashcard`, `FlashcardReview`, `DailyGoal`, `XPTransaction`, `Achievement`, `UserAchievement`, `StudyPartner`, `GameSession`, `Notification`.

---

## Getting started

### Prerequisites
- Node.js **20.11+** (verified on 20.18.0)
- npm **10+**
- PostgreSQL **14+** (or use the bundled embedded PostgreSQL for local development)

### 1. Install
```bash
npm install
```

### 2. Configure
```bash
cp .env.example server/.env
```
On Windows PowerShell:
```powershell
Copy-Item .env.example server/.env
```
Then edit `server/.env`:
- Keep `DATABASE_URL` for the embedded database: `postgresql://learnmate:learnmate@127.0.0.1:55432/learnmate?schema=public`
- Or point it at your own PostgreSQL instance.
- Replace `JWT_SECRET` with at least 32 random characters:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```

Only `DATABASE_URL` and `JWT_SECRET` are required; every other variable has a safe default.

### 3. Start PostgreSQL

**Option A — embedded (no install required, port 55432):**
```bash
npm run dev:db
```
Keep this terminal open. Data persists in `server/.pgdata`.

**Option B — your own PostgreSQL:**
Create a database and user matching `DATABASE_URL`.

### 4. Migrate and seed
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```
`db:seed` is idempotent: running it again does not duplicate users, courses, lessons, questions, achievements, or XP transactions.

To start over from scratch:
```bash
npm run db:reset     # drops, re-applies migrations, then seeds
```

### 5. Run the app
```bash
npm run dev
```
- Frontend: <http://localhost:5173>
- API: <http://localhost:4000/api/v1/health>

Vite proxies `/api` to port 4000, so cookies and CSRF work on one origin during development.

### Demo accounts
| Role | Email | Password |
| --- | --- | --- |
| Student (rich demo data) | `demo@learnmate.dev` | `Demo1234!` |
| Admin | `admin@learnmate.dev` | `Admin1234!` |
| Student | `maya@learnmate.dev` | `Maya1234!` |
| Student | `leo@learnmate.dev` | `Leo12345!` |

---

## Environment variables

All variables are validated at boot by Zod; the server exits with a readable message if configuration is invalid.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development` / `test` / `production` |
| `PORT` | `4000` | API port |
| `DATABASE_URL` | — (required) | PostgreSQL connection string |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed CORS origin(s), comma-separated |
| `TRUST_PROXY` | `false` | Set `true` behind Render/Vercel proxies |
| `JWT_SECRET` | — (required, 32+ chars) | Signs access and CSRF tokens |
| `JWT_EXPIRES_IN` | `7d` | Access token lifetime |
| `BCRYPT_ROUNDS` | `12` | Password hashing cost (10–15) |
| `COOKIE_SECURE` | `false` | Force `Secure` cookies outside production |
| `XP_LESSON_COMPLETE` | `10` | Lesson reward |
| `XP_QUIZ_COMPLETE` | `5` | Quiz completion reward |
| `XP_PER_CORRECT_ANSWER` | `2` | Per correct quiz answer |
| `XP_FLASHCARD_REVIEW` | `2` | Flashcard reward |
| `XP_FLASHCARD_DAILY_CAP` | `10` | Flashcard XP per day |
| `XP_GAME_COMPLETE` | `8` | Mini-game reward |
| `XP_DAILY_GOAL` | `10` | Goal completion bonus |
| `FLASHCARD_REVIEW_COOLDOWN_HOURS` | `12` | Cooldown per card |
| `LEADERBOARD_WEIGHT_PERFORMANCE` | `0.70` | Performance weight |
| `LEADERBOARD_WEIGHT_IMPROVEMENT` | `0.20` | Improvement weight |
| `LEADERBOARD_WEIGHT_CONSISTENCY` | `0.10` | Consistency weight |
| `LEADERBOARD_WINDOW_DAYS` | `30` | History window |
| `LEADERBOARD_IMPROVEMENT_SCALE` | `5` | Score-point gain that maps to 100 improvement |
| `EMAIL_ENABLED` | `false` | Opt-in email reminders |
| `EMAIL_PROVIDER` | `smtp` | `smtp` or `resend` |
| `EMAIL_FROM` | local address | From header |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | — | SMTP settings |
| `RESEND_API_KEY` | — | Resend API key |

The three leaderboard weights must sum to `1.0`; the server refuses to start otherwise.

Client-side variable (optional, `client/.env`):
| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `/api/v1` | Absolute API URL when the client is deployed separately |

---

## Scripts

Root:
```bash
npm run dev        # API + Vite with live reload
npm run dev:db     # embedded PostgreSQL on 55432
npm run build      # production client build -> client/dist
npm run start      # production API
npm test           # server suite, then client suite
npm run test:server
npm run test:client
npm run db:generate
npm run db:migrate       # prisma migrate deploy
npm run db:migrate:dev   # prisma migrate dev
npm run db:seed
npm run db:reset
npm run setup            # install + generate + migrate + seed
```

Server-only:
```bash
npm run dev -w server
npm run db:reset -w server
```

---

## Tests

```bash
npm test
```

- Server: Vitest + Supertest against a separate `learnmate_test` database. Global setup creates the database and applies migrations automatically; every test truncates tables.
- Covered: registration/login/cookies, signed CSRF enforcement, RBAC, quiz grading, hidden correct answers, tampered question rejection, enrollment gating, once-per-day quiz XP, daily-goal bonus regression, goal finalization inside the action that crosses the target, read-only pages never awarding XP, leaderboard weights/missing history, and the level curve.
- Client: Vitest unit tests for the level curve, formatting helpers, percentages, and greeting logic.
- Expected totals: **server 13 tests / 6 files**, **client 6 tests / 1 file**.

Heads-up: Prisma prints a deprecation warning about `package.json#prisma` and Vite prints a >500 kB chunk warning. Neither is a failure; both are warnings only.

---

## Production build

```bash
npm run build
npm run start
```
The client is a static SPA in `client/dist`; the API boots on `PORT` and connects to `DATABASE_URL`.

Before first production boot:
```bash
npm run db:migrate    # prisma migrate deploy
npm run db:seed       # optional: demo content and accounts
```

### Deployment (Render + Vercel + Neon)

1. **Database — Neon**
   - Create a PostgreSQL project and copy the pooled connection string.
   - Set `DATABASE_URL` on the API service (add `?sslmode=require` if not present).
   - Run migrations once from CI or a shell: `npx prisma migrate deploy` inside `server/`.

2. **API — Render (Web Service)**
   - Root directory: `server` (or repository root with `npm run start -w server`).
   - Build command: `npm install && npm run db:generate`
   - Start command: `npm run start`
   - Health check path: `/api/v1/health`
   - Environment:
     ```
     NODE_ENV=production
     DATABASE_URL=<neon connection string>
     JWT_SECRET=<48-byte random secret>
     CLIENT_ORIGIN=https://your-app.vercel.app
     TRUST_PROXY=true
     COOKIE_SECURE=true
     ```
   - In production the API sets `Secure` + `SameSite=None` cookies so a separately hosted SPA can authenticate.

3. **Frontend — Vercel**
   - Root directory: `client`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Environment: `VITE_API_URL=https://your-api.onrender.com/api/v1`
   - Add a SPA rewrite so every route serves `index.html`:
     ```json
     { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
     ```

4. **Post-deploy checks**
   - `GET https://your-api.onrender.com/api/v1/health` returns `database: "connected"`.
   - Sign in, complete a lesson, submit a quiz, and confirm XP increases once.
   - Run the seed only if you want demo data in production.

---

## Security notes

- Passwords are hashed with bcrypt (cost 12 by default) and never returned by the API.
- Access tokens live in `HttpOnly`, `SameSite` cookies; JavaScript cannot read them.
- CSRF uses a signed double-submit token bound to the authenticated user.
- Rate limits: 20 auth attempts / 15 min, 600 API requests / 15 min, 30 reward submissions / min, 10 email requests / hour.
- Helmet security headers, strict CORS allow-list, Zod validation, and centralized error handling (no stack traces in production).
- No score, XP amount, streak, or rank is accepted from the client.

---

## Troubleshooting

**"Cannot reach the LearnMate API"** — start the API (`npm run dev`) or `npm run start`; check port 4000 and the Vite proxy.

**Database connection refused** — start PostgreSQL (`npm run dev:db` for embedded) and confirm the port in `DATABASE_URL` (embedded uses `55432`).

**"Invalid server environment configuration"** — `DATABASE_URL` is missing or `JWT_SECRET` is shorter than 32 characters.

**"CSRF_MISSING" / "CSRF_INVALID"** — sign in again to refresh the CSRF cookie; the double-submit header must match the signed `lm_csrf` cookie.

**Seed changes totals** — the seed rolls daily goals relative to *today* per user timezone. Re-running on a later day intentionally adds that day's demo activity; it never duplicates rows for the same day.

**"The app changes on its own"** — there is no polling, auto-navigation, background reward loop, or XP awarded by page loads. The only timers are the quiz countdown and game clock. XP, badges, and goal bonuses are finalized inside the write request that earned them, and each reward is idempotent. If a page reloads while you edit files, it is Vite HMR in development; if the browser appears to click around by itself, check for an open automation/devtools session.
