# Posty - Project Brief for Claude Code Implementation

## Product Overview

**Posty** is an AI-powered service that helps people get custom email addresses on their own domains while continuing to use Gmail. The core problem: Gmail namespace saturation forces people into poor email addresses like "john.smith.12847@gmail.com", while most consumers don't understand domain setup or Gmail integration.

**Solution:** AI-guided domain discovery + automated domain purchasing and DNS configuration + seamless Gmail integration for $5/month plus domain costs (~$10-15/year).

**Target Domain:** posty.app

---

## Current State

### What We've Built
1. **Working React Prototype** (`posty_v06.html`)
   - Conversational chatbot interface
   - Voice input support
   - Sidebar showing captured user info
   - Rule-based conversation flow (limited, breaks easily)

2. **Two Strategy Documents**
   - `posty_questionnaire_structure.md` - Conversation flow and data collection
   - `posty_recommendation_engine.md` - Domain generation algorithm

### Why We Need to Rebuild
The current prototype is purely rule-based (if/else logic) and:
- Breaks on unexpected user responses
- Can't handle natural conversation
- Can't generate truly creative suggestions
- No real domain availability checking
- No entity research for "magic moments"

---

## Improved Questionnaire Flow

This is the **NEW** flow we want to implement (better than current prototype):

### Stage 1: Name Collection & Preference
**Ask:** "What's your full name?"
- Parse: firstName, middleName, lastName
- Generate potential handles

**Then Ask:** "Which part do you prefer for your email?"
**Show Options:**
- Full first name (andreas)
- First + middle (andreaskeinicke)
- Handles (akg, anke)
- "Let me think creatively" (trigger AI)

### Stage 2: Location
**Ask:** "Where are you based?"
- Gets: Country, City, (State if US)
- Maps to TLDs (.dk, .eu, etc.)
- Identifies city abbreviations (Copenhagen → cph)

### Stage 3: Usage Context
**Ask:** "What will you use this email for?"
**Options:**
- Personal use
- Professional/business
- Portfolio/creative work
- All of the above
- Something else

**Why This Matters:** Influences tone (professional vs creative domains)

### Stage 4: Profession (if professional)
**Ask:** "What do you do professionally?"
- Split multiple professions separately
- Only suggest profession domains if name is ≤8 chars

### Stage 5: Creative Freedom
**Ask:** "Tell me about yourself - interests, passions, hobbies?"
**This is the MAGIC MOMENT section:**
- User mentions specific entities (sports teams, bands, places)
- AI researches them for creative connections
- Example: "Silkeborg IF" → Founded 1917 → Suggest "andreas17.dk"
- Example: "Pink Floyd" → Dark Side 1973 → Suggest "andreas73.me"

### Stage 6: Present Recommendations
Show categorized suggestions:
1. **Your Name** - Full name variations
2. **Short Handles** - Grouped TLDs: `akg (.com / .io / .me)`
3. **Your Location** - City-based if applicable
4. **For [Profession]** - Separate per profession
5. **✨ Special for You** - Creative AI suggestions with explanations

**Then:** Guide conversation to either lock in a choice OR explore more options

---

## Domain Generation Rules

### Priority Order:
1. **Your Name** (TRUE name variations)
   - `andreas.dk`
   - `andreaskeinicke.dk` (first + middle)
   - `akeinicke.dk` (initial + middle)
   - `andreasgustavsen.dk` (first + last)

2. **Short Handles**
   - `akg (.dk / .io / .me)` - Initials
   - `anke (.dk / .io)` - 2+2+2 pattern
   - `ankegu.dk` - Extended handle

3. **Your Location** (if city has abbreviation)
   - `andreascph.dk`
   - `akgcph.io`

4. **For [Profession]** (only if profession ≤8 chars)
   - Avoid bad shortenings like "consandreas"
   - Only generate if it makes sense

5. **Creative AI-Powered**
   - Research entities mentioned in interests
   - Create meaningful number/year connections
   - Show explanation: "Since you mentioned X (founded Y)..."

### Character Limits:
- **Optimal:** 6-12 characters (including TLD)
- **Acceptable:** 13-18 characters
- **Avoid:** 19+ characters

### Display Format:
- Group same base with multiple TLDs: `akg (.com / .io / .me)`
- NOT: `akg.com`, `akg.io`, `akg.me` (redundant)

---

## Special Character Handling

International names require ASCII transliteration:

**Scandinavian:** ø→o, æ→ae, å→aa
**German:** ü→ue, ö→oe, ä→ae, ß→ss
**French:** é/è/ê→e, à/â→a, ç→c
**Spanish:** ñ→n, á/é/í/ó/ú→a/e/i/o/u

