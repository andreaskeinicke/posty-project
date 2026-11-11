# Posty Questionnaire Structure

## Overview
The questionnaire is a conversational flow that collects user information to generate personalized email domain recommendations. It follows a stage-based progression.

---

## Conversation Stages

### Stage 1: **Welcome**
**Goal:** Introduce Posty and start the conversation

**Bot Says:**
- Introduces Posty as a service to get a custom email domain with Gmail
- Asks for the user's name

**Collects:**
- Full name (e.g., "Andreas Keinicke Gustavsen")

**Processing:**
- Parses name into components:
  - `firstName`: "Andreas"
  - `middleName`: "Keinicke" 
  - `lastName`: "Gustavsen"
- Generates short handles from name (used later)

**Next Stage:** location

---

### Stage 2: **Location**
**Goal:** Understand where the user is based to suggest relevant TLDs and city abbreviations

**Bot Says:**
- Asks for country and city together: "What country and city are you in?"
- If US detected: Also asks for state

**Collects:**
- Country (e.g., "Denmark", "United States", "Spain")
- City (e.g., "Copenhagen", "Barcelona", "New York")
- State (if US: e.g., "California", "NY")

**Processing:**
- Extracts country and maps to TLDs:
  - Denmark → .dk, .eu
  - US → .us, .io, .me
  - UK → .uk, .eu, .io
  - Spain → .es, .eu, .io
  - Default → .com, .io, .me
- Checks if city has standard abbreviation:
  - Copenhagen → cph
  - Barcelona → bcn
  - London → ldn
  - New York → nyc
  - Los Angeles → la
  - San Francisco → sf
- Stores full location string for display

**Next Stage:** profession

---

### Stage 3: **Profession**
**Goal:** Capture ALL job titles/roles separately for targeted suggestions

**Bot Says:**
- Asks what the user does professionally

**Collects:**
- Professions as array (e.g., ["founder", "consultant"])

**Processing:**
- **Critical:** Splits multiple professions properly
- Handles "and", commas, "also", etc.
- Each profession stored separately
- Normalizes capitalization

**Next Stage:** interests

---

### Stage 4: **Interests** (Optional/Light Touch)
**Goal:** Gather interests for potential creative domain magic

**Bot Says:**
- Asks what the user is interested in (lighter tone, not mandatory)
- "This is optional, but helps me get creative with suggestions!"

**Collects:**
- Interests as array (e.g., ["football", "Silkeborg IF", "sailing"])
- Can include specific entities (sports teams, bands, places, etc.)

**Processing:**
- Splits comma-separated or "and" separated lists
- Trims and normalizes each interest
- Stores both raw input and normalized version
- **Magic moment potential:** Can research specific entities
  - Example: "Silkeborg IF" → Look up founding year (1917) → Suggest domains with "17"
  - Example: "Pink Floyd" → Look up significant years/albums → Creative suggestions

**Special Handling:**
- If user says "skip" or "none" → That's fine, move on
- If very generic ("stuff", "things") → Gently encourage specifics or skip
- If specific entities mentioned → Flag for creative processing

**Next Stage:** review

---

### Stage 5: **Review**
**Goal:** Show captured information and generate recommendations

**Bot Says:**
- Summarizes captured info
- Generates and presents domain recommendations

**Shows:**
- Name preference
- Location
- Interests (as tags)
- Professions (as separate tags)

**Actions:**
- Runs recommendation engine
- Displays categorized domain suggestions
- Provides "Looks good!" confirmation option

**Next Stage:** purchase

---

## Data Structure

```javascript
userInfo = {
  // Name data
  fullName: "Andreas Keinicke Gustavsen",
  firstName: "Andreas",
  middleName: "Keinicke",
  lastName: "Gustavsen",
  preferredName: "andreas", // Used in domains
  normalizedName: "andreas", // ASCII version if special chars present
  
  // Location data
  country: "Denmark",
  city: "Copenhagen",
  cityAbbreviation: "cph", // If major city with standard abbreviation
  state: null, // Only for US
  locationString: "Copenhagen, Denmark", // For display
  tlds: [".dk", ".eu", ".me"], // Derived from country
  
  // Profession data (collected first)
  professions: ["founder", "consultant"], // ARRAY - multiple values
  
  // Interest data (collected last, optional)
  interests: ["football", "Silkeborg IF", "sailing"],
  interestEntities: [
    { 
      name: "Silkeborg IF", 
      type: "sports_team",
      metadata: { founded: 1917, nickname: "17" } // For creative suggestions
    }
  ],
  
  // Generated handles (from name parsing)
  handles: ["anke", "akg", "andrg", "ankegu"]
}
```

