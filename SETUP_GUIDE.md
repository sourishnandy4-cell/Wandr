## 🚀 Complete Setup Guide

## Quick Start (No Backend Required)

The app works out of the box with localStorage - no database setup needed!

```bash
npm install
npm run dev
```

Open http://localhost:3000 and start creating trips!

---

## Full Stack Setup (With Supabase Backend)

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new project (choose a name, password, region)
4. Wait for project to be ready (~2 minutes)

### Step 2: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Create a new query
3. Copy and paste the contents of `database/schema.sql`
4. Click **Run**
5. Repeat for `database/rls_policies.sql`
6. (Optional) Run `database/seed.sql` for sample data

### Step 3: Get API Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy your **Project URL**
3. Copy your **anon/public** key

### Step 4: Configure Environment

1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```

2. Edit `.env` and add your credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. Restart the dev server:
   ```bash
   npm run dev
   ```

### Step 5: Enable Authentication (Optional)

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates if desired

---

## Architecture Overview

### Frontend (Person A)
- React 18 + Vite
- Tailwind CSS for styling
- Recharts for data visualization
- Lucide React for icons

### Database (Person B)
- PostgreSQL via Supabase
- Row Level Security (RLS) policies
- Automatic timestamps and triggers

### API Layer (Person C)
- Supabase client for data fetching
- Service layer pattern
- Automatic fallback to localStorage

---

## Project Structure

```
group-travel-planner/
├── src/
│   ├── components/          # UI components
│   ├── lib/                 # API services
│   │   ├── supabaseClient.js
│   │   ├── itineraryService.js
│   │   ├── expenseService.js
│   │   └── balanceCalculator.js
│   ├── mockData/            # Mock data (deprecated)
│   └── App.jsx              # Main app
│
├── database/                # SQL files
│   ├── schema.sql
│   ├── rls_policies.sql
│   └── seed.sql
│
└── [config files]
```

---

## Features

### ✅ Implemented
- Create and edit trips
- Add activities to itinerary
- Track expenses by category
- View budget breakdown
- Recent expenses list
- Responsive design
- LocalStorage persistence
- Supabase integration
- Row-level security

### 🚧 Future Enhancements
- User authentication
- Multi-user collaboration
- Real-time updates
- Balance settlement tracking
- File attachments
- Map integration
- Mobile app

---

## Development

### Available Scripts

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Testing

1. **Without Backend:**
   - Just run `npm run dev`
   - Data saves to browser localStorage
   - Perfect for frontend development

2. **With Backend:**
   - Set up Supabase (see above)
   - Configure `.env` file
   - Run `npm run dev`
   - Data saves to PostgreSQL database

---

## Troubleshooting

### App shows "Create New Trip" every time
- Check if localStorage is enabled in your browser
- Try a different browser
- Check browser console for errors

### Supabase connection errors
- Verify `.env` file has correct credentials
- Check Supabase project is active
- Verify RLS policies are set up correctly
- Check browser console for specific errors

### Build errors
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Clear browser cache

---

## Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy!

### Deploy to Netlify

1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Import your repository
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Add environment variables
7. Deploy!

---

## Contributing

This project was built as a 3-person collaborative exercise:

- **Person A**: Frontend components and UI
- **Person B**: Database schema and security
- **Person C**: API services and integration

All three roles are now complete and integrated!

---

## License

MIT License - feel free to use this project for learning or production!

---

## Support

For issues or questions:
1. Check this guide first
2. Review the code comments
3. Check Supabase documentation
4. Open an issue on GitHub
