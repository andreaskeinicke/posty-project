import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './QuestionnaireFlow.css';

function QuestionnaireFlow({ onComplete, onBack }) {
  const [flow, setFlow] = useState(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadQuestionnaire();
  }, []);

  const loadQuestionnaire = async () => {
    try {
      const response = await axios.get('/api/questionnaire/flow');
      setFlow(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading questionnaire:', error);
      setIsLoading(false);
    }
  };

  const handleAnswer = (questionId, value) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleNext = () => {
    const currentSection = flow.sections[currentSectionIndex];

    if (currentQuestionIndex < currentSection.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentSectionIndex < flow.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      setCurrentQuestionIndex(0);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
      const prevSection = flow.sections[currentSectionIndex - 1];
      setCurrentQuestionIndex(prevSection.questions.length - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await axios.post('/api/questionnaire/analyze', {
        responses
      });
      onComplete(response.data);
    } catch (error) {
      console.error('Error submitting questionnaire:', error);
      alert('Error submitting questionnaire. Please try again.');
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question) => {
    const value = responses[question.id];

    switch (question.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleAnswer(question.id, e.target.value)}
            placeholder={question.placeholder}
            className="text-input"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleAnswer(question.id, e.target.value)}
            placeholder={question.placeholder}
            rows="4"
            className="textarea-input"
          />
        );

      case 'choice':
        return (
          <div className="options-container">
            {question.options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleAnswer(question.id, option.value)}
                className={`option-button ${value === option.value ? 'selected' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        );

      case 'multi-choice':
        const selectedValues = value || [];
        return (
          <div className="options-container">
            {question.options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  const newValues = selectedValues.includes(option.value)
                    ? selectedValues.filter(v => v !== option.value)
                    : [...selectedValues, option.value];
                  handleAnswer(question.id, newValues);
                }}
                className={`option-button ${selectedValues.includes(option.value) ? 'selected' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        );

      case 'boolean':
        return (
          <div className="options-container">
            <button
              onClick={() => handleAnswer(question.id, true)}
              className={`option-button ${value === true ? 'selected' : ''}`}
            >
              Yes
            </button>
            <button
              onClick={() => handleAnswer(question.id, false)}
              className={`option-button ${value === false ? 'selected' : ''}`}
            >
              No
            </button>
          </div>
        );

      case 'tags':
        const tags = value || [];
        return (
          <div className="tags-container">
            <div className="tags-list">
              {tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                  <button
                    onClick={() => handleAnswer(
                      question.id,
                      tags.filter((_, i) => i !== index)
                    )}
                    className="tag-remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && tagInput.trim()) {
                  handleAnswer(question.id, [...tags, tagInput.trim()]);
                  setTagInput('');
                }
              }}
              placeholder={question.placeholder}
              className="text-input"
            />
            {question.hint && <p className="hint">{question.hint}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return <div className="loading">Loading questionnaire...</div>;
  }

  if (!flow) {
    return <div className="error">Failed to load questionnaire.</div>;
  }

  const currentSection = flow.sections[currentSectionIndex];
  const currentQuestion = currentSection.questions[currentQuestionIndex];
  const progress = ((currentSectionIndex * 100) / flow.sections.length) +
                   ((currentQuestionIndex * 100) / (currentSection.questions.length * flow.sections.length));

  const isLastQuestion = currentSectionIndex === flow.sections.length - 1 &&
                         currentQuestionIndex === currentSection.questions.length - 1;

  return (
    <div className="questionnaire-flow">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="questionnaire-content">
        <div className="section-header">
          <h2>{currentSection.title}</h2>
          <p>{currentSection.description}</p>
        </div>

        <div className="question-container">
          <h3 className="question-text">
            {currentQuestion.question}
            {currentQuestion.required && <span className="required">*</span>}
          </h3>

          {renderQuestion(currentQuestion)}
        </div>

        <div className="navigation-buttons">
          <button
            onClick={currentSectionIndex === 0 && currentQuestionIndex === 0 ? onBack : handlePrevious}
            className="nav-button secondary"
          >
            {currentSectionIndex === 0 && currentQuestionIndex === 0 ? 'Back to Chat' : 'Previous'}
          </button>

          <button
            onClick={handleNext}
            className="nav-button primary"
            disabled={isSubmitting || (currentQuestion.required && !responses[currentQuestion.id])}
          >
            {isSubmitting ? 'Analyzing...' : (isLastQuestion ? 'Get Suggestions' : 'Next')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuestionnaireFlow;
