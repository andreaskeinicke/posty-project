# Posty Questionnaire Flow - Streamlined Version

## Overview
A clean, step-by-step questionnaire flow (4-6 questions) that guides users to their perfect email domain. One question per screen, with conditional logic and progress tracking.

---

## Question Flow

### Question 1: **Domain Preference** (Choice - Path Determining)

**Question Text:**
"How would you like to start?"

**Options:**
- (a) I have a specific domain in mind
- (b) Help me find my dream email address

**Type:** `choice` (single selection)

**Validation:** Required

**Purpose:**
- Determines the user's path through the questionnaire
- Path (a): Direct domain availability check
- Path (b): Full questionnaire to generate personalized recommendations

**Logic:**
- If option (a) selected:
  - Ask user to input their desired domain
  - Check availability via Cloudflare API
  - If available: Show pricing and purchase flow
  - If not available: Show alternatives and suggest option (b) with message: "This domain isn't available. Want us to help you find an even better one?"
- If option (b) selected:
  - Continue to Question 2

---

### Question 2: **Full Name** (Text Input)

**Question Text:**
"What's your full name?"

**Type:** `text`

**Placeholder:** "Andreas Keinicke Gustavsen"

**Validation:**
- Required
- Minimum 2 characters
- Handle international characters (ø, ä, ñ, etc.)

**Processing:**
- Parse into firstName, middleName, lastName
- Generate normalized ASCII version for domain compatibility
- Create short handles (e.g., "anke", "akg", "andrg")
- Show transliteration if special characters detected:
  - Example: "For 'Søren' we'll use 'soren' in domains"

**Character Normalization Rules:**
- Scandinavian: ø→o, æ→ae, å→aa
- German: ü→ue, ä→ae, ö→oe, ß→ss
- French: é/è/ê→e, à/â→a, ç→c
- Spanish: ñ→n, á→a, í→i, ó→o, ú→u
- Portuguese: ã→a, õ→o
- Eastern European: ł→l, ż/ź→z, ś→s, č/ć→c

**Purpose:**
- Foundation for all name-based domain suggestions
- Generate personalized handles and variations

---

### Question 3: **Primary Use Case** (Single Choice)

**Question Text:**
"What will you primarily use this email for?"

**Options:**
- Personal use
- Work
- Side hustle
- Hobby project
- Other
- All of the above

**Type:** `choice` (single selection)

**Validation:** Required

**Purpose:**
- Determines tone and style of domain suggestions
- Triggers conditional Question 5 if "Work" or "Side hustle" selected
- Influences recommendation engine priority

**Logic:**
- If "Work" OR "Side hustle" selected:
  - Set flag to show Question 5 (Profession)
  - Total questions: 6
- If any other option selected:
  - Skip Question 5
  - Total questions: 5

---

### Question 4: **Location** (Text Inputs)

**Question Text:**
"Where do you live?"

**Type:** Compound input
- Country: `text` (typeform-style autocomplete)
- City: `text` (simple text input)

**Placeholders:**
- Country: "Type your country..."
- City: "Type your city..."

**Validation:**
- Country: Required
- City: Optional (but encouraged)

**Processing:**
- Map country to relevant TLDs:
  - Denmark → .dk, .eu
  - USA → .us, .io, .me
  - UK → .uk, .io
  - Spain → .es, .eu
  - Germany → .de, .eu
  - Default → .com, .io, .me
- Check if city has standard abbreviation:
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

**Purpose:**
- Suggest location-specific TLDs
- Enable city-based domain suggestions (e.g., "andreascph.dk")
- Show local identity in recommendations

---

### Question 5: **Profession/Business** (Text Input - CONDITIONAL)

**Condition:** ONLY show if Question 3 answer = "Work" OR "Side hustle"

**Question Text:**
- If "Work" selected: "What's the name of your business or company?"
- If "Side hustle" selected: "What's your profession or industry?"

**Type:** `text`

**Placeholder:**
- For "Work": "e.g., Acme Corp, Jensen & Partners, Bright Ideas Studio"
- For "Side hustle": "e.g., Software Developer, Marketing Consultant, Graphic Designer"

