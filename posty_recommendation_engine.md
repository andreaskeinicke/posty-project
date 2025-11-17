# Posty Recommendation Engine

## Overview
The recommendation engine generates personalized domain suggestions based on collected user information. It prioritizes **short, memorable domains** over long descriptive ones.

---

## Input Data

```javascript
{
  preferredName: "andreas",      // User's preferred first name
  normalizedName: "andreas",     // ASCII version (for special chars)
  firstName: "Andreas",
  middleName: "Keinicke", 
  lastName: "Gustavsen",
  handles: ["anke", "akg", "andrg"], // Generated short handles
  country: "Denmark",
  city: "Copenhagen",
  cityAbbreviation: "cph",       // Major city abbreviation if applicable
  state: null,                   // Only for US
  tlds: [".dk", ".eu", ".me"],   // Location-based TLDs
  professions: ["founder", "consultant"],
  interests: ["football", "Silkeborg IF", "sailing"],
  interestEntities: [            // Researched entities for creative suggestions
    { 
      name: "Silkeborg IF",
      type: "sports_team",
      metadata: { founded: 1917, nickname: "17" }
    }
  ]
}
```

---

## Domain Categories

### 1. **Name-Based Domains** (Priority: Highest)
Simple, professional domains using the user's name.

**Generation Logic:**
- Use `preferredName` (e.g., "andreas")
- Use generated short handles (e.g., "anke", "akg", "andrg")
- Combine with location TLDs first, then generic TLDs

**Character Limit:** 8-15 characters (domain + TLD)

**Examples:**
- `andreas.dk`
- `anke.eu`
- `akg.io`
- `andrg.me`

**Why Priority:** Most professional, memorable, and versatile.

---

### 2. **City-Based Domains** (Priority: High)
Domains that incorporate the user's city, especially for major cities with recognizable abbreviations.

**Generation Logic:**
- Only generate if city has standard abbreviation (cph, bcn, ldn, nyc, la, sf, etc.)
- Combine with name/handles:
  - `{name}{cityAbbr}.{tld}` (e.g., "andreascph.dk")
  - `{handle}{cityAbbr}.{tld}` (e.g., "akgcph.io")
  - `{cityAbbr}{name}.{tld}` (e.g., "cphandreas.me")
- Subdomain style (if technically supported):
  - `{name}.{cityAbbr}.{tld}` (e.g., "andreas.cph.dk")

**Character Limit:** 10-16 characters

