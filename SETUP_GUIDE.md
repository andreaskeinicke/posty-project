# Posty Setup Guide

This guide will help you get Posty up and running quickly.

## Quick Start (5 minutes)

### Step 1: Get Your Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key and copy it

### Step 2: Install Dependencies

```bash
# Install all dependencies (backend + frontend)
npm run install-all
```

### Step 3: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your Anthropic API key
# ANTHROPIC_API_KEY=your_key_here
```

### Step 4: Run the Application

```bash
# Start both backend and frontend
npm run dev
```

The application will open at `http://localhost:3000`

## Detailed Setup

### 1. System Requirements

- **Node.js**: Version 16 or higher
- **npm**: Version 8 or higher
- **Operating System**: Windows, macOS, or Linux

Check your versions:
```bash
node --version
npm --version
```

### 2. Installation Steps

#### Clone or Download

```bash
# If using git
git clone <repository-url>
cd posty

# Or download and extract the ZIP file
```

#### Install Backend Dependencies

```bash
# From the root directory
npm install
```

This installs:
- Express (web framework)
- Anthropic SDK (Claude AI)
- Axios (HTTP client)
- CORS (cross-origin support)
- Helmet (security)
- Other dependencies

#### Install Frontend Dependencies

```bash
# Navigate to frontend directory
cd frontend
npm install
cd ..
```

This installs:
- React (UI framework)
- React DOM (React rendering)
- Axios (API communication)
- React Markdown (message formatting)
- Lucide React (icons)

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Required: Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Optional: Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Optional: GoDaddy API (for accurate domain checking)
GODADDY_API_KEY=your_key
GODADDY_API_SECRET=your_secret

# Optional: Namecheap API (alternative domain checking)
NAMECHEAP_API_USER=your_username
NAMECHEAP_API_KEY=your_key

# Optional: Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Getting API Keys

#### Anthropic API Key (Required)

1. Visit https://console.anthropic.com/
2. Create an account or sign in
3. Go to "API Keys" section
4. Click "Create Key"
5. Copy the key and paste it in your `.env` file
6. Note: You'll need to add credits to your account

#### GoDaddy API (Optional, for better domain checking)

1. Visit https://developer.godaddy.com/
2. Sign in or create an account
3. Go to "API Keys" section
4. Create a production key
5. Copy both the Key and Secret to your `.env` file

#### Namecheap API (Optional, alternative to GoDaddy)

1. Visit https://www.namecheap.com/
2. Sign in to your account
3. Go to Profile > Tools > API Access
4. Enable API access
5. Copy your username and API key to `.env` file

**Note**: If you don't configure domain API keys, Posty will use DNS lookups (less accurate but functional).

### 5. Running the Application

#### Development Mode (Recommended for Testing)

Run both servers with hot-reload:

```bash
npm run dev
```

This starts:
- Backend API on `http://localhost:3001`
- Frontend React app on `http://localhost:3000`

Changes to code will automatically reload.

#### Run Servers Separately

Backend only:
```bash
npm run server
```

Frontend only:
```bash
npm run client
```

#### Production Mode

Build and run for production:

```bash
# Build frontend
npm run build

# Start backend (serves API)
npm start
```

For production, you'll need to configure Express to serve the built frontend files.

### 6. Verify Installation

1. Open `http://localhost:3000` in your browser
2. You should see the Posty interface
3. Try chatting with Posty
4. Test the questionnaire flow

#### Test the API Directly

```bash
# Health check
curl http://localhost:3001/health

# Test domain check
curl -X POST http://localhost:3001/api/domains/check \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com"}'
```

### 7. Common Setup Issues

#### Issue: "Cannot find module"

**Solution**: Install dependencies
```bash
npm run install-all
```

#### Issue: "ANTHROPIC_API_KEY is not defined"

**Solution**:
1. Ensure `.env` file exists in root directory
2. Check the key is correctly formatted
3. Restart the server after updating `.env`

#### Issue: "Port 3000 already in use"

**Solution**: Kill the process using the port
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Or change the port in `frontend/package.json`:
```json
{
  "scripts": {
    "start": "PORT=3002 react-scripts start"
  }
}
```

#### Issue: "Claude API error"

**Solutions**:
- Verify your API key is correct
- Check you have credits in your Anthropic account
- Ensure you're not hitting rate limits
- Check your internet connection

#### Issue: "CORS error"

**Solution**: Ensure `CORS_ORIGIN` in `.env` matches your frontend URL:
```env
CORS_ORIGIN=http://localhost:3000
```

#### Issue: "Domain checking not working"

**Solutions**:
- Without API keys, DNS checking is used (less accurate)
- Add GoDaddy or Namecheap API keys for better results
- Check that domains include TLD (.com, .net, etc.)

### 8. Project Structure Overview

```
posty/
├── backend/              # Node.js + Express backend
│   ├── server.js        # Main server file
│   ├── routes/          # API route definitions
│   ├── controllers/     # Request handlers
│   └── services/        # Business logic
├── frontend/            # React frontend
│   ├── public/          # Static files
│   └── src/             # React components
├── .env                 # Environment variables (you create this)
├── .env.example         # Environment template
├── package.json         # Root dependencies
└── README.md           # Documentation
```

### 9. Development Workflow

1. **Start Development**: `npm run dev`
2. **Make Changes**: Edit files in `frontend/src/` or `backend/`
3. **See Changes**: Browser auto-reloads for frontend, restart for backend
4. **Test**: Use the UI and check browser console for errors
5. **Debug**: Check terminal for backend errors, browser console for frontend

### 10. Testing Features

#### Test Chat Interface
1. Open `http://localhost:3000`
2. Type a message to Posty
3. Verify you get a response from Claude

#### Test Questionnaire
1. Click "Start Questionnaire"
2. Answer several questions
3. Submit and check domain suggestions

#### Test Domain Checking
1. Complete the questionnaire
2. Check that domains show availability status
3. Verify "Available" badges appear

### 11. Next Steps

After setup:

1. **Customize System Prompt**: Edit `backend/services/claudeService.js`
2. **Modify Questionnaire**: Edit `backend/services/questionnaireService.js`
3. **Adjust Styling**: Edit CSS files in `frontend/src/components/`
4. **Add Features**: Follow the development guide in README.md

### 12. Getting Help

If you encounter issues:

1. Check this setup guide
2. Review the main README.md
3. Check browser console (F12) for errors
4. Check terminal/console for backend errors
5. Verify all environment variables are set
6. Try deleting `node_modules` and reinstalling:
   ```bash
   rm -rf node_modules frontend/node_modules
   npm run install-all
   ```

### 13. Production Deployment Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Use strong API keys
- [ ] Configure rate limiting appropriately
- [ ] Set up HTTPS/SSL
- [ ] Configure CORS for your production domain
- [ ] Build frontend: `npm run build`
- [ ] Test all features in production environment
- [ ] Set up error logging and monitoring
- [ ] Configure backup for environment variables

## Quick Reference

### Common Commands

```bash
# Install everything
npm run install-all

# Development mode (both servers)
npm run dev

# Backend only
npm run server

# Frontend only
npm run client

# Build for production
npm run build

# Start production server
npm start
```

### Default URLs

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`
- Health Check: `http://localhost:3001/health`

### Important Files

- `.env` - Your configuration (create from `.env.example`)
- `backend/server.js` - Backend entry point
- `frontend/src/App.js` - Frontend entry point
- `backend/services/claudeService.js` - Claude AI integration
- `backend/services/domainService.js` - Domain checking

Happy building with Posty! 🚀
