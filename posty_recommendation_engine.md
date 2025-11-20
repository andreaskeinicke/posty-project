# Posty Domain Recommendation Engine - 11 Categories

## Overview

The Posty Recommendation Engine generates personalized email domain suggestions across **11 distinct categories**. Each category is designed to create memorable, relevant, and available domain options based on the user's questionnaire responses.

**Core Principle:** All recommendations are presented as **complete email addresses** (e.g., `andreas@ak.io`, `contact@acmecorp.dk`, `hello@andreas.gustavsen.com`) to help users immediately visualize their actual email.

---

## The 11 Categories

### Category 1: Ultra-Short Handles ⭐

**Priority:** Highest (1)

**Description:** The most valuable and memorable domains - ultra-short handles derived from initials and name combinations.

**Maximum Length:** 10 characters total (including TLD)

**Generation Logic:**
- Extract initials from full name (2-3 characters)
- Create short handles from name combinations
- Combine with premium TLDs (.io, .me, .dk)
- Filter to only domains ≤ 10 total characters

**Email Address Examples:**
- `you@ak.io` (Andreas Keinicke - 2 initials)
- `hello@anke.me` (first 2 + last 2)
- `hi@akg.dk` (3 initials)
- `me@js.io` (John Smith)

**Why It's Highest Priority:**
- Extremely memorable and easy to type
- Professional and clean
- High perceived value
- Premium domain territory

---

### Category 2: Personal Brand

**Priority:** High (1-2)

**Description:** Name-based domains that establish personal brand identity using first name or full name combinations.

**Maximum Length:** 18 characters for full name combinations

**Generation Logic:**
- First name only: `firstname.tld`
- Full name: `firstnamelastname.tld` (if ≤ 18 chars)
- Prioritize country-specific TLDs first

**Email Address Examples:**
- `hello@andreas.dk`
- `hi@andreas.me`
- `contact@andreask.com` (first + middle initial)
- `andreas@johnsmith.io` (full name)

**Email Prefix Options:**
- Personal: `hello@`, `hi@`, `me@`, `you@`
- Professional: `contact@`, firstname@

**Why It's Valuable:**
- Strong personal branding and name recognition
- Professional identity
- SEO benefits for personal brand
- Works for all contexts

---

### Category 3: Professional Identity

**Priority:** Medium (3-4)

**Description:** Combines name with profession to create role-specific email addresses. Each profession selected generates its own set of suggestions.

**Condition:** Only when user selects "Side hustle" use case

**Maximum Length:** 20 characters

**Generation Logic:**
- Name + profession: `nameprof.tld`
- Profession + name: `profname.tld`
- Abbreviated profession: `shortprofname.tld` (first 4 letters)

**Email Address Examples:**
- `andreas@andreasfounder.dk`
- `contact@founderandreas.io`
- `hello@founandreas.me` (abbreviated)
- `john@consultjohn.com`
- `hi@devjohn.io`

**Important:** Each profession creates its own separate category
- "founder, consultant" → 2 separate categories
- NOT combined together

**Common Professions:**
- Developer, Designer, Consultant, Founder, Marketing, Engineer, Writer, Photographer, Architect, Coach

---

### Category 4: City-Based 📍

**Priority:** Medium-High (2-3)

**Description:** Location-based domains that incorporate city abbreviations for local identity and geographic branding.

**Condition:** Only for major cities with standard abbreviations

**Maximum Length:** 18 characters

**Generation Logic:**
- Name + city: `namecity.tld`
- City + name: `cityname.tld`
- Handle + city: `handlecity.tld` (ultra-short variant)

**Email Address Examples:**
- `andreas@andreascph.dk` (Copenhagen)
- `hello@cphandreas.me`
- `you@akcph.dk`
- `contact@johnnyc.io` (New York)
- `hi@saraldn.uk` (London)

**City Abbreviations Map:**
| City | Abbr | City | Abbr |
|------|------|------|------|
| Copenhagen | cph | Barcelona | bcn |
| London | ldn | New York | nyc |
| Los Angeles | la | San Francisco | sf |
| Paris | par | Berlin | ber |
| Amsterdam | ams | Tokyo | tyo |

**Why It's Valuable:**
- Local market appeal
- Geographic targeting and community connection
- Regional SEO
- Memorable for location-based professionals