**Example:** "Søren Østergaard" → "sorenostergaard"

**User Communication:** Show both versions:
"For 'Søren' we'll use 'soren' in domains"

---

## City Abbreviations

Major cities with standard abbreviations:
- Copenhagen → cph
- Barcelona → bcn
- London → ldn
- New York → nyc
- Los Angeles → la
- San Francisco → sf
- Paris → par
- Berlin → ber
- Amsterdam → ams
- Tokyo → tyo

Use these in domain suggestions: `andreascph.dk`, `akgbcn.io`

---

## Conversation Tone & Behavior

### Voice:
- Warm and friendly, not corporate
- Conversational, like a helpful friend
- No excessive enthusiasm ("Awesome! That's great! Perfect!")
- Natural transitions

### Good Examples:
- "Nice to meet you, Andreas! Where are you based?"
- "Got it. What do you do professionally?"
- "Do any of these feel just right? Or should we explore different directions?"

### Avoid:
- "That's great!" (repetitive)
- "Awesome!" (overused)
- Robotic echoing of user input

### After Showing Suggestions:
**Always guide to next step:**
1. Lock in a choice: "Which one caught your eye?"
2. Explore more: "What style are you looking for? Shorter? More creative?"
3. Help decide: "Based on what I know, I'd lean towards..."

---

## Technical Requirements

### Frontend (React)
- Keep the current UI design (purple gradient, clean, modern)
- Voice input support
- Sidebar showing captured info as tags
- Auto-focus input field
- Smooth animations and typing indicators

### Backend (Node.js + Express)
**Required APIs:**
1. **Claude API (Anthropic)**
   - Handle natural conversation
   - Generate creative suggestions
   - Guide questionnaire flow
   - Model: claude-sonnet-4-20250514

2. **Domain Availability Checker**
   - Real-time availability checking
   - Show status: ✅ Available | ❌ Taken | 💰 Premium
   - Options: Namecheap API, GoDaddy, or domain availability services
   - Cache results to avoid duplicate checks

3. **Web Search (for Creative Magic)**
   - Research entities mentioned by users
   - Find founding dates, significant years, nicknames
   - Example: Search "Silkeborg IF history" → Find 1917
   - Use for creative domain suggestions

### Data Structure
```javascript
userInfo = {
  // Name
  fullName: "Andreas Keinicke Gustavsen",
  firstName: "Andreas",
  middleName: "Keinicke",
  lastName: "Gustavsen",
  preferredName: "andreas",
  normalizedName: "andreas", // ASCII version
  handles: ["anke", "akg", "andrg"],
  
  // Location
  country: "Denmark",
  city: "Copenhagen",
  cityAbbreviation: "cph",
  state: null, // Only for US
  tlds: [".dk", ".eu", ".me"],
  
  // Context
  emailUsage: "professional", // or "personal", "portfolio", "all"
  
  // Work
  professions: ["founder", "consultant"],
  
  // Interests (for creative magic)
  interests: ["football", "Silkeborg IF", "skiing"],
  interestEntities: [
    {
      name: "Silkeborg IF",
      type: "sports_team",
      metadata: { founded: 1917, nickname: "17" }
    }
  ]
}
```

---

## Key Features to Implement

### 1. Natural Conversation
- Use Claude API to handle all user responses
- No more if/else logic
- Can handle unexpected inputs gracefully
- Maintains context throughout conversation

### 2. Domain Generation Engine
- Implement the algorithm from `posty_recommendation_engine.md`
- Generate multiple categories of suggestions
- Group TLDs: `akg (.com / .io / .me)`
- Filter by character length and quality

### 3. Real-Time Availability Checking
- Check availability as domains are generated
- Show status badges next to each suggestion
- Prioritize available domains
- Suggest alternatives for taken domains

### 4. Creative AI Features
**The "Magic Moment":**
- When user mentions specific entities (sports teams, bands, historical events)
- Use web search to research them
- Find relevant numbers, dates, or connections
- Generate personalized domains with explanations

**Example Flow:**
```
User: "I love Silkeborg IF"
→ Search: "Silkeborg IF founded history"
→ Find: Founded 1917, nicknamed "17"
→ Suggest: "andreas17.dk" with explanation
→ Show: "Since you mentioned Silkeborg IF (founded 1917, also known as '17'), how about andreas17.dk?"
```

### 5. Guided Decision Making
After showing suggestions, proactively:
- Help users choose
- Offer to explore different styles
- Provide personal recommendations
- Natural back-and-forth until they find the perfect domain

---

## Project Structure