**Examples:**
For city: "Copenhagen" (cph), name: "andreas"
- `andreascph.dk`
- `akgcph.io` 
- `cphandreas.me`
- `cph17.dk` (if user born in '17 or other connection)

**City Abbreviation Mapping:**
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

**Why Priority:** Strong local identity, professional, memorable for location-based work.

---

### 3. **Interest-Based Domains** (Priority: Medium)
Domains that reflect personal interests or hobbies.

**Generation Logic:**
- Take first 2-3 interests
- Create short combinations:
  - `{interest}.{tld}` (if interest is short)
  - `{name}{interest}.{tld}` (if combined length ≤ 15 chars)
  - `{interestPrefix}{name}.{tld}` (first 3-4 letters of interest)

**Character Limit:** 12-18 characters

**Examples:**
For interests: ["technology", "sailing", "design"]
- `techking.dk` (if name = "king", tech + name)
- `sailandreas.io` (sailing + name)
- `andreas.design` (name + .design TLD)

**Selection Rules:**
- Prefer shorter interest words (e.g., "tech" over "technology")
- Only combine if result is < 15 chars
- Skip overly generic words ("stuff", "things")

---

### 4. **Profession-Based Domains** (Priority: Medium-Low)
**Each profession gets its own suggestions** - do NOT combine multiple professions.

**Generation Logic:**
For EACH profession separately:
- `{name}{profession}.{tld}`
- `{profession}{name}.{tld}`
- `{professionPrefix}{name}.{tld}` (first 3-4 letters)

**Character Limit:** 12-18 characters

**Examples:**
For professions: ["founder", "consultant"]

**Founder suggestions:**
- `andreasfounder.dk`
- `founderandreas.io`
- `fundandreas.me`

**Consultant suggestions:**
- `andreasconsult.eu`
- `consultandreas.dk`
- `consandreas.io`

**Critical Rule:** Professions are NOT mixed together (e.g., NOT "founderconsultant")

---

### 5. **Creative AI-Powered Suggestions** (Priority: Variable - Can be High!)
**"Magic Moment" domains** that show we really listened and researched the user's interests.

**Generation Logic:**
When a user mentions specific entities (sports teams, bands, places, etc.), research them and find relevant numbers, dates, or associations to create personalized domains.

**Examples:**

**Sports Team:**
- User mentions: "Silkeborg IF"
- Research: Founded 1917, nicknamed "17"
- Suggestions:
  - `andreas17.dk` (birth year connection + team founding)
  - `ak1917.io` (full founding year)
  - `anke17.me` (handle + team number)

**Music Artist/Band:**
- User mentions: "Pink Floyd"
- Research: Dark Side of the Moon released 1973
- Suggestions:
  - `andreas73.com` (if user connection to '73)
  - `darkside.me` (if available and relevant)

**Historical Event:**
- User mentions: "Apollo 11 enthusiast"
- Research: Moon landing 1969
- Suggestions:
  - `andreas69.space` (if .space TLD relevant)
  - `ak1969.io`

**Research Sources:**
- Use web search to find:
  - Founding/establishment dates
  - Significant years
  - Nicknames or abbreviations
  - Jersey numbers (for athletes)
  - Album release years (for music)

**Presentation:**
- Show WHY the suggestion is special
- Example: "Since you mentioned Silkeborg IF (founded in 1917, also known as '17'), how about: andreas17.dk?"
- Make it feel like a thoughtful discovery, not a random number

**Character Limit:** 10-18 characters

**Constraints:**
- Only use if there's a clear, meaningful connection
- Don't force it if nothing resonates
- Verify the research is accurate
- Make sure the number/reference makes sense to the user

**Why This Matters:**
- Creates a "wow" moment - shows real personalization
- Builds emotional connection to a domain
- Makes Posty feel magical, not algorithmic
- Can make a user choose a domain they wouldn't have thought of

---

## Domain Generation Algorithm

### Step 0: Normalize Name for Domains
Special characters must be converted to ASCII-compatible equivalents.

```javascript
function normalizeName(name, language = 'auto') {
  // Detect language from country or guess from characters
  const charMappings = {
    // Scandinavian
    'ø': 'o', 'ö': 'o', 'å': 'aa', 'æ': 'ae',
    // German
    'ü': 'ue', 'ä': 'ae', 'ß': 'ss',
    // French
    'é': 'e', 'è': 'e', 'ê': 'e', 'à': 'a', 'â': 'a', 'ç': 'c',
    // Spanish
    'ñ': 'n', 'á': 'a', 'í': 'i', 'ó': 'o', 'ú': 'u',
    // Portuguese
    'ã': 'a', 'õ': 'o',
    // Eastern European
    'ł': 'l', 'ż': 'z', 'ź': 'z', 'ś': 's', 'č': 'c', 'ć': 'c'
  };
  
  let normalized = name.toLowerCase();
  
  // Replace special characters
  for (const [special, replacement] of Object.entries(charMappings)) {
    normalized = normalized.replace(new RegExp(special, 'g'), replacement);
  }
  
  // Remove any remaining non-ASCII characters
  normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  return normalized;
}

// Example: "Søren Østergaard" → "sorenostergaard"
```

### Step 1: Generate Handles from Name
```javascript
function generateHandles(firstName, middleName, lastName) {
  const first = firstName.toLowerCase();
  const middle = middleName?.toLowerCase() || "";
  const last = lastName.toLowerCase();
  
  const handles = [];
  
  // Initials only (2-3 chars)
  if (middle) {
    handles.push(first[0] + middle[0] + last[0]); // e.g., "akg"
  } else {
    handles.push(first[0] + last[0]); // e.g., "ag"
  }
  
  // First 2 letters of each name (4-6 chars)
  if (middle) {
    handles.push(first.slice(0,2) + middle.slice(0,2) + last.slice(0,2)); // e.g., "ankegu"
  } else {
    handles.push(first.slice(0,2) + last.slice(0,2)); // e.g., "angu"
  }
  
  // First + last initial (5-9 chars)
  handles.push(first + last[0]); // e.g., "andreasg"
  
  // First 2 + last 2 (4 chars)
  handles.push(first.slice(0,2) + last.slice(0,2)); // e.g., "angu"
  
  // Short combos if first name is short
  if (first.length <= 5) {
    handles.push(first + middle.slice(0,2)); // e.g., "andrke"
    handles.push(first + last.slice(0,2)); // e.g., "andrgu"
  }
  
  return [...new Set(handles)]; // Remove duplicates
}
```

### Step 2: Generate Name-Based Domains
```javascript
function generateNameDomains(preferredName, handles, tlds) {
  const domains = [];
  
  // Full preferred name with TLDs (highest priority)
  for (const tld of tlds) {
    if ((preferredName + tld).length <= 15) {
      domains.push({
        domain: preferredName + tld,
        category: "name",
        priority: 1
      });
    }
  }
  
  // Short handles with TLDs
  for (const handle of handles) {
    for (const tld of tlds) {
      if ((handle + tld).length <= 12) {
        domains.push({
          domain: handle + tld,
          category: "name", 
          priority: 2
        });
      }
    }
  }
  
  return domains;
}
```

### Step 3: Generate City-Based Domains
```javascript
function generateCityDomains(name, handles, cityAbbr, tlds) {
  if (!cityAbbr) return []; // Only if city has abbreviation
  
  const domains = [];
  const shortName = name.slice(0, 5);
  
  for (const tld of tlds) {
    // Name + city abbreviation
    if ((name + cityAbbr + tld).length <= 16) {
      domains.push({
        domain: name + cityAbbr + tld,
        category: "city",
        priority: 2
      });
    }
    
    // Handle + city abbreviation
    for (const handle of handles.slice(0, 2)) { // Top 2 handles
      if ((handle + cityAbbr + tld).length <= 12) {
        domains.push({
          domain: handle + cityAbbr + tld,
          category: "city",
          priority: 2
        });
      }
    }
    
    // City + name
    if ((cityAbbr + name + tld).length <= 16) {
      domains.push({
        domain: cityAbbr + name + tld,
        category: "city",
        priority: 3
      });
    }
    
    // Subdomain style (if supported)
    if ((name + '.' + cityAbbr + tld).length <= 18) {
      domains.push({
        domain: name + '.' + cityAbbr + tld,
        category: "city",
        priority: 2,
        isSubdomain: true
      });
    }
  }
  
  return domains;
}
```

### Step 4: Generate Interest-Based Domains
```javascript
function generateInterestDomains(interests, name, tlds) {
  const domains = [];
  const shortName = name.slice(0, 5); // Use first 5 letters of name
  
  for (const interest of interests.slice(0, 3)) { // Max 3 interests
    const shortInterest = interest.slice(0, 4); // First 4 letters
    
    for (const tld of tlds) {
      // Just interest (if very short)
      if (interest.length <= 6 && (interest + tld).length <= 12) {
        domains.push({
          domain: interest + tld,
          category: "interest",
          priority: 3
        });
      }
      
      // interest + name (if short enough)
      if ((interest + name + tld).length <= 18) {
        domains.push({
          domain: interest + name + tld,
          category: "interest",
          priority: 4
        });
      }
      
      // Short interest prefix + name
      if ((shortInterest + shortName + tld).length <= 15) {
        domains.push({
          domain: shortInterest + shortName + tld,
          category: "interest",
          priority: 4
        });
      }
    }
  }
  
  return domains;
}
```

### Step 5: Generate Profession-Based Domains
```javascript
function generateProfessionDomains(professions, name, tlds) {
  const domains = [];
  const shortName = name.slice(0, 5);
  
  // IMPORTANT: Each profession gets its own suggestions
  for (const profession of professions) {
    const shortProf = profession.slice(0, 4); // First 4 letters
    
    for (const tld of tlds) {
      // profession + name
      if ((profession + name + tld).length <= 18) {
        domains.push({
          domain: profession + name + tld,
          category: `profession-${profession}`, // Separate category per profession
          priority: 5
        });
      }
      
      // name + profession
      if ((name + profession + tld).length <= 18) {
        domains.push({
          domain: name + profession + tld,
          category: `profession-${profession}`,
          priority: 5
        });
      }
      
      // Short versions
      if ((shortProf + shortName + tld).length <= 15) {
        domains.push({
          domain: shortProf + shortName + tld,
          category: `profession-${profession}`,
          priority: 6
        });
      }
    }
  }
  
  return domains;
}
```

### Step 6: Generate Creative AI-Powered Domains
```javascript
async function generateCreativeDomains(name, handles, interestEntities, tlds) {
  const domains = [];
  
  for (const entity of interestEntities) {
    // Research the entity if metadata not already present
    if (!entity.metadata) {
      entity.metadata = await researchEntity(entity.name, entity.type);
    }
    
    const { metadata } = entity;
    
    // Use significant numbers from research
    if (metadata.founded) {
      const year = metadata.founded;
      const shortYear = String(year).slice(-2); // e.g., 1917 → 17
      
      for (const tld of tlds) {
        // Name + year
        if ((name + year + tld).length <= 16) {
          domains.push({
            domain: name + year + tld,
            category: "creative",
            priority: 2, // High priority if meaningful
            explanation: `${entity.name} was founded in ${year}`
          });
        }
        
        // Name + short year
        if ((name + shortYear + tld).length <= 14) {
          domains.push({
            domain: name + shortYear + tld,
            category: "creative",
            priority: 2,
            explanation: `${entity.name} (founded ${year}, also known as '${shortYear}')`
          });
        }
        
        // Handle + year
        for (const handle of handles.slice(0, 2)) {
          if ((handle + year + tld).length <= 14) {
            domains.push({
              domain: handle + year + tld,
              category: "creative",
              priority: 3,
              explanation: `Based on ${entity.name} (${year})`
            });
          }
        }
      }
    }
    
    // Use nicknames or abbreviations
    if (metadata.nickname) {
      const nick = metadata.nickname.toLowerCase().replace(/\s/g, '');
      for (const tld of tlds) {
        if ((name + nick + tld).length <= 16) {
          domains.push({
            domain: name + nick + tld,
            category: "creative",
            priority: 3,
            explanation: `${entity.name} is nicknamed '${metadata.nickname}'`
          });
        }
      }
    }
  }
  
  return domains;
}

async function researchEntity(entityName, entityType) {
  // Use web search to find information
  // This would call a search API to find founding dates, nicknames, etc.
  // Return metadata object with relevant findings
  
  // Pseudo-code:
  // const results = await webSearch(`${entityName} founded year history`);
  // const metadata = parseResults(results);
  // return metadata;
}
```

---

## Prioritization Rules

### Priority Levels (1 = Highest)

1. **Priority 1:** Preferred name + location TLD (e.g., `andreas.dk`)
2. **Priority 2:** Short handles + any TLD (e.g., `anke.io`) OR City-based domains (e.g., `andreascph.dk`) OR Creative AI suggestions with strong relevance (e.g., `andreas17.dk`)
3. **Priority 3:** Single interest word + TLD (e.g., `sailing.dk`) OR City + name (e.g., `cphandreas.me`)
4. **Priority 4:** Interest + name combinations (e.g., `techandreas.io`)
5. **Priority 5:** Profession + name combinations (e.g., `founderandreas.dk`)
6. **Priority 6:** Abbreviated combinations (e.g., `fundandr.me`) OR Creative suggestions with weaker relevance

### Character Length Rules

- **Optimal:** 6-12 characters (including TLD)
- **Acceptable:** 13-18 characters
- **Avoid:** 19+ characters

**Why:** Short domains are:
- Easier to remember
- Easier to type
- More professional
- More valuable

### TLD Priority (within each category)

1. **Location TLDs** (.dk, .uk, .eu) - Shows local identity
2. **Personal TLDs** (.me) - Good for personal brand
3. **Tech TLDs** (.io, .dev) - Modern, tech-savvy
4. **Generic TLDs** (.com) - Universal but harder to get

---

## Output Format

### Domain Suggestion Structure
```javascript
{
  domain: "andreas.dk",
  category: "name",
  priority: 1,
  length: 10,
  available: true // (Future: check availability)
}
```

### Display Grouping

**Present to user in this order:**

1. **Your Name** (3-5 suggestions)
   - Top priority name-based domains
   
2. **Your Location** (2-3 suggestions, if city has abbreviation)
   - City-based domains showing local connection
   
3. **✨ Special for You** (1-3 suggestions, if found)
   - Creative AI-powered suggestions with explanations
   - Only show if truly meaningful
   
4. **Your Interests** (2-3 suggestions per interest)
   - Interest-based domains
   
5. **For [Profession 1]** (2-3 suggestions)
   - First profession domains
   
6. **For [Profession 2]** (2-3 suggestions)
   - Second profession domains
   
7. **More Options** (Creative/longer alternatives)

**Note on Creative Suggestions:**
- Always show the explanation (why this is special)
- Example display: "andreas17.dk — Since you mentioned Silkeborg IF (founded in 1917, also known as '17')"
- This creates the "magic moment" that makes users feel seen

---

## Current Limitations & Future Improvements

### Current Issues

1. **No availability checking** - all suggestions are theoretical
2. **No price consideration** - some TLDs cost more
3. **Limited creativity** - mostly formula-based
4. **No semantic understanding** - doesn't understand interest relationships

### Planned Improvements

1. **Real-time availability checking**
   - Check domain registry APIs
   - Only show available domains
   - Show "taken" status for close matches

2. **Premium suggestions**
   - Identify valuable short domains
   - Show marketplace pricing for taken domains
   - Suggest similar available alternatives

3. **Enhanced AI creativity**
   - Expand entity research beyond just dates
   - Include cultural references, wordplay, puns
   - Example: "sailing" → suggest "anchorandreas.io" (nautical theme)
   - Generate rhyming or alliterative combinations
   - Use semantic similarity to find related terms

4. **Pricing transparency**
   - Show annual cost per domain
   - Compare TLD pricing
   - Highlight deals or promotions

5. **Personalization learning**
   - Track which suggestions users prefer
   - Learn patterns (do people prefer handles or full names?)
   - Improve algorithm over time

6. **Context-aware suggestions**
   - Professional context → more serious domains
   - Personal context → more creative domains
   - Portfolio context → creative industry TLDs (.design, .art)

7. **Multiple language support**
   - Expand special character mapping to more languages
   - Provide transliteration options for non-Latin scripts (Cyrillic, Arabic, etc.)
   - Allow users to see multiple transliteration variants

---

## Testing Edge Cases

### Very Short Names
- Name: "Li Wu"
- Handle: "lw" (very short - good!)
- Suggestions: `li.dk`, `lw.io`, `liwu.me`

### Very Long Names  
- Name: "Christopher Bartholomew Henderson"
- Handle: "cbh", "chbahe", "chrisb"
- Suggestions: `cbh.dk`, `chris.io`, `chrisb.me`
- Avoid: `christopherbartholomew.dk` (way too long)

### Names with Special Characters
- Name: "Søren Østergaard"
- Normalized: "sorenostergaard"
- Handle: "so", "sooe", "soreno"
- Suggestions: `soren.dk`, `so.io`, `soostergaard.me`
- Show to user: "For 'Søren' we'll use 'soren' in domains"

### Major City Location
- Name: "Maria", City: "Barcelona"
- City abbr: "bcn"
- Suggestions: `mariabcn.es`, `mbcn.io`, `bcnmaria.me`, `maria.bcn.es`

### Creative Interest Match
- Name: "Andreas", Interest: "Silkeborg IF"
- Research: Founded 1917, nicknamed "17"
- Creative suggestions: 
  - `andreas17.dk` — "Silkeborg IF (founded 1917, also known as '17')"
  - `ak1917.io` — "Based on Silkeborg IF (1917)"

### Uncommon Professions
- Profession: "Ethnomusicologist"
- Short: "ethno", "music"
- Suggestions: `ethnoandreas.io`, `musicandreas.dk`
- Avoid: `ethnomusicologistandreas.com` (ridiculous)

### Multiple Interests
- Interests: "photography, travel, coffee, writing, yoga"
- Take top 3: photography, travel, coffee
- Separate suggestions for each
- Don't combine: NOT "phototravelcoffee.dk"
