# 3-Minute Copy-Paste Setup

## What You Need to Do:

### 1. Create Supabase Project (2 minutes)

**Go to:** https://supabase.com/dashboard

1. Click **"New Project"**
2. Fill in:
   - Name: `posty`
   - Database Password: Click "Generate" → **SAVE IT!**
   - Region: Pick closest to you
3. Click **"Create new project"**
4. ⏳ Wait 2 minutes...

---

### 2. Run SQL (30 seconds)

When project is ready:

1. Click **"SQL Editor"** (left sidebar)
2. Click **"New Query"**
3. **COPY** entire contents of `backend/supabase/schema.sql`
4. **PASTE** into SQL Editor
5. Click **"RUN"** ▶️
6. ✅ Should see: "Success. No rows returned"

---

### 3. Get API Keys (30 seconds)

1. Click **"Settings"** → **"API"** (left sidebar)
2. You'll see 3 things - **COPY EACH ONE:**

**Copy these 3 values:**

```
Project URL: https://xxxxxxxxxxxxx.supabase.co
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 4. Update .env Files (1 minute)

#### **Backend** - Edit `.env` in project root:

Find these lines (around line 31):
```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Replace with your keys:**
```bash
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co  # Paste Project URL
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...  # Paste anon key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...   # Paste service_role key
```

#### **Frontend** - Edit `frontend/.env`:

```bash
REACT_APP_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co  # Same Project URL
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...  # Same anon key
REACT_APP_API_URL=http://localhost:3001
```

⚠️ **Important:** Frontend uses `REACT_APP_` prefix!

---

### 5. Disable Email Confirmation (Development Only)

In Supabase Dashboard:

1. Click **"Authentication"** → **"Providers"**
2. Click **"Email"**
3. **Toggle OFF:** "Confirm email"
4. Click **"Save"**

---

## ✅ Done! Now Test It:

### Start the app:
```bash
npm run dev
```

### Test registration:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "firstName": "Test",
    "lastName": "User",
    "gmailAddress": "test@gmail.com"
  }'
```

### Check Supabase:
1. Go to **Authentication** → **Users**
2. You should see `test@example.com` ✅

---

## If Something Goes Wrong:

### Error: "Missing environment variables"
- Check you saved both `.env` files
- Make sure no extra spaces in the keys
- Restart backend: `npm run server`

### Error: "relation does not exist"
- Go back to SQL Editor
- Re-run the `schema.sql` file

### Error: "Invalid API key"
- Double-check you copied the right keys
- Make sure `service_role` key is in backend only
- Make sure `anon` key is in both

---

**That's it!** Tell me when you've done steps 1-3 and I'll help verify everything works! 🚀