**Validation:**
- Required (when shown)
- Minimum 2 characters

**Processing:**
- If "Work": Store as business name for business-specific domain suggestions
- If "Side hustle": Split multiple professions if user lists them:
  - "founder and consultant" → ["founder", "consultant"]
  - "developer, designer" → ["developer", "designer"]
- Normalize capitalization
- Each profession gets its own domain category in recommendations

**Purpose:**
- **Work**: Generate business-branded email addresses for company use
- **Side hustle**: Generate profession-specific domain suggestions
- Create targeted recommendations per profession/business
- Examples: "andreas@acmecorp.dk", "andreasfounder.dk", "andreasconsult.io"

**Note:** Each profession generates separate suggestions - they are NOT combined

---

### Question 6: **Interests** (Text Input - Optional)

**Question Text:**
"Any hobbies or interests you'd like reflected?"

**Subtitle/Helper Text:**
"Optional - but it helps us get creative!"

**Type:** `text`

**Placeholder:** "e.g., photography, sailing, football, tech"

**Validation:**
- Optional (can be skipped)
- Show "Skip" button prominently

**Processing:**
- Split comma-separated or "and"-separated lists
- Identify specific entities (sports teams, bands, etc.)
- Flag entities for creative AI research:
  - Example: "Silkeborg IF" → Research founding year (1917) → Generate creative suggestions with "17"
  - Example: "Pink Floyd" → Research album years → Creative domain ideas

**Purpose:**
- Enable "magic moment" creative domain suggestions
- Add personality to recommendations
- Show that Posty really listens and understands

**Special Handling:**
- If "skip" or "none" → Perfectly fine, continue
- If very generic ("stuff", "things") → Gently encourage or skip
- If specific entities mentioned → Research for creative suggestions

---

## Progress Indicator

**Format:** "Question X of Y"

**Dynamic Count:**
- If "Work" or "Side hustle" selected: "Question X of 6"
- Otherwise: "Question X of 5"

**Visual:**
- Progress bar at top of screen
- Percentage calculated: (currentQuestion / totalQuestions) * 100
- Smooth transitions between questions

---

## Navigation

**Back Button:**
- Always available (except on Question 1)
- Label: "Back"
- Returns to previous question
- Preserves previous answers

**Next/Continue Button:**
- Label changes based on context:
  - Questions 1-5: "Next"
  - Last question: "Find My Email Address"
- Disabled if required field not filled
- On last question: Submits to recommendation engine

**Skip Button:**
- Only shown on Question 6 (Interests)
- Label: "Skip"
- Advances to results without requiring input

---

## Data Structure

