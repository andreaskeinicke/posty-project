import React, { useState } from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface';
import QuestionnaireFlow from './components/QuestionnaireFlow';
import DomainResults from './components/DomainResults';

function App() {
  const [mode, setMode] = useState('chat'); // 'chat', 'questionnaire', 'results'
  const [domainSuggestions, setDomainSuggestions] = useState(null);

  const handleQuestionnaireComplete = (suggestions) => {
    setDomainSuggestions(suggestions);
    setMode('results');
  };

  const handleStartOver = () => {
    setDomainSuggestions(null);
    setMode('chat');
  };

  return (
    <div className="App">
      <div className="app-container">
        <header className="app-header">
          <div className="logo">
            <span className="logo-icon">📧</span>
            <h1>Posty</h1>
          </div>
          <p className="tagline">Find your perfect custom email domain</p>
        </header>

        <main className="app-main">
          {mode === 'chat' && (
            <ChatInterface onStartQuestionnaire={() => setMode('questionnaire')} />
          )}

          {mode === 'questionnaire' && (
            <QuestionnaireFlow
              onComplete={handleQuestionnaireComplete}
              onBack={() => setMode('chat')}
            />
          )}

          {mode === 'results' && (
            <DomainResults
              suggestions={domainSuggestions}
              onStartOver={handleStartOver}
            />
          )}
        </main>

        <footer className="app-footer">
          <p>Keep your Gmail, get a custom domain • Powered by AI</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