---

## Conversation Tone Guidelines

### Voice
- Warm and friendly, not corporate
- Conversational, like chatting with a helpful friend
- No excessive enthusiasm or fake excitement
- Natural transitions

### Good Examples:
- "Nice to meet you, Andreas! Where are you based?"
- "Got it. What do you do professionally?"
- "Perfect! I've got some great options for you."

### Avoid:
- "That's great!" (repetitive)
- "Awesome!" (overused)
- "Perfect! That's wonderful! Amazing!" (too much)
- Robotic echoing of user input

---

## Edge Cases to Handle

### Multiple Names
- User gives nickname only → Ask for full name
- User gives first + last → Handle missing middle name
- Hyphenated names → Parse appropriately

### Special Characters & Diacritics
International names require standardized transliteration for domain compatibility (domains can't use special characters).

**Conversion Standards by Language:**

**Scandinavian (Danish, Norwegian, Swedish):**
- ø, ö → o
- æ → ae  
- å → aa
- Example: "Søren Østergaard" → "sorenostergaard"

**German:**
- ü → ue
- ö → oe
- ä → ae
- ß → ss
- Example: "Müller" → "mueller"

**French:**
- é, è, ê → e
- à, â → a
- ç → c
- Example: "François" → "francois"

**Spanish:**
- ñ → n
- á, é, í, ó, ú → a, e, i, o, u
- Example: "Peña" → "pena"

**Portuguese:**
- ã, õ → a, o
- ç → c
- Example: "João" → "joao"

**Eastern European:**
- ł → l
- ż, ź → z
- ś → s
- č, ć → c
- Example: "Łukasz" → "lukasz"

**General Rule:** Strip all diacritical marks and replace special characters with their closest ASCII equivalents following standard transliteration rules for that language.

**User Communication:** 
- When displaying suggestions, show both: "For 'Søren' we'll use 'soren'"
- Make it clear this is a technical requirement, not a preference judgment

### Location Ambiguity
- City only → Try to infer country
- Abbreviations (e.g., "DK", "US") → Expand
- No location given → Ask again gently

### Interest Parsing
- Single word: "sailing" → ["sailing"]
- List: "tech, design, and music" → ["tech", "design", "music"]
- Vague: "stuff" → Ask for specifics

### Profession Parsing
- **Critical:** "founder and consultant" → ["founder", "consultant"]
- Role + company: "CEO at Acme" → Extract "CEO"
- Multiple roles: "developer, designer, writer" → All separate

---

## Future Improvements to Consider

1. **More flexible name handling**
   - Ask "What should we use for your email?" explicitly
   - Handle nicknames that differ from legal names
   - Support for special characters with proper transliteration

2. **City-based suggestions**
   - Use city abbreviations in domains (e.g., "andreas.cph.dk")
   - Combine name + city code (e.g., "akbcn.io" for Barcelona)
   - Local TLD suggestions based on city

3. **AI-powered creative "magic moments"**
   - Research specific entities mentioned in interests
   - Example: "Silkeborg IF" → Founded 1917 → Suggest "andr17.dk" or "ak17.io"
   - Example: "Pink Floyd" → "Dark Side" released 1973 → Suggest "andreas73.me"
   - Use web search to find relevant dates, numbers, or associations
   - Make it feel personalized and thoughtful, not robotic

4. **Interest depth (optional)**
   - Could ask follow-up: "Any specific types of technology?"
   - Balance depth vs. speed
   - Keep it light and skippable

5. **Profession context**
   - Ask industry or sector for better suggestions
   - Handle "freelancer", "self-employed" specially

6. **Email usage context**
   - Ask: "What will you use this email for?" (personal, business, portfolio)
   - Influences domain style (serious vs. creative)

7. **Budget awareness**
   - Some TLDs cost more (.io vs .com vs .me)
   - Could ask budget preference early
