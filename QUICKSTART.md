# Posty + Supabase Quick Start

Get Posty running with Supabase in 10 minutes!

## Prerequisites

- ✅ Node.js 16+ installed
- ✅ npm installed
- ✅ Git (optional)

## Step 1: Set Up Supabase (5 minutes)

### 1.1 Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**
3. Fill in:
   - **Name:** posty
   - **Database Password:** (generate & save it!)
   - **Region:** (closest to you)
4. Click **Create new project**
5. ⏳ Wait 2-3 minutes...

### 1.2 Run Database Schema

1. Click **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open file: `backend/supabase/schema.sql`
4. Copy entire file contents
5. Paste in SQL Editor
6. Click **Run** ▶️
7. ✅ You should see: "Success. No rows returned"

### 1.3 Get Your API Keys

1. Click **Settings** → **API** (left sidebar)
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key
   - **service_role** key ⚠️ Keep this secret!

### 1.4 Disable Email Confirmation (Development Only)

1. Click **Authentication** → **Providers**
2. Click **Email**
3. **Disable** "Confirm email"
4. Click **Save**

## Step 2: Configure Environment Variables (2 minutes)

### 2.1 Backend Configuration

Update `.env` in project root:

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co           # Paste your Project URL
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...  # Paste anon key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs... # Paste service_role key

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

Keep existing variables (Cloudflare, Anthropic, etc.)

### 2.2 Frontend Configuration

Create `frontend/.env`:

```bash
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co           # Same as backend
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6... # Same as backend
REACT_APP_API_URL=http://localhost:3001
```

## Step 3: Install Dependencies (1 minute)

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

Dependencies are already in package.json, including `@supabase/supabase-js`!

## Step 4: Start the Application (1 minute)

### Option A: Both at once

```bash
npm run dev
```

This starts:
- Backend on http://localhost:3001
- Frontend on http://localhost:3000

### Option B: Separate terminals

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run client
```

## Step 5: Test Authentication (1 minute)

### 5.1 Test Backend API

Open a new terminal:

```bash
# Test registration
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
  "user": { ... }
}
```

```bash
# Test login
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
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "..."
}
```

✅ **If both work, authentication is set up correctly!**

### 5.2 Verify in Supabase

1. Go to Supabase Dashboard
2. Click **Authentication** → **Users**
3. You should see `test@example.com`!
4. Click **Table Editor** → **users**
5. Your user profile should be there with Gmail address

## 🎉 You're Ready!

Your Posty + Supabase setup is complete!

## Next: Test the Full Flow

### 1. Open Frontend
Go to: http://localhost:3000

### 2. Try the Questionnaire
- Fill in your name
- Enter location
- Add profession
- Add interests
- Get domain recommendations

### 3. Select a Domain
Click on a recommended domain

### 4. Sign Up
You should see the signup form (SignupForm component)

### 5. Create Account
Fill in:
- First & Last Name
- Email
- Gmail address (for forwarding)
- Password

### 6. Success!
You should be logged in and see your dashboard

## Common Issues

### ❌ "Failed to fetch" error
**Solution:** Make sure backend is running on port 3001
```bash
# Check if running
curl http://localhost:3001/health
# Should return: {"status":"ok","service":"Posty API"}
```

### ❌ "Missing environment variables" error
**Solution:** Check your `.env` files
```bash
# Backend
cat .env | grep SUPABASE

# Frontend
cat frontend/.env | grep SUPABASE
```

### ❌ "relation does not exist" error
**Solution:** Run the schema.sql file again in Supabase SQL Editor

### ❌ CORS error in browser
**Solution:** Check CORS_ORIGIN in backend .env:
```bash
CORS_ORIGIN=http://localhost:3000
```

### ❌ "Invalid API key" error
**Solution:**
1. Make sure you copied the keys correctly
2. Check for extra spaces or newlines
3. Verify keys in Supabase Dashboard → Settings → API

## Useful Commands

```bash
# Start both backend & frontend
npm run dev

# Backend only
npm run server

# Frontend only
npm run client

# Install all dependencies
npm run install-all

# Check API health
curl http://localhost:3001/health

# View backend logs
npm run server (watch console output)
```

## Development Workflow

1. **Make changes** to code
2. **Nodemon auto-restarts** backend
3. **React auto-reloads** frontend
4. **Check browser** for changes
5. **Check terminal** for errors
6. **Check Supabase logs** if needed

## Supabase Dashboard Quick Links

- **Auth Users:** Authentication → Users
- **Database Tables:** Table Editor
- **SQL Queries:** SQL Editor
- **API Logs:** Logs → API Logs
- **Auth Logs:** Logs → Auth Logs

## Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend loads at localhost:3000
- [ ] Registration works (test@example.com)
- [ ] Login works
- [ ] User appears in Supabase Dashboard
- [ ] Protected routes require auth
- [ ] Questionnaire flow works
- [ ] Domain recommendations show

## Next Steps

Now that authentication works, implement:

1. **Checkout Flow** - Stripe integration
2. **Domain Purchase** - Cloudflare API write access
3. **Email Forwarding** - Cloudflare Email Routing
4. **User Dashboard** - Show domains & subscription

See [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) for details!

---

## 🆘 Need Help?

1. **Check logs:**
   - Backend console
   - Browser console (F12)
   - Supabase Dashboard → Logs

2. **Review docs:**
   - [SUPABASE_SETUP.md](SUPABASE_SETUP.md) - Detailed setup guide
   - [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - What we built

3. **Common solutions:**
   - Restart backend: Ctrl+C then `npm run server`
   - Clear browser cache: Hard refresh (Cmd+Shift+R)
   - Check environment variables: `cat .env`

---

**Happy coding! 🚀**

Your Posty application is now powered by Supabase.
