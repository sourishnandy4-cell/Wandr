# ✈️ Wandr – Group Travel Planner

> Plan, collaborate, and settle travel expenses beautifully.

**Live demo →** [sourishnandy4-cell.github.io/trip-planner](https://sourishnandy4-cell.github.io/trip-planner/)

---

## ✨ Features

| Feature | Description |
|---|---|
| **Dashboard** | Live overview of itinerary, budget pie-chart, recent expenses, and balance sheet |
| **Itinerary Timeline** | Day-by-day activity planner with category icons and location notes |
| **Expense Tracker** | Log expenses by category, split them across group members |
| **Balance Sheet** | Automatic debt-simplification — who owes whom and how much |
| **Travel Docs** | Store flight, hotel, and visa links in one place |
| **Finance AI** | Gemini-powered chatbot that reads your live trip data and gives budget advice |
| **Multi-trip** | Create and switch between unlimited trips; delete when done |
| **Offline Mode** | Fully functional without a Supabase account — uses localStorage mock data |

---

## 🚀 Quick Start (Local Dev)

```bash
# 1. Clone
git clone https://github.com/sourishnandy4-cell/trip-planner.git
cd trip-planner

# 2. Install
npm install

# 3. (Optional) Connect Supabase — see .env.example
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 4. Run
npm run dev
# → http://localhost:3000
```

No Supabase account? Skip step 3. The app auto-detects and falls back to a full offline mock mode with seeded Barcelona demo data.

---

## 🗄️ Database Setup (Supabase)

1. Create a free project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor** and run in order:
   - `database/schema.sql`
   - `database/rls_policies.sql`
   - `database/seed.sql` *(optional – loads Barcelona demo data)*
3. Copy **Project URL** and **anon key** into `.env`

---

## 🤖 Finance AI Setup

The AI tab uses Google Gemini Flash (free tier). To enable it:

1. Get a free API key at [aistudio.google.com](https://aistudio.google.com)
2. Paste the key into the **Finance AI** tab inside the app — it's stored locally in your browser

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18 + Tailwind CSS 3 |
| Icons | Lucide React |
| Charts | Recharts |
| Backend / Auth | Supabase (PostgreSQL + Row-Level Security) |
| AI | Google Gemini Flash API (client-side) |
| Build | Vite 5 |
| Deploy | GitHub Pages via GitHub Actions |

---

## 📁 Project Structure

```
src/
├── components/       # All React UI components
│   ├── Login.jsx
│   ├── Sidebar.jsx
│   ├── Header.jsx
│   ├── ItineraryTimeline.jsx
│   ├── BudgetPieChart.jsx
│   ├── RecentExpenses.jsx
│   ├── BalanceSheet.jsx
│   ├── TravelDocs.jsx
│   ├── FinanceAI.jsx
│   └── ProfileModal.jsx
├── lib/              # Data services and utilities
│   ├── supabaseClient.js   # Supabase init + mock-mode detection
│   ├── mockDatabase.js     # Offline localStorage data layer
│   ├── itineraryService.js
│   ├── expenseService.js
│   └── balanceCalculator.js
└── App.jsx           # Root component + routing logic

database/
├── schema.sql        # Table definitions
├── rls_policies.sql  # Row-level security rules
└── seed.sql          # Demo Barcelona data
```

---

## 🚢 Deployment (GitHub Pages)

The app auto-deploys on every push to `main` via `.github/workflows/deploy.yml`.

### First-time setup

1. Go to **GitHub → repo → Settings → Secrets and variables → Actions**
2. Add two repository secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Go to **Settings → Pages** and set *Source* to the `gh-pages` branch

If you leave the secrets empty, the live site runs in offline mock mode automatically.

---

## 🧑‍💻 Contributing

```bash
# Work on a feature branch
git checkout -b feature/your-feature
git push origin feature/your-feature
# Open a PR → main
```

---

## 📄 License

MIT — free to fork and use for personal or commercial projects.