---

### Category 5: Interest-Based

**Priority:** Medium-Low (4)

**Description:** Domains that reflect hobbies, passions, and interests to add personality and context to email addresses.

**Maximum Length:** 20 characters

**Generation Logic:**
- Interest + name: `interestname.tld` (if interest ≤ 8 chars)
- Name + abbreviated interest: `nameshortint.tld`
- Limit to top 3 interests from questionnaire

**Email Address Examples:**
- `andreas@skiandreas.me`
- `hello@andreasski.dk`
- `contact@runandreas.io`
- `john@fotojohn.com` (photography)
- `sarah@sailsarah.me`

**Interest Abbreviations:**
- photography → foto/photo
- football → ball/foot
- technology → tech
- running → run

**Why It's Valuable:**
- Personal connection and memorable personality
- Niche marketing
- Conversation starter
- Shows individuality

---

### Category 6: Business Identity 💼

**Priority:** High (2) - *Business context only*

**Description:** Company or business-branded email addresses for professional business communication.

**Condition:** **Only** when user selects "Work" as primary use case and provides business name

**Generation Logic:**
- Normalize business name (remove spaces, special chars, "&", etc.)
- Create variations with common business email prefixes
- Use country-specific TLDs first

**Email Address Examples:**
- `andreas@acmecorp.dk`
- `contact@acmecorp.dk`
- `hello@acmecorp.com`
- `info@brightideas.io`
- `team@jensenpartners.dk`

**Common Business Email Prefixes:**
- `firstname@businessname.tld` (personalized)
- `contact@businessname.tld` (general inquiry)
- `hello@businessname.tld` (friendly)
- `info@businessname.tld` (traditional)
- `team@businessname.tld` (collaborative)
- `hi@businessname.tld` (modern)

**Business Name Normalization:**
- "Acme Corp" → `acmecorp`
- "Jensen & Partners" → `jensenpartners`
- "Bright Ideas Studio" → `brightideas`

**Why It's Valuable:**
- Professional business identity
- Brand consistency
- Team collaboration
- Client-facing credibility

---

### Category 7: Profession-Based (Per Profession)

**Priority:** Medium (3)

**Description:** Similar to Professional Identity (Category 3), but creates a dedicated sub-category for each individual profession when multiple are listed.

**Condition:** Only for "Side hustle" use case with multiple professions

**Generation Logic:**
- Each profession gets its own separate category
- Generate variations per profession independently
- Do NOT mix professions together

**Example Scenario:**
User lists: "founder, consultant"

**Sub-Category 7a: Profession - Founder**
- `andreas@andreasfounder.io`
- `contact@founderandreas.dk`
- `hello@founandreas.me`

**Sub-Category 7b: Profession - Consultant**
- `andreas@consultandreas.io`
- `contact@andreasconsult.dk`
- `hello@consandreas.me`

**Why Separate Categories:**
- Each profession may target different audiences
- User might want profession-specific emails
- Clear segmentation of professional identities
- Better organization in results

---

### Category 8: Name-Based Variations

**Priority:** Medium (2-3)

**Description:** Extended variations of name combinations including middle names, middle initials, and alternative name formatting.

**Maximum Length:** 20 characters

**Generation Logic:**
- First + middle initial: `firstnamem.tld`
- Initials + last name: `iilastname.tld`
- Middle name only: `middlename.tld`
- First + middle: `firstmiddle.tld`

**Email Address Examples:**
- `hello@andreask.dk` (Andreas Keinicke → first + middle initial)
- `contact@akgustavsen.com` (AK + last name)
- `hi@keinicke.dk` (middle name only)
- `you@johnmsmith.io` (first + middle initial + last)
- `me@jmsmith.com` (initials + last)

**Why It's Valuable:**
- Disambiguation for common names
- Professional alternatives when first name is taken
- More availability options
- Family name recognition
- Formal tone option

---

### Category 9: Separator-Based Names

**Priority:** Medium-High (2-3)

**Description:** Uses separators (dots and underscores) to create readable multi-word domains that are more likely to be available. This dramatically increases options when simple names are taken.

**Maximum Length:** 25 characters

**Separators Allowed:**
- **Dot (.)** - Most common and professional: `first.last.tld`
- **Underscore (_)** - Alternative when dots taken: `first_last.tld`