### Recommended Setup:
```
posty/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatInterface.jsx
│   │   │   ├── MessageBubble.jsx
│   │   │   ├── InfoSidebar.jsx
│   │   │   └── VoiceInput.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── chat.js
│   │   ├── services/
│   │   │   ├── claudeService.js      # Claude API integration
│   │   │   ├── domainService.js      # Domain availability checking
│   │   │   ├── searchService.js      # Entity research
│   │   │   └── recommendationEngine.js # Domain generation
│   │   ├── utils/
│   │   │   ├── nameParser.js
│   │   │   ├── charNormalizer.js
│   │   │   └── cityMappings.js
│   │   └── server.js
│   └── package.json
│
├── docs/
│   ├── posty_questionnaire_structure.md
│   └── posty_recommendation_engine.md
│
└── README.md
```

---

## Environment Variables Needed

```env
# Claude API
ANTHROPIC_API_KEY=your_key_here
CLAUDE_MODEL=claude-sonnet-4-20250514

# Domain Checking
DOMAIN_API_KEY=your_key_here
DOMAIN_API_URL=https://...

# Web Search (for entity research)
SEARCH_API_KEY=your_key_here

# Server
PORT=3000
NODE_ENV=development
```

---

## MVP Scope (First Build)

### Must Have:
1. ✅ New questionnaire flow (6 stages)
2. ✅ Claude API integration for natural conversation
3. ✅ Domain generation with all 5 categories
4. ✅ Special character normalization
5. ✅ City abbreviation mapping
6. ✅ Grouped TLD display format
7. ✅ Conversational guidance after suggestions

### Should Have:
8. ✅ Domain availability checking (real-time)
9. ✅ Creative AI suggestions with entity research
10. ✅ Voice input on frontend

### Nice to Have:
11. ⏳ Premium domain suggestions
12. ⏳ Price comparison across TLDs
13. ⏳ Alternative suggestions for taken domains
14. ⏳ Purchase flow integration

---

## Success Criteria

**User completes the flow and:**
1. Has a natural conversation (doesn't break)
2. Sees 15-20 personalized domain suggestions
3. Gets at least 1 "magic moment" creative suggestion
4. Can see which domains are available
5. Successfully locks in a choice

**Technical:**
1. Claude API responds in <2 seconds
2. Domain checking completes in <3 seconds
3. UI is smooth and responsive
4. No conversation breaking on unexpected input

---

## Files to Reference

When starting in Claude Code, you have access to:

1. **Strategy Documents:**
   - `/mnt/user-data/outputs/posty_questionnaire_structure.md`
   - `/mnt/user-data/outputs/posty_recommendation_engine.md`

2. **Working Prototype:**
   - `/mnt/user-data/outputs/posty_v06.html`

3. **This Brief:**
   - `/mnt/user-data/outputs/POSTY_PROJECT_BRIEF.md`

---

## Important Design Decisions

### 1. Why Claude API?
- Need natural conversation handling
- Can generate creative suggestions
- Understands context and intent
- Won't break on unexpected input

### 2. Why Real-Time Availability?
- Core value prop - users need to know what's actually available
- Reduces frustration of choosing taken domains
- Can prioritize showing available options

### 3. Why Entity Research?
- Creates "magic moments" that feel personalized
- Differentiates from simple domain generators
- Makes users feel understood
- Higher conversion (emotional connection to domain)

### 4. Why New Questionnaire Flow?
- "What will you use this for?" is crucial context
- Creative freedom section enables magic moments
- More natural conversation progression
- Better data for recommendations

---

## Questions for Claude Code Session

When you start building, ask:

1. **Architecture:** Should we use TypeScript or JavaScript?
2. **State Management:** Context API or just props for the frontend?
3. **Domain API:** Which service should we use? (Namecheap, GoDaddy, etc.)
4. **Search API:** For entity research - which service?
5. **Claude Prompting:** How should we structure the system prompt?
6. **Caching:** Redis for domain availability caching?

---

## Next Steps

1. Set up project structure in Claude Code
2. Install dependencies (Express, Anthropic SDK, React, etc.)
3. Implement Claude API integration first
4. Build domain generation engine
5. Add domain availability checking
6. Integrate entity research for creative suggestions
7. Connect frontend to backend
8. Test the full flow

---

## Contact & Context

**Product Name:** Posty
**Domain:** posty.app
**Pricing:** $5/month + domain cost (~$10-15/year)
**Target Users:** People who want custom email addresses but don't want to leave Gmail

**Unique Value Proposition:**
- Keep using Gmail (no switching)
- AI helps you find the perfect domain
- Creative suggestions based on your interests
- Automated setup (domain + DNS + email routing)

---

Good luck! 🚀