```javascript
{
  // Question 1
  domainPreference: "help_find", // "specific_domain" or "help_find"
  specificDomain: "example.com", // Only if (a) selected

  // Question 2
  fullName: "Andreas Keinicke Gustavsen",
  firstName: "Andreas",
  middleName: "Keinicke",
  lastName: "Gustavsen",
  preferredName: "andreas",
  normalizedName: "andreas",
  handles: ["anke", "akg", "andrg"],

  // Question 3
  primaryUseCase: "work", // "personal", "work", "side_hustle", "hobby", "other", "all"

  // Question 4
  country: "Denmark",
  city: "Copenhagen",
  cityAbbreviation: "cph",
  tlds: [".dk", ".eu", ".me"],

  // Question 5 (conditional)
  // If primaryUseCase = "work":
  businessName: "Acme Corp",

  // If primaryUseCase = "side_hustle":
  profession: "founder, consultant",
  professions: ["founder", "consultant"], // Parsed array

  // Question 6 (optional)
  interests: "football, Silkeborg IF, sailing",
  interestsList: ["football", "Silkeborg IF", "sailing"], // Parsed array
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

## Integration with Recommendation Engine

**Handoff Point:** After final question submission

**IMPORTANT:** All domain suggestions must be presented as **complete email addresses**, not just domains.
- Format: `yourname@domain.ext`
- Example: `andreas@ak.io`, `contact@acmecorp.dk`, `hello@andreascph.me`
- This helps users immediately visualize their actual email address

**Process:**
1. Collect all answers
2. If domainPreference = "specific_domain":
   - Check domain availability via Cloudflare
   - Return availability status
   - Present as email address format
3. If domainPreference = "help_find":
   - Pass data to recommendation engine
   - Generate suggestions across all 10 categories:
     1. Name-based
     2. City-based
     3. Interest-based
     4. Profession-based (per profession)
     5. Business-based (if "Work" selected)
     6. Creative AI-powered
   - Return categorized suggestions **as email addresses**

**Recommendation Categories Used:**
- Your Name (ultra-short handles) → `you@ak.io`
- Your Location (city-based) → `andreas@cph.dk`
- Personal Brand (name variations) → `hello@andreas.me`
- Professional Identity (profession-specific) → `contact@andreasfounder.dk`
- Business Identity (if "Work" selected) → `andreas@acmecorp.dk`, `contact@acmecorp.dk`
- Creative/Interest-based (hobby domains) → `hello@andreasski.me`
- AI Magic Moments (researched entities) → Creative email addresses

---

## UX Principles

### Tone
- Proactive and confident, not permission-seeking
- Examples:
  - ✅ "What's your full name?"
  - ❌ "Can you tell me your name?"
  - ✅ "Where do you live?"
  - ❌ "Would you mind sharing your location?"

### Speed
- Target completion time: Under 2 minutes
- Minimize typing where possible
- Smart defaults and autocomplete

### Purpose
- Every question should feel purposeful
- No unnecessary or vague questions
- Clear benefit to answering

### Simplicity
- One question per screen
- No overwhelming multi-part questions
- Clean, minimal UI

---

## Validation Rules Summary

| Question | Required | Min Length | Special Handling |
|----------|----------|------------|------------------|
| Domain Preference | Yes | N/A | Binary choice |
| Full Name | Yes | 2 chars | Normalize special characters |
| Primary Use Case | Yes | N/A | Triggers conditional logic |
| Location (Country) | Yes | 2 chars | Map to TLDs |
| Location (City) | Optional | - | Map to abbreviations |
| Profession | Conditional | 2 chars | Only if work-related use case |
| Interests | Optional | - | Can skip entirely |

---

## Error Handling

**Empty Required Fields:**
- Show inline error: "This field is required"
- Disable "Next" button until filled

**Invalid Input:**
- Name too short: "Please enter your full name"
- No country selected: "Please select your country"

**Network Errors:**
- If domain check fails: "Couldn't check availability. Try again?"
- If submission fails: "Something went wrong. Please try again."

---

## Mobile Responsiveness

- Large, touch-friendly buttons
- Full-screen questions on mobile
- Keyboard optimization:
  - Text inputs: Standard keyboard
  - Country: Show keyboard with autocomplete
- Progress bar always visible at top
- Back button easily accessible

---

## Accessibility

- Keyboard navigation support
- ARIA labels for all inputs
- Clear focus states
- Screen reader friendly
- High contrast text
- Minimum font size: 16px

---

## Future Enhancements

1. **Smart Suggestions:**
   - As user types country, show autocomplete dropdown
   - As user types city, suggest major cities

2. **Visual Previews:**
   - Show example domains updating in real-time as they type their name
   - "Preview: andreas.dk" while typing

3. **Personality Detection:**
   - Adjust tone based on use case selection
   - Professional tone for "Work"
   - Playful tone for "Hobby project"

4. **Save & Resume:**
   - Auto-save answers to session storage
   - Allow users to resume if they refresh

5. **A/B Testing:**
   - Test different question orders
   - Test phrasing variations
   - Optimize conversion rates

---

## Technical Implementation Notes

**State Management:**
- Use React useState for current question tracking
- Store all answers in single state object
- Persist to sessionStorage on each answer

**Routing:**
- Replace current landing page with questionnaire
- Show landing → questionnaire → results flow
- Allow "Back" navigation without losing state

**Animations:**
- Smooth transitions between questions
- Fade in/out effects
- Progress bar animation

**API Integration:**
- Domain check: POST /api/domain/check
- Submit questionnaire: POST /api/questionnaire/analyze
- Response includes categorized domain suggestions