**Generation Logic:**
- First.Last: `firstname.lastname.tld`
- First.Middle.Last: `first.middle.last.tld`
- Name.Profession: `name.profession.tld`
- Name.City: `name.city.tld`
- Name.Interest: `name.interest.tld`
- First_Last: `firstname_lastname.tld` (fallback)

**Email Address Examples:**
- `andreas@andreas.keinicke.dk` (first.middle)
- `hello@andreas.gustavsen.com` (first.last)
- `andreas@andreas.founder.io` (name.profession)
- `contact@andreas.cph.dk` (name.city)
- `hello@andreas.ski.me` (name.interest)
- `andreas@andreas_keinicke.dk` (underscore fallback)
- `contact@bright.ideas.com` (business with separator)

**Profession Variations:**
- `andreas@andreas.dev.io`
- `hello@john.design.com`
- `contact@sarah.consulting.dk`

**City Variations:**
- `andreas@andreas.copenhagen.dk` (full city name)
- `hello@john.nyc.io` (city abbreviation)
- `contact@maria.bcn.es`

**Interest Variations:**
- `andreas@andreas.photography.me`
- `hello@john.tech.io`
- `contact@sarah.sailing.dk`

**Why It's Highly Valuable:**
- **Dramatically higher availability** - Most firstname.lastname combinations are available
- **Professional and readable** - Dots are widely accepted in email addresses
- **Maintains full name** - No need to abbreviate or use initials
- **SEO benefits** - Full words are better for search
- **Fallback option** - When all simple names are taken

**Technical Notes:**
- Dots (.) are valid in email local parts (before @)
- Underscores (_) are also valid but less common
- Some email systems may have issues with dots, but modern systems handle them fine
- **Important:** Cannot start or end with a dot, and cannot have consecutive dots

**Separator Priority:**
1. **Dot (.) first** - More professional and common
2. **Underscore (_) fallback** - If dot version is taken

---

### Category 10: Hybrid Combinations

**Priority:** Variable (3-4)

**Description:** Creative combinations mixing multiple category elements (profession + city, interest + city, profession + interest, etc.) WITHOUT separators.

**Maximum Length:** 22 characters

**Generation Logic:**
- Profession + city: `profcity.tld`
- Interest + city: `interestcity.tld`
- Interest + profession: `interestprof.tld` (careful with length)
- Name + interest abbreviation + city: `nameintcity.tld`

**Email Address Examples:**
- `contact@foundercph.dk` (Profession + city)
- `hello@skicph.me` (Interest + city)
- `andreas@technyc.io` (Interest + city)
- `hello@devcph.dk` (Profession + city)
- `hi@fotobcn.es` (photography + Barcelona)

**Combination Rules:**
- Maximum 2-3 elements combined
- Prioritize shorter combinations
- Must remain memorable and pronounceable
- Avoid confusing combinations

**Why It's Valuable:**
- Unique, multi-faceted combinations
- Higher availability than single-element domains
- Shows multi-dimensional identity
- Creative and memorable options

---

### Category 11: Alternative TLDs

**Priority:** Variable (depends on base category)

**Description:** Takes successful patterns from Categories 1-9 and applies them across alternative TLD options not initially suggested based on location.

**Generation Logic:**
- Use proven patterns from other categories
- Apply alternative TLDs beyond country-specific ones
- Group by TLD family (generic, modern, country, creative)

**Alternative TLD Groups:**

**Generic:** .com, .net, .org
**Modern:** .io, .me, .co
**Country:** .uk, .de, .es, .fr, .dk, .se, .no, .fi, .eu
**Creative:** .email, .studio, .works, .tech, .design, .dev

**Email Address Examples:**

If `andreas@ak.io` pattern is successful, also try:
- `andreas@ak.me`
- `andreas@ak.co`
- `contact@ak.email`

If `hello@andreas.dk` exists, try alternative TLDs:
- `hello@andreas.me`
- `hello@andreas.com`
- `hello@andreas.io`
- `hello@andreas.email`

**TLD Prioritization by Country:**

| Country | Primary TLDs | Alternative TLDs |
|---------|-------------|------------------|
| Denmark | .dk, .eu | .me, .io, .com |
| USA | .com, .us | .io, .me, .co |
| UK | .uk, .co.uk | .io, .me, .com |
| Germany | .de, .eu | .io, .me, .com |
| Spain | .es, .eu | .io, .me, .com |

