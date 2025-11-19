# Supabase Setup Guide for Posty

This guide walks you through setting up Supabase for the Posty project.

## Step 1: Create Supabase Account & Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub (recommended) or email
4. Click "New Project"
5. Fill in project details:
   - **Name:** `posty` (or your preferred name)
   - **Database Password:** Generate a strong password (save it!)
   - **Region:** Choose closest to your users (e.g., `West EU (London)` for Europe)
   - **Pricing Plan:** Free (perfect for MVP)
6. Click "Create new project"
7. Wait 2-3 minutes for project to be provisioned

## Step 2: Run Database Schema

1. In your Supabase Dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the file: `backend/supabase/schema.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see: ✅ "Success. No rows returned"

### Verify Schema

Click **Table Editor** in sidebar - you should see these tables:
- ✅ users
- ✅ domains
- ✅ subscriptions
- ✅ questionnaire_sessions
- ✅ transactions
- ✅ email_forwarding_rules

## Step 3: Configure Supabase Auth

1. Click **Authentication** → **Providers** in sidebar
2. **Email Auth** should be enabled by default
3. Configure Email Templates (optional but recommended):
   - Click **Email Templates**
   - Customize **Confirm signup** email
   - Customize **Reset password** email

### Disable Email Confirmation (for development)

For faster development, you can disable email confirmation:

1. Go to **Authentication** → **Providers**
2. Click **Email** provider
3. Disable **"Confirm email"**
4. Click **Save**

⚠️ **IMPORTANT:** Re-enable this before production launch!

## Step 4: Get API Credentials

1. Click **Settings** → **API** in sidebar
2. You'll see:
   - **Project URL** - Copy this
   - **anon public** key - Copy this
   - **service_role** key - Copy this (keep it secret!)

## Step 5: Update Environment Variables

### Backend (.env)

Update your `.env` file in the project root:

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Frontend URL (for password reset redirects)
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)

Create `frontend/.env` file:

```bash
REACT_APP_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REACT_APP_API_URL=http://localhost:3001
```

⚠️ **Security Note:**
- ✅ `SUPABASE_URL` and `SUPABASE_ANON_KEY` are safe for frontend
- ❌ **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` in frontend!

## Step 6: Test Authentication

### Start Backend
```bash
npm run server
```

### Test Registration
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "firstName": "Test",
    "lastName": "User",
    "gmailAddress": "test@gmail.com"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Registration successful. Please log in.",
  "user": {
    "id": "uuid-here",
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User"
  }
}
```

### Test Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

Expected response:
```json
{
  "success": true,
  "user": { ... },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "..."
}
```

### Verify in Supabase Dashboard

1. Go to **Authentication** → **Users**
2. You should see your test user!
3. Go to **Table Editor** → **users**
4. Your user profile should be there with Gmail address

## Step 7: Test Row Level Security (RLS)

RLS ensures users can only access their own data.

### Test 1: Try to access another user's data

```bash
# This should return ONLY your own domains
curl http://localhost:3001/api/domains/my-domains \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Test 2: Verify in Supabase

1. Go to **Table Editor** → **domains**
2. Try to manually insert a domain for your user
3. It should work because you're authenticated
4. Try to view domains - you'll only see your own (thanks to RLS!)

## Step 8: Enable Real-time (Optional)

For real-time domain status updates:

1. Go to **Database** → **Replication**
2. Click on **domains** table
3. Enable replication
4. Click **Save**

Now your frontend can subscribe to domain changes!

## Step 9: Monitor & Debug

### View Logs

1. **API Logs:** Click **Logs** → **API Logs**
2. **Postgres Logs:** Click **Logs** → **Postgres Logs**
3. **Auth Logs:** Click **Logs** → **Auth Logs**

### Useful Queries

Find user by email:
```sql
SELECT * FROM auth.users WHERE email = 'test@example.com';
```

View user profile:
```sql
SELECT * FROM public.users WHERE email = 'test@example.com';
```

Check sessions:
```sql
SELECT * FROM public.questionnaire_sessions WHERE user_id IS NOT NULL;
```

## Common Issues & Solutions

### Issue: "relation does not exist"
**Solution:** Run the schema.sql file again in SQL Editor

### Issue: "Failed to get user: RLS policy violation"
**Solution:** Check that RLS policies are created. Run:
```sql
SELECT * FROM pg_policies WHERE tablename = 'users';
```

### Issue: "Invalid API key"
**Solution:** Double-check your environment variables. Make sure you're using:
- `SUPABASE_ANON_KEY` in frontend
- `SUPABASE_SERVICE_ROLE_KEY` in backend for admin operations

### Issue: Email verification not working
**Solution:**
1. Check Auth → Providers → Email settings
2. For development, disable email confirmation
3. For production, configure SMTP settings

## Next Steps

Now that Supabase is set up, you can:

1. ✅ Test authentication flow in frontend
2. ✅ Build user dashboard
3. ✅ Integrate Stripe (checkout flow)
4. ✅ Implement domain purchase workflow
5. ✅ Set up email forwarding

## Production Checklist

Before launching:

- [ ] Enable email confirmation
- [ ] Configure custom SMTP (optional)
- [ ] Set up database backups (Pro plan)
- [ ] Enable 2FA on Supabase account
- [ ] Review RLS policies
- [ ] Set up monitoring alerts
- [ ] Add database indexes for performance
- [ ] Upgrade to Pro plan if needed (more storage, backups)

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)
- [Database Functions](https://supabase.com/docs/guides/database/functions)

## Support

If you encounter issues:

1. Check Supabase Logs (Dashboard → Logs)
2. Check backend console output
3. Review [Supabase Discord](https://discord.supabase.com)
4. Check [Supabase GitHub Issues](https://github.com/supabase/supabase/issues)

---

**You're all set!** 🎉

Supabase is now powering Posty's authentication and database.
