import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import axios from 'axios';

// Configure axios base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function App() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userInfo, setUserInfo] = useState({
    fullName: '',
    firstName: '',
    preferredName: '',
    normalizedName: '',
    locationString: '',
    professions: [],
    interests: []
  });
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const [buttonOptions, setButtonOptions] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const hasInitialized = useRef(false);

  // Initialize voice recognition
  useEffect(() => {
    // Prevent duplicate initialization in React StrictMode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
      };

      recognitionInstance.onerror = () => {
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }

    // Send initial message
    addBotMessage("Hi! I'm here to help you find the perfect email domain. What's your full name?");

    // Focus input on load
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 1000);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Auto-focus after typing
  useEffect(() => {
    if (!isTyping && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isTyping]);

  const addBotMessage = (text, delay = 800) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { text, sender: 'bot', timestamp: new Date() }]);
      setIsTyping(false);
    }, delay);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { text, sender: 'user', timestamp: new Date() }]);
  };

  const toggleVoiceInput = () => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const handleButtonClick = async (optionValue, optionLabel) => {
    if (isTyping) return;

    // Add user message showing what they selected
    addUserMessage(optionLabel);
    setButtonOptions(null); // Hide buttons

    // Send the option value to backend
    await sendMessageToBackend(optionValue);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMessage = inputValue.trim();
    addUserMessage(userMessage);
    setInputValue('');

    await sendMessageToBackend(userMessage);
  };

  const sendMessageToBackend = async (message) => {
    // Send to backend
    try {
      setIsTyping(true);
      const response = await axios.post(`${API_BASE_URL}/api/chat`, {
        message: message,
        sessionId: sessionId
      });

      // Update user info if provided
      if (response.data.userInfo) {
        setUserInfo(prev => ({
          ...prev,
          ...response.data.userInfo
        }));
      }

      // Check for button options
      if (response.data.options) {
        setButtonOptions(response.data.options);
      } else {
        setButtonOptions(null);
      }

      // Add bot response
      setTimeout(() => {
        setMessages(prev => [...prev, {
          text: response.data.reply,
          sender: 'bot',
          timestamp: new Date()
        }]);
        setIsTyping(false);
      }, 800);
    } catch (error) {
      console.error('Error sending message:', error);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          text: "Sorry, I'm having trouble connecting. Please try again.",
          sender: 'bot',
          timestamp: new Date()
        }]);
        setIsTyping(false);
        setButtonOptions(null);
      }, 800);
    }

    // Refocus input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="flex gap-6">
          {/* Main Chat */}
          <div className="flex-1 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col chat-container">
            {/* Header */}
            <div className="gradient-bg text-white p-6">
              <h1 className="text-2xl font-bold">Posty</h1>
              <p className="text-purple-100 text-sm">Let's find your perfect email domain</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} message-enter`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="typing-indicator flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-4 bg-gray-50">
              {/* Button Options */}
              {buttonOptions && buttonOptions.type === 'buttons' && (
                <div className="mb-4 space-y-2">
                  <p className="text-sm text-gray-600 mb-3">Choose an option:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {buttonOptions.options.map((option, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleButtonClick(option.value, option.label)}
                        disabled={isTyping}
                        className="w-full text-left px-4 py-3 bg-white border-2 border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="font-medium text-gray-900">{option.label}</div>
                        {option.example && (
                          <div className="text-sm text-gray-500 mt-1">{option.example}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Text Input Form */}
              <form onSubmit={handleSubmit} className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={buttonOptions ? "Or type your answer..." : "Type your answer..."}
                  disabled={isTyping}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                />

                {recognition && (
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    disabled={isTyping}
                    className={`px-4 py-3 rounded-xl transition-all ${
                      isListening
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    } disabled:opacity-50`}
                  >
                    {isListening ? (
                      <div className="voice-wave">
                        <div className="voice-bar"></div>
                        <div className="voice-bar"></div>
                        <div className="voice-bar"></div>
                        <div className="voice-bar"></div>
                        <div className="voice-bar"></div>
                      </div>
                    ) : (
                      <span>🎤</span>
                    )}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isTyping || !inputValue.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-md transform hover:scale-[1.02]"
                >
                  Send
                </button>
              </form>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 space-y-6">
            {/* Captured Info */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <CapturedInfoSidebar userInfo={userInfo} />
            </div>

            {/* Posty Info */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <InfoSidebar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const InfoSidebar = () => (
  <div className="space-y-4">
    <h3 className="font-semibold text-gray-900">What is Posty?</h3>
    <div className="space-y-3 text-sm text-gray-600">
      <p>Get a custom email address with your own domain while keeping Gmail.</p>
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <span className="text-purple-600 font-bold">✓</span>
          <span>Your own domain (e.g., andreas@yourdomain.com)</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-purple-600 font-bold">✓</span>
          <span>Still use Gmail (no switching needed)</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-purple-600 font-bold">✓</span>
          <span>Professional email identity</span>
        </div>
      </div>
      <div className="pt-3 border-t">
        <p className="font-medium text-gray-900">$5/month</p>
        <p className="text-xs text-gray-500">+ domain cost (~$10-15/year)</p>
      </div>
    </div>
  </div>
);

const CapturedInfoSidebar = ({ userInfo }) => {
  const hasSpecialChars = userInfo.preferredName !== userInfo.normalizedName;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">About You</h3>

      {userInfo.fullName && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Name</p>
          <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
            {userInfo.fullName}
          </span>
          {hasSpecialChars && (
            <p className="text-xs text-gray-500 mt-1">
              For domains: "{userInfo.normalizedName}"
            </p>
          )}
        </div>
      )}

      {userInfo.locationString && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Location</p>
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
            {userInfo.locationString}
          </span>
        </div>
      )}

      {userInfo.professions && userInfo.professions.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Profession</p>
          <div className="flex flex-wrap gap-2">
            {userInfo.professions.map((prof, i) => (
              <span key={i} className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                {prof}
              </span>
            ))}
          </div>
        </div>
      )}

      {userInfo.interests && userInfo.interests.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Interests</p>
          <div className="flex flex-wrap gap-2">
            {userInfo.interests.map((interest, i) => (
              <span key={i} className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