**Why It's Valuable:**
- Availability fallback when primary TLD is taken
- Price options (some TLDs cheaper/more expensive)
- TLD preference accommodation
- Geographic flexibility
- Industry-specific TLDs (.tech, .design)

---

## Email Prefix Strategy

All domain suggestions must include appropriate email prefixes to create complete, usable email addresses.

### Standard Email Prefixes by Context

**Personal Use:**
- `you@domain.ext` - Direct and personal
- `hello@domain.ext` - Friendly and approachable
- `hi@domain.ext` - Casual and warm
- `me@domain.ext` - Personal brand
- `firstname@domain.ext` - Traditional personal

**Professional/Work:**
- `contact@domain.ext` - Professional standard
- `info@domain.ext` - Traditional business
- `hello@domain.ext` - Modern professional
- `firstname@domain.ext` - Personalized business
- `team@domain.ext` - Collaborative

**Creative/Casual:**
- `hey@domain.ext` - Very casual
- `yo@domain.ext` - Playful
- `sup@domain.ext` - Informal

### Prefix Selection Rules

1. **Ultra-short domains** (≤10 chars total): Use `you@`, `me@`, `hi@`
2. **Business domains**: Use `contact@`, `info@`, `firstname@`, `team@`
3. **Personal brand**: Use `hello@`, `hi@`, `firstname@`
4. **Professional identity**: Use `contact@`, `hello@`, `firstname@`
5. **City-based**: Use `firstname@`, `hello@`, `you@`
6. **Interest-based**: Use `hello@`, `hi@`, `firstname@`

### Multiple Prefix Variations

Show each domain with 2-3 prefix variations to give users options:

```
Primary suggestion: andreas@ak.io
Also available: you@ak.io, hello@ak.io
```

---

## Priority & Sorting System

### Priority Levels

Domains are ranked by priority to surface the best options first:

| Priority | Score | Categories | User Value |
|----------|-------|------------|-----------|
| **Highest** | 1 | Ultra-Short, Personal Brand | Most memorable, highest perceived value |
| **High** | 2 | City-Based, Business, Name Variations | Strong identity, professional |
| **Medium** | 3 | Professional, Hybrid, Profession-Based | Contextual, specific use cases |
| **Lower** | 4 | Interest-Based, Alternative TLDs | Creative options, availability fallbacks |

### Sorting Algorithm

1. **Primary sort:** By priority (1 → 4)
2. **Secondary sort:** Within same priority, by length (shorter first)
3. **Tertiary sort:** Within same length, alphabetically

### Domain Length Guidelines

| Category | Max Length | Reason |
|----------|-----------|---------|
| Ultra-Short | 10 chars | Maximum memorability |
| Personal Brand | 18 chars | Name combinations |
| Professional | 20 chars | Name + profession fit |
| City-Based | 18 chars | Name + location |
| Interest-Based | 20 chars | Name + hobby |
| Business | 25 chars | Company names can be longer |
| Hybrids | 22 chars | Multiple elements |

**Optimal Range:** 8-15 characters (including TLD)
**Why:** Short domains are easier to remember, type, and are more valuable

---

## Deduplication & Output

### Deduplication Rules

1. Check for exact domain matches across all categories
2. Remove duplicates, keep only the highest priority version
3. Maintain one instance per unique domain+prefix combination
4. Track which categories generated each domain

### Output Format - JSON Structure

```json
{
  "userId": "user123",
  "recommendations": [
    {
      "email": "andreas@ak.io",
      "domain": "ak.io",
      "prefix": "andreas",
      "category": "ultra-short-handles",
      "priority": 1,
      "length": 12,
      "description": "Ultra-short and memorable",
      "pattern": "initials + premium TLD",
      "available": true,
      "pricing": {
        "currency": "USD",
        "amount": 35.00,
        "period": "year",
        "registrar": "Cloudflare"
      },
      "alternativePrefixes": ["you", "hello", "hi"]
    },
    {
      "email": "contact@acmecorp.dk",
      "domain": "acmecorp.dk",
      "prefix": "contact",
      "category": "business-identity",
      "priority": 2,
      "length": 20,
      "description": "Professional business email",
      "pattern": "business name + country TLD",
      "available": true,
      "pricing": {
        "currency": "USD",
        "amount": 15.00,
        "period": "year",
        "registrar": "Cloudflare"
      },
      "alternativePrefixes": ["andreas", "hello", "info", "team"]
    }
  ],
  "categorized": {
    "ultra-short-handles": [...],
    "personal-brand": [...],
    "business-identity": [...],
    "city-based": [...],
    "profession-founder": [...],
    "interest-based": [...]
  },
  "totalGenerated": 247,
  "totalAvailable": 156,
  "totalShown": 50
}
```

