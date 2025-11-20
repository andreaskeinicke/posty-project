import React, { useState } from 'react';
import axios from 'axios';
import './Questionnaire.css';

// Character normalization map for special characters
const CHAR_MAPPINGS = {
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

// City abbreviations mapping
const CITY_ABBREVIATIONS = {
  'copenhagen': 'cph',
  'barcelona': 'bcn',
  'london': 'ldn',
  'new york': 'nyc',
  'los angeles': 'la',
  'san francisco': 'sf',
  'paris': 'par',
  'berlin': 'ber',
  'amsterdam': 'ams',
  'tokyo': 'tyo'
};

// Country to TLD mapping
const COUNTRY_TLDS = {
  'denmark': ['.dk', '.eu', '.me'],
  'united states': ['.us', '.io', '.me'],
  'usa': ['.us', '.io', '.me'],
  'united kingdom': ['.uk', '.io', '.me'],
  'uk': ['.uk', '.io', '.me'],
  'spain': ['.es', '.eu', '.io'],
  'germany': ['.de', '.eu', '.io'],
  'france': ['.fr', '.eu', '.io'],
  'netherlands': ['.nl', '.eu', '.io'],
  'sweden': ['.se', '.eu', '.me'],
  'norway': ['.no', '.eu', '.me'],
  'default': ['.com', '.io', '.me']
};

function Questionnaire({ onComplete, onBack }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState({
    domainPreference: null,
    specificDomain: '',
    fullName: '',
    primaryUseCase: null,
    country: '',
    city: '',
    profession: '',
    interests: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate total steps dynamically
  const totalSteps = () => {
    // Steps: 1(preference) + 2(name) + 3(use case) + 4(location) + 5(profession - conditional) + 6(interests)
    // Interests is always step 6, but we skip step 5 if not work-related
    // So total is always 6, but the progress shows actual step number
    return 6;
  };

  const validateStep = () => {
    const newErrors = {};

    switch(currentStep) {
      case 1: // Domain preference
        if (!answers.domainPreference) {
          newErrors.domainPreference = 'Please select an option';
        }
        break;

      case 2: // Full name
        if (!answers.fullName || answers.fullName.trim().length < 2) {
          newErrors.fullName = 'Please enter your full name';
        }
        break;

      case 3: // Primary use case
        if (!answers.primaryUseCase) {
          newErrors.primaryUseCase = 'Please select an option';
        }
        break;

      case 4: // Location
        if (!answers.country || answers.country.trim().length < 2) {
          newErrors.country = 'Please enter your country';
        }
        break;

      case 5: // Profession (conditional)
        const needsProfession = answers.primaryUseCase === 'work' || answers.primaryUseCase === 'side_hustle';
        if (needsProfession && (!answers.profession || answers.profession.trim().length < 2)) {
          newErrors.profession = 'Please enter your profession';
        }
        break;

      case 6: // Interests (optional - no validation needed)
        break;

      default:
        // No validation for unknown steps
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const normalizeName = (name) => {
    let normalized = name.toLowerCase();

    // Replace special characters
    for (const [special, replacement] of Object.entries(CHAR_MAPPINGS)) {
      normalized = normalized.replace(new RegExp(special, 'g'), replacement);
    }

    // Remove any remaining non-ASCII characters
    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return normalized;
  };

  const parseName = (fullName) => {
    const parts = fullName.trim().split(/\s+/);

    if (parts.length === 1) {
      return {
        firstName: parts[0],
        middleName: '',
        lastName: ''
      };
    } else if (parts.length === 2) {
      return {
        firstName: parts[0],
        middleName: '',
        lastName: parts[1]
      };
    } else {
      return {
        firstName: parts[0],
        middleName: parts.slice(1, -1).join(' '),
        lastName: parts[parts.length - 1]
      };
    }
  };

  const generateHandles = (firstName, middleName, lastName) => {
    const first = firstName.toLowerCase();
    const middle = middleName?.toLowerCase() || "";
    const last = lastName.toLowerCase();

    const handles = [];

    // Initials only (2-3 chars)
    if (middle) {
      handles.push(first[0] + middle[0] + last[0]);
    } else if (first && last) {
      handles.push(first[0] + last[0]);
    }

    // First 2 letters of each name
    if (middle) {
      handles.push(first.slice(0,2) + middle.slice(0,2) + last.slice(0,2));
    } else if (first && last) {
      handles.push(first.slice(0,2) + last.slice(0,2));
    }

    // First + last initial
    if (first && last) {
      handles.push(first + last[0]);
    }

    // Short combos if first name is short
    if (first.length <= 5 && last) {
      handles.push(first + last.slice(0,2));
    }

    return [...new Set(handles)]; // Remove duplicates
  };

  const getTLDs = (country) => {
    const countryLower = country.toLowerCase().trim();
    return COUNTRY_TLDS[countryLower] || COUNTRY_TLDS['default'];
  };

  const getCityAbbreviation = (city) => {
    const cityLower = city.toLowerCase().trim();
    return CITY_ABBREVIATIONS[cityLower] || null;
  };

  const handleNext = async () => {
    // Prevent multiple clicks
    if (isSubmitting) {
      return;
    }

    if (!validateStep()) {
      return;
    }

    // Check if this is the last step
    const isLastStep = currentStep === totalSteps();

    if (isLastStep) {
      await handleSubmit();
    } else {
      // Skip profession step if not work-related
      if (currentStep === 4) {
        const needsProfession = answers.primaryUseCase === 'work' || answers.primaryUseCase === 'side_hustle';
        if (!needsProfession) {
          setCurrentStep(6); // Skip to interests
        } else {
          setCurrentStep(currentStep + 1);
        }
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 1) {
      onBack();
    } else if (currentStep === 6) {
      // Coming back from interests - check if we should skip profession
      const needsProfession = answers.primaryUseCase === 'work' || answers.primaryUseCase === 'side_hustle';
      if (!needsProfession) {
        setCurrentStep(4); // Go back to location
      } else {
        setCurrentStep(currentStep - 1);
      }
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipInterests = () => {
    setAnswers({ ...answers, interests: '' });
    handleSubmit();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    console.log('Submitting questionnaire with answers:', answers);

    try {
      // Check if user wants a specific domain
      if (answers.domainPreference === 'specific_domain') {
        // Check domain availability
        const response = await axios.post('/api/domains/check', {
          domain: answers.specificDomain
        });

        if (response.data.available) {
          onComplete({
            type: 'specific_domain',
            domain: answers.specificDomain,
            pricing: response.data.pricing
          });
        } else {
          // Show alternatives
          onComplete({
            type: 'specific_domain_unavailable',
            requestedDomain: answers.specificDomain,
            alternatives: response.data.alternatives
          });
        }
      } else {
        // Parse and process data for recommendation engine
        const { firstName, middleName, lastName } = parseName(answers.fullName);
        const preferredName = normalizeName(firstName);
        const normalizedName = normalizeName(answers.fullName);
        const handles = generateHandles(
          normalizeName(firstName),
          normalizeName(middleName),
          normalizeName(lastName)
        );

        const tlds = getTLDs(answers.country);
        const cityAbbreviation = getCityAbbreviation(answers.city);

        // Parse professions
        const professions = answers.profession
          ? answers.profession.split(/,| and /).map(p => p.trim().toLowerCase()).filter(p => p)
          : [];

        // Parse interests
        const interestsList = answers.interests
          ? answers.interests.split(/,| and /).map(i => i.trim()).filter(i => i)
          : [];

        // Transform our data to match what the backend expects
        const requestData = {
          // Required fields from old questionnaire format
          name: answers.fullName,
          tld_preference: tlds.map(tld => tld.replace('.', '')), // Convert ['.dk', '.eu'] to ['dk', 'eu']

          // Additional enriched data
          profession: answers.profession,
          keywords: interestsList,

          // Metadata for domain generation (not validated by backend)
          _metadata: {
            firstName,
            middleName,
            lastName,
            preferredName,
            normalizedName,
            handles,
            country: answers.country,
            city: answers.city,
            cityAbbreviation,
            tlds, // Include TLDs with dots: ['.dk', '.eu', '.me']
            primaryUseCase: answers.primaryUseCase,
            professions,
            interestsList
          }
        };

        // Pass the request data to App.js which will call the API
        onComplete({ responses: requestData });
      }
    } catch (error) {
      console.error('Error submitting questionnaire:', error);
      console.error('Error details:', error.response?.data || error.message);

      const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
      alert(`Failed to process your request: ${errorMessage}\n\nPlease try again.`);
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    // Safety check - if somehow we get to an invalid step, show a loading state
    if (currentStep < 1 || currentStep > 6) {
      return (
        <div className="question-step">
          <h2 className="question-title">Processing...</h2>
          <p className="question-subtitle">Please wait while we process your information.</p>
        </div>
      );
    }

    switch(currentStep) {
      case 1:
        return (
          <div className="question-step">
            <h2 className="question-title">How would you like to start?</h2>

            <div className="choice-buttons">
              <button
                className={`choice-button ${answers.domainPreference === 'specific_domain' ? 'selected' : ''}`}
                onClick={() => setAnswers({ ...answers, domainPreference: 'specific_domain' })}
              >
                <div className="choice-icon">🎯</div>
                <div className="choice-text">
                  <div className="choice-label">I have a specific domain in mind</div>
                  <div className="choice-description">Check if your dream domain is available</div>
                </div>
              </button>

              <button
                className={`choice-button ${answers.domainPreference === 'help_find' ? 'selected' : ''}`}
                onClick={() => setAnswers({ ...answers, domainPreference: 'help_find' })}
              >
                <div className="choice-icon">✨</div>
                <div className="choice-text">
                  <div className="choice-label">Help me find my dream email address</div>
                  <div className="choice-description">Get personalized recommendations</div>
                </div>
              </button>
            </div>

            {answers.domainPreference === 'specific_domain' && (
              <div className="specific-domain-input">
                <input
                  type="text"
                  value={answers.specificDomain}
                  onChange={(e) => setAnswers({ ...answers, specificDomain: e.target.value })}
                  placeholder="yourdomain.com"
                  className="text-input"
                />
              </div>
            )}

            {errors.domainPreference && <div className="error-message">{errors.domainPreference}</div>}
          </div>
        );

      case 2:
        return (
          <div className="question-step">
            <h2 className="question-title">What's your full name?</h2>

            <input
              type="text"
              value={answers.fullName}
              onChange={(e) => setAnswers({ ...answers, fullName: e.target.value })}
              placeholder="Andreas Keinicke Gustavsen"
              className="text-input large"
              autoFocus
            />

            {errors.fullName && <div className="error-message">{errors.fullName}</div>}

            {answers.fullName && normalizeName(answers.fullName) !== answers.fullName.toLowerCase() && (
              <div className="helper-text">
                For domains, we'll use "{normalizeName(answers.fullName.split(' ')[0])}"
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="question-step">
            <h2 className="question-title">What will you primarily use this email for?</h2>

            <div className="choice-grid">
              {[
                { value: 'personal', label: 'Personal use', icon: '👤' },
                { value: 'work', label: 'Work', icon: '💼' },
                { value: 'side_hustle', label: 'Side hustle', icon: '🚀' },
                { value: 'hobby', label: 'Hobby project', icon: '🎨' },
                { value: 'other', label: 'Other', icon: '💡' },
                { value: 'all', label: 'All of the above', icon: '🌟' }
              ].map(option => (
                <button
                  key={option.value}
                  className={`choice-card ${answers.primaryUseCase === option.value ? 'selected' : ''}`}
                  onClick={() => setAnswers({ ...answers, primaryUseCase: option.value })}
                >
                  <div className="choice-card-icon">{option.icon}</div>
                  <div className="choice-card-label">{option.label}</div>
                </button>
              ))}
            </div>

            {errors.primaryUseCase && <div className="error-message">{errors.primaryUseCase}</div>}
          </div>
        );

      case 4:
        return (
          <div className="question-step">
            <h2 className="question-title">Where do you live?</h2>

            <div className="location-inputs">
              <div className="input-group">
                <label>Country</label>
                <input
                  type="text"
                  value={answers.country}
                  onChange={(e) => setAnswers({ ...answers, country: e.target.value })}
                  placeholder="Type your country..."
                  className="text-input"
                  autoFocus
                />
                {errors.country && <div className="error-message">{errors.country}</div>}
              </div>

              <div className="input-group">
                <label>City <span className="optional">(optional)</span></label>
                <input
                  type="text"
                  value={answers.city}
                  onChange={(e) => setAnswers({ ...answers, city: e.target.value })}
                  placeholder="Type your city..."
                  className="text-input"
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="question-step">
            <h2 className="question-title">What's your profession or industry?</h2>

            <input
              type="text"
              value={answers.profession}
              onChange={(e) => setAnswers({ ...answers, profession: e.target.value })}
              placeholder="e.g., Software Developer, Marketing Consultant"
              className="text-input large"
              autoFocus
            />

            {errors.profession && <div className="error-message">{errors.profession}</div>}

            <div className="helper-text">
              You can list multiple (e.g., "founder and consultant")
            </div>
          </div>
        );

      case 6:
        return (
          <div className="question-step">
            <h2 className="question-title">Any hobbies or interests you'd like reflected?</h2>
            <p className="question-subtitle">Optional - but it helps us get creative!</p>

            <input
              type="text"
              value={answers.interests}
              onChange={(e) => setAnswers({ ...answers, interests: e.target.value })}
              placeholder="e.g., photography, sailing, football, tech"
              className="text-input large"
              autoFocus
            />

            <div className="helper-text">
              Separate multiple interests with commas
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const progress = (currentStep / totalSteps()) * 100;

  return (
    <div className="questionnaire-container">
      <div className="questionnaire-card">
        {/* Progress bar */}
        <div className="progress-section">
          <div className="progress-bar-bg">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-text">
            Question {currentStep} of {totalSteps()}
          </div>
        </div>

        {/* Question content */}
        <div className="question-content">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="navigation-buttons">
          <button
            onClick={handleBack}
            className="nav-button secondary"
          >
            Back
          </button>

          <div className="nav-right">
            {currentStep === 6 && (
              <button
                onClick={handleSkipInterests}
                className="nav-button tertiary"
                disabled={isSubmitting}
              >
                Skip
              </button>
            )}

            <button
              onClick={handleNext}
              className="nav-button primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Processing...'
                : currentStep === totalSteps()
                  ? 'Find My Email Address'
                  : 'Next'
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Questionnaire;
