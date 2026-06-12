# Wandr Setup Help

## Current Status: Mock Mode (Demo Only)

Your app is currently running in **Mock Mode**, which means:
- ❌ Trip data is stored in browser localStorage (per-browser, per-user)
- ❌ Cannot share trips across different browsers or users
- ❌ Invite links don't work for other people
- ✅ Works great for single-user testing and demos

## Why Supabase Setup Failed

The "TypeError: Failed to fetch" error means the GitHub Actions deployment isn't using your Supabase credentials correctly. This can happen due to:
1. Secrets not being saved properly in GitHub
2. Deployment cache issues
3. Supabase project configuration issues

## Option 1: Continue with Mock Mode (Current State)

**Best for**: Testing, demos, single-user use

**Limitations**:
- No real collaboration
- Data lost if browser cache is cleared
- Each user sees their own data only

**How to use**:
- Use demo logins (Sarah, Mike, Chloe)
- Create trips and test features
- Everything works except cross-user sharing

## Option 2: Set Up Supabase (For Real Collaboration)

**Best for**: Real multi-user trip planning

**What you need**:
1. Supabase account (free tier available)
2. Project URL and API key
3. GitHub repository access
4. 30 minutes of setup time

### Detailed Setup Steps:

#### A. Supabase Setup
1. Go to https://supabase.com
2. Create account and new project
3. Wait for project to be ready (~2 minutes)
4. Go to Settings → API
5. Copy:
   - Project URL: `https://xxxxx.supabase.co`
   - anon public key: `eyJ...` (long string)

#### B. Database Setup
1. In Supabase, go to SQL Editor
2. Run the SQL from `database/schema.sql`
3. Run the SQL from `database/rls_policies.sql`

#### C. GitHub Secrets Setup
1. Go to: https://github.com/YOUR_USERNAME/Wandr/settings/secrets/actions
2. Add secret: `VITE_SUPABASE_URL` = your project URL
3. Add secret: `VITE_SUPABASE_ANON_KEY` = your anon key
4. Make sure names are EXACT (including VITE_ prefix)

#### D. Deploy
1. Push any commit to trigger deployment
2. Wait 2-5 minutes
3. Check https://your-site.github.io/Wandr/
4. Press F12, look for: `[Wandr] Supabase client initialised.`

## Option 3: Get Professional Help

If you need this working urgently and don't want to deal with setup:

1. **Hire a developer** on Fiverr/Upwork to set up Supabase (~$20-50, 1-2 hours)
2. **Use a different platform** like Firebase (similar setup complexity)
3. **Contact Supabase support** if you're stuck on their platform

## Testing Your Current App

Even in mock mode, you can test most features:

1. **Login**: Use demo accounts (Sarah, Mike, Chloe)
2. **Create Trip**: Works perfectly
3. **Add Itinerary**: Works perfectly
4. **Add Expenses**: Works perfectly
5. **View Members**: Shows mock data
6. **Invite Friends**: ❌ Won't work across browsers

## Need More Help?

1. Check the browser console (F12) for error messages
2. Read `MOCK_MODE_LIMITATIONS.md` for detailed explanation
3. Check GitHub Actions logs for deployment errors
4. Verify Supabase project is active and accessible

## Quick Diagnostic

To check if Supabase is configured:

1. Open: https://your-site.github.io/Wandr/test-supabase.html
2. See if it shows "✅ Supabase IS Configured" or "❌ NOT Configured"
3. This tells you if the secrets are working

---

**Bottom Line**: Your app works great in mock mode for demos. For real collaboration, you need Supabase properly configured, which requires access to both GitHub and Supabase accounts that I cannot access directly.