### Display Format (UI)

**Category Header:** "✨ Ultra-Short Handles"
**Subtitle:** "The most memorable email addresses"

```
✅ andreas@ak.io           $35/year    [Select]
   Also: you@ak.io, hello@ak.io

✅ hello@anke.me           $25/year    [Select]
   Also: hi@anke.me, me@anke.me

❌ you@akg.dk              Taken
   Try: hello@akg.me ($25/year)
```

---

## Special Cases & Edge Cases

### Common Names (John Smith, Maria Garcia)
- Prioritize middle initials and city-based early
- Include more hybrid combinations
- Suggest creative number additions (birth year, lucky number)

### International Characters (Søren, José, Björk)
- Automatically transliterate (ø→o, ä→ae, ñ→n)
- Show transliteration message to user
- Apply normalization to all categories
- Example: "For 'Søren' we'll use 'soren' in domains"

### Multiple Professions
- Create separate sub-category per profession
- Do NOT combine professions together
- Maintain clear separation in UI
- Label each: "For your Founder work", "For your Consultant work"

### No City Provided
- Skip city-based category gracefully
- Do not show empty category
- Focus on other strong categories

### No Interests Provided
- Skip interest-based category
- Increase suggestions in other categories
- More TLD variations instead

### Very Short Names (Li, Bo, Wu)
- Great for ultra-short domains!
- `li.io`, `bo.me`, `wu.dk`
- Generate more variations with middle/last names

### Very Long Names (Christopher Bartholomew)
- Focus on abbreviations and initials
- `cbh.io`, `chris.me`, `chrisb.dk`
- Avoid full name domains (too long)

---

## Integration with Questionnaire

### Data Flow

**Input from Questionnaire:**
```javascript
{
  // Question 2 - Name
  fullName: "Andreas Keinicke Gustavsen",
  firstName: "Andreas",
  middleName: "Keinicke",
  lastName: "Gustavsen",
  preferredName: "andreas",
  handles: ["ak", "anke", "akg"],

  // Question 3 - Use Case
  primaryUseCase: "work", // or "side_hustle", "personal", etc.

  // Question 4 - Location
  country: "Denmark",
  city: "Copenhagen",
  cityAbbreviation: "cph",
  tlds: [".dk", ".eu", ".me"],

  // Question 5 - Business/Profession (conditional)
  businessName: "Bright Ideas", // if "work"
  profession: "founder, consultant", // if "side_hustle"
  professions: ["founder", "consultant"],

  // Question 6 - Interests (optional)
  interests: "skiing, photography",
  interestsList: ["skiing", "photography"]
}
```

**Output Categories Generated:**

Based on use case:

**If "Work" selected:**
1. Ultra-Short Handles
2. Personal Brand
3. **Business Identity** ⭐
4. City-Based (if city provided)
5. Interest-Based (if interests provided)
6. Name Variations
7. **Separator-Based Names** ⭐
8. Hybrid Combinations
9. Alternative TLDs

**If "Side hustle" selected:**
1. Ultra-Short Handles
2. Personal Brand
3. **Professional Identity** ⭐
4. **Profession-Based (per profession)** ⭐
5. City-Based (if city provided)
6. Interest-Based (if interests provided)
7. Name Variations
8. **Separator-Based Names** ⭐
9. Hybrid Combinations
10. Alternative TLDs

**If "Personal" or other:**
1. Ultra-Short Handles
2. Personal Brand
3. City-Based (if city provided)
4. Interest-Based (if interests provided)
5. Name Variations
6. **Separator-Based Names** ⭐
7. Hybrid Combinations
8. Alternative TLDs

---

## Implementation Architecture

### File Structure

