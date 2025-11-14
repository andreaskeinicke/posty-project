import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './ChatInterface.css';

function ChatInterface({ onStartQuestionnaire }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm Posty, your AI assistant for finding the perfect custom email domain. I can help you keep your Gmail while having a professional custom domain like yourname@yourdomain.com.\n\nWould you like me to:\n1. Ask you a few questions to suggest perfect domains\n2. Just chat about what you're looking for\n\nWhat works best for you?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Check if user wants to start questionnaire
      const wantsQuestionnaire = input.toLowerCase().match(/question|ask|1|guide|help me find/i);

      if (wantsQuestionnaire && messages.length <= 3) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Great! I'll guide you through some questions to understand exactly what you need. This will help me suggest the perfect domains for you."
        }]);
        setTimeout(() => onStartQuestionnaire(), 1500);
        setIsLoading(false);
        return;
      }

      const response = await axios.post('/api/chat', {
        messages: [...messages, userMessage].map(m => ({
          role: m.role,
          content: m.content
        }))
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.message
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.role}`}
          >
            <div className="message-content">
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message assistant">
            <div className="message-content typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          rows="1"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="send-button"
        >
          Send
        </button>
      </div>

      <div className="quick-actions">
        <button
          onClick={onStartQuestionnaire}
          className="quick-action-button"
        >
          Start Questionnaire →
        </button>
      </div>
    </div>
  );
}

export default ChatInterface;
