# 🔐 Supabase Setup Instructions

## Step 1: Create Supabase Account

1. Go to: https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (easiest)
4. Create a new project:
   - Name: `trip-planner`
   - Database Password: (choose a strong password)
   - Region: (choose closest to you)
5. Wait 2 minutes for project to be ready

---

## Step 2: Run Database Schema

1. In Supabase dashboard, click **"SQL Editor"** (left sidebar)
2. Click **"New query"**
3. Copy ALL the SQL from `database/schema.sql`
4. Paste it in the editor
5. Click **"Run"** (or press Ctrl+Enter)
6. Wait for "Success" message

7. Create another new query
8. Copy ALL the SQL from `database/rls_policies.sql`
9. Paste and run it

---

## Step 3: Get Your API Keys

1. Click **"Settings"** (gear icon, bottom left)
2. Click **"API"**
3. You'll see:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

---

## Step 4: Configure Your App

1. In your project folder, create a file called `.env`
2. Add these lines (replace with YOUR values):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

3. Save the file
4. Restart your dev server: `npm run dev`

---

## Step 5: Test It!

1. Open your app
2. You should see a **Sign Up** screen
3. Create an account
4. Login
5. Start using the app with real authentication!

---

## ✅ What You'll Get:

- Real user accounts
- Secure login/logout
- Search for users by username
- Add friends to trips
- Shared trip access
- Data syncs across devices
- Password reset functionality

---

## 🆘 Need Help?

If you get stuck, let me know at which step and I'll help you!