```
backend/
  services/
    domainRecommendationEngine.js    # Main engine class
    emailGenerator.js                 # Email prefix logic
    cloudflareService.js             # Domain availability API
    nameNormalizer.js                # Character transliteration
```

### Key Functions

```javascript
// Main entry point
generateRecommendations(profile) → Array<Domain>

// Category generators
generateUltraShortHandles(handles, tlds) → Array<Domain>
generatePersonalBrand(firstName, lastName, tlds) → Array<Domain>
generateProfessionalIdentity(name, professions, tlds) → Array<Domain>
generateCityBased(name, handles, city, tlds) → Array<Domain>
generateInterestBased(name, interests, tlds) → Array<Domain>
generateBusinessIdentity(name, business, tlds) → Array<Domain>
generateProfessionBased(name, professions, tlds) → Array<Domain>
generateNameVariations(firstName, middleName, lastName, tlds) → Array<Domain>
generateSeparatorBased(profile, tlds) → Array<Domain>
generateHybridCombinations(profile, tlds) → Array<Domain>
generateAlternativeTLDs(patterns, allTlds) → Array<Domain>

// Utilities
deduplicateAndSort(domains) → Array<Domain>
groupByCategory(domains) → Object
addEmailPrefixes(domains, useCase) → Array<Domain>
checkAvailability(domains) → Promise<Array<Domain>>
normalizeName(name, country) → string
generateHandles(firstName, middleName, lastName) → Array<string>
```

---

## Performance Considerations

### Generation Performance

- **Target:** Generate 200-300 domains in < 500ms
- **Approach:** Synchronous generation, async availability check
- **Optimization:** Pre-compute handles, memoize normalizations

### Availability Checking

- **Batch API calls:** Check 10-20 domains per request
- **Parallel requests:** Multiple batches simultaneously
- **Caching:** Cache results for 15 minutes per domain
- **Fallback:** If API fails, show all with "Check availability" button

### Response Size

- **Total generated:** 200-300 domains
- **Check availability for:** Top 100 by priority
- **Return to client:** Top 50 available domains
- **Pagination:** Load more if user scrolls

---

## Success Metrics

### Quality Metrics

**Good Recommendations:**
- 80%+ of top 20 suggestions are available
- User selects within first 20 options
- High perceived value (short, memorable domains)
- Mix of practical + creative options
- At least 3 different categories represented

**Category Performance:**
- Track which categories get most selections
- Monitor availability rates per category
- A/B test category ordering
- Adjust priority based on success rates

### User Engagement

- Time to first selection
- Number of domains viewed before selection
- Category preference patterns
- Email prefix preferences
- TLD preferences by country

---

## Future Enhancements

### Phase 1: Enhanced Creativity
- **AI-powered wordplay:** Puns, rhymes, alliteration
- **Entity research:** Sports teams, bands, dates
- **Semantic similarity:** Related terms and synonyms
- **Cultural references:** Location-specific idioms

### Phase 2: Machine Learning
- **Preference learning:** Track user selections
- **Pattern prediction:** Predict which styles users prefer
- **A/B testing:** Optimize category order
- **Personalization:** Adjust based on use case patterns

### Phase 3: Advanced Features
- **Price filtering:** Set budget range
- **TLD preferences:** Favorite TLD selection
- **Length preferences:** Short-only toggle
- **Category toggle:** Hide unwanted categories
- **Bulk checking:** Check custom domain lists

### Phase 4: Premium Features
- **Marketplace integration:** Buy taken domains
- **Premium suggestions:** Identify valuable domains
- **Domain appraisal:** Estimate domain value
- **Monitoring:** Alert when desired domain becomes available

---

## Example Full Generation Flow

### Input Profile

```javascript
{
  fullName: "Andreas Keinicke Gustavsen",
  firstName: "Andreas",
  middleName: "Keinicke",
  lastName: "Gustavsen",
  preferredName: "andreas",
  handles: ["ak", "anke", "akg"],
  primaryUseCase: "work",
  businessName: "Bright Ideas",
  country: "Denmark",
  city: "Copenhagen",
  cityAbbreviation: "cph",
  tlds: [".dk", ".eu", ".me", ".io"],
  interests: "skiing, photography"
}
```

### Generated Categories & Examples

**1. Ultra-Short Handles** (Priority 1)
- `you@ak.io` ⭐
- `hello@anke.me`
- `hi@akg.dk`

**2. Personal Brand** (Priority 1-2)
- `hello@andreas.dk`
- `andreas@andreask.com`
- `contact@keinicke.dk`

**3. Business Identity** (Priority 2) - *Because "Work" use case*
- `andreas@brightideas.dk` ⭐
- `contact@brightideas.io`
- `hello@brightideas.com`
- `team@brightideas.eu`

**4. City-Based** (Priority 2-3)
- `andreas@andreascph.dk`
- `hello@akcph.me`
- `you@cphandreas.io`

**5. Interest-Based** (Priority 4)
- `hello@skiandreas.me`
- `contact@fotoak.dk` (photo → foto)
- `andreas@andreasski.io`

**6. Name Variations** (Priority 2-3)
- `hello@andreask.dk` (first + middle initial)
- `contact@akgustavsen.com`
- `hi@keinicke.me`

**7. Separator-Based Names** (Priority 2-3) ⭐
- `andreas@andreas.gustavsen.dk` (first.last)
- `hello@andreas.keinicke.com` (first.middle)
- `andreas@andreas.founder.io` (name.profession)
- `contact@bright.ideas.dk` (business with separator)
- `hello@andreas.cph.me` (name.city)

**8. Hybrid Combinations** (Priority 3-4)
- `contact@foundercph.dk`
- `hello@skicph.me`
- `andreas@fotocph.io`

**9. Alternative TLDs** (Priority varies)
- `hello@andreas.me` (if .dk taken)
- `you@ak.co`
- `andreas@brightideas.email`
- `andreas@andreas.gustavsen.com` (separator with alt TLD)

**Total Generated:** ~220 domains (with separator category)
**After Availability Check:** ~160 available (separators increase availability)
**Shown to User:** Top 50

---

## Technical Implementation Notes

### Name Normalization

```javascript
// Special character mapping
const charMappings = {
  // Scandinavian
  'ø': 'o', 'ö': 'o', 'å': 'aa', 'æ': 'ae',
  // German
  'ü': 'ue', 'ä': 'ae', 'ö': 'oe', 'ß': 'ss',
  // French
  'é': 'e', 'è': 'e', 'ê': 'e', 'à': 'a', 'ç': 'c',
  // Spanish/Portuguese
  'ñ': 'n', 'á': 'a', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ã': 'a',
  // Eastern European
  'ł': 'l', 'ż': 'z', 'ź': 'z', 'ś': 's', 'č': 'c', 'ć': 'c'
};
```

### Handle Generation

```javascript
function generateHandles(first, middle, last) {
  const handles = [];

  // 2-letter initials
  handles.push(first[0] + last[0]); // "ag"

  // 3-letter initials (with middle)
  if (middle) handles.push(first[0] + middle[0] + last[0]); // "akg"

  // First name + last initial
  if (first.length <= 6) handles.push(first + last[0]); // "andreasg"

  // 4-letter combo
  handles.push(first.slice(0,2) + last.slice(0,2)); // "angu"

  // First 2 + middle 2 + last 2
  if (middle) handles.push(first.slice(0,2) + middle.slice(0,2) + last.slice(0,2)); // "ankegu"

  return [...new Set(handles)]; // Dedupe
}
```

### Domain Availability Check (Cloudflare API)

```javascript
async function checkAvailability(domains) {
  const batchSize = 10;
  const batches = chunk(domains, batchSize);

  const results = await Promise.all(
    batches.map(batch => cloudflareAPI.checkDomains(batch))
  );

  return results.flat();
}
```

### Separator-Based Generation

```javascript
function generateSeparatorBased(profile, tlds) {
  const { firstName, middleName, lastName, professions, city, interests, businessName } = profile;
  const domains = [];

  const first = firstName.toLowerCase();
  const middle = middleName?.toLowerCase();
  const last = lastName?.toLowerCase();

  // Helper to validate separator usage
  const isValidSeparator = (str) => {
    // Cannot start/end with dot, no consecutive dots
    return !str.startsWith('.') && !str.endsWith('.') && !str.includes('..');
  };

  tlds.forEach(tld => {
    // First.Last (most common pattern)
    if (last) {
      const domain = `${first}.${last}`;
      if (isValidSeparator(domain) && (domain + tld).length <= 25) {
        domains.push({
          domain: domain + tld,
          category: 'separator-based',
          priority: 2,
          description: 'Full name with separator',
          pattern: 'first.last'
        });
      }

      // Underscore fallback
      const underscoreDomain = `${first}_${last}`;
      if ((underscoreDomain + tld).length <= 25) {
        domains.push({
          domain: underscoreDomain + tld,
          category: 'separator-based',
          priority: 3,
          description: 'Full name with underscore',
          pattern: 'first_last'
        });
      }
    }

    // First.Middle or First.Middle.Last
    if (middle) {
      const firstMiddle = `${first}.${middle}`;
      if (isValidSeparator(firstMiddle) && (firstMiddle + tld).length <= 25) {
        domains.push({
          domain: firstMiddle + tld,
          category: 'separator-based',
          priority: 2,
          description: 'First and middle name',
          pattern: 'first.middle'
        });
      }

      if (last) {
        const fullName = `${first}.${middle}.${last}`;
        if (isValidSeparator(fullName) && (fullName + tld).length <= 25) {
          domains.push({
            domain: fullName + tld,
            category: 'separator-based',
            priority: 3,
            description: 'Full name separated',
            pattern: 'first.middle.last'
          });
        }
      }
    }

    // Name.Profession combinations
    if (professions && professions.length > 0) {
      professions.forEach(prof => {
        const nameProfDot = `${first}.${prof}`;
        if (isValidSeparator(nameProfDot) && (nameProfDot + tld).length <= 25) {
          domains.push({
            domain: nameProfDot + tld,
            category: 'separator-based',
            priority: 2,
            description: `${first} in ${prof}`,
            pattern: 'name.profession'
          });
        }
      });
    }

    // Name.City combinations
    if (city) {
      const cityLower = city.toLowerCase();
      const nameCityDot = `${first}.${cityLower}`;
      if (isValidSeparator(nameCityDot) && (nameCityDot + tld).length <= 25) {
        domains.push({
          domain: nameCityDot + tld,
          category: 'separator-based',
          priority: 3,
          description: `${first} in ${city}`,
          pattern: 'name.city'
        });
      }
    }

    // Name.Interest combinations (top 2 interests)
    if (interests && interests.length > 0) {
      interests.slice(0, 2).forEach(interest => {
        const interestLower = interest.toLowerCase();
        if (interestLower.length <= 12) { // Keep reasonable length
          const nameInterestDot = `${first}.${interestLower}`;
          if (isValidSeparator(nameInterestDot) && (nameInterestDot + tld).length <= 25) {
            domains.push({
              domain: nameInterestDot + tld,
              category: 'separator-based',
              priority: 3,
              description: `${first} + ${interest}`,
              pattern: 'name.interest'
            });
          }
        }
      });
    }

    // Business name with separators
    if (businessName) {
      // Split business name and join with dots
      const businessWords = businessName.toLowerCase()
        .replace(/[&,]/g, '') // Remove special chars
        .split(/\s+/) // Split on spaces
        .filter(w => w.length > 0);

      if (businessWords.length > 1) {
        const businessDot = businessWords.join('.');
        if (isValidSeparator(businessDot) && (businessDot + tld).length <= 25) {
          domains.push({
            domain: businessDot + tld,
            category: 'separator-based',
            priority: 2,
            description: 'Business name separated',
            pattern: 'business.name'
          });
        }
      }
    }
  });

  return domains;
}
```

---

## Conclusion

The 11-category recommendation engine provides comprehensive, personalized domain suggestions that balance memorability, availability, and user preferences. By presenting complete email addresses with multiple prefix options across diverse categories, users can immediately find and visualize their perfect professional email identity.

**Key Innovation: Separator-Based Category**
The addition of separator-based domains (Category 9) dramatically increases availability by allowing full names and readable multi-word combinations. This ensures users can always find a professional email address even when simple patterns are taken.

The system adapts intelligently based on:
- Primary use case (personal, work, side hustle)
- Geographic location (country-specific TLDs, city abbreviations)
- Professional context (business name vs. profession)
- Personal interests and hobbies
- Name characteristics (length, special characters)
- Availability patterns (separators as fallback options)

This ensures every user receives relevant, high-quality suggestions tailored to their specific needs and context, with the flexibility to use full names through separator-based domains when ultra-short options are unavailable.
