# Posty - AI-Powered Email Domain Finder

Posty is an AI-powered chatbot that helps people find the perfect custom email domain while keeping their Gmail account. It combines Claude AI's conversational abilities with domain availability checking to provide personalized, creative domain suggestions.

## Features

- **AI-Powered Conversations**: Chat with Posty to explore domain options
- **Interactive Questionnaire**: Structured flow to understand your needs
- **Domain Availability Checking**: Real-time verification of domain availability
- **Creative Suggestions**: AI-generated domain names based on your profile
- **Entity Research**: Claude analyzes your profession/business for creative ideas
- **Multiple Registrar Support**: Integration with GoDaddy, Namecheap, and DNS fallback

## Architecture

### Backend (Node.js + Express)
- **Claude API Integration**: Conversational AI for domain suggestions
- **Domain Services**: Multi-provider domain availability checking
- **Questionnaire System**: Structured data collection and analysis
- **RESTful API**: Clean endpoints for frontend communication

### Frontend (React)
- **Chat Interface**: Natural conversation with Posty
- **Questionnaire Flow**: Multi-step form with progress tracking
- **Results Display**: Beautiful presentation of domain suggestions
- **Responsive Design**: Works on desktop and mobile

## Project Structure

```
posty/
├── backend/
│   ├── server.js                 # Express server setup
│   ├── routes/
│   │   ├── chat.js              # Chat endpoint routes
│   │   ├── domains.js           # Domain checking routes
│   │   └── questionnaire.js     # Questionnaire routes
│   ├── controllers/
│   │   ├── chatController.js    # Chat logic
│   │   ├── domainController.js  # Domain checking logic
│   │   └── questionnaireController.js
│   └── services/
│       ├── claudeService.js     # Claude API integration
│       ├── domainService.js     # Domain availability checking
│       └── questionnaireService.js
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatInterface.js
│   │   │   ├── QuestionnaireFlow.js
│   │   │   └── DomainResults.js
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Anthropic API key (for Claude)
- Optional: Domain registrar API keys (GoDaddy, Namecheap)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd posty
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```
   This installs dependencies for both backend and frontend.

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your API keys:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   GODADDY_API_KEY=your_godaddy_key_here (optional)
   GODADDY_API_SECRET=your_godaddy_secret_here (optional)
   ```

### Running the Application

#### Development Mode (Recommended)

Run both backend and frontend concurrently:
```bash
npm run dev
```

This starts:
- Backend server on `http://localhost:3001`
- Frontend development server on `http://localhost:3000`

#### Production Mode

1. Build the frontend:
   ```bash
   npm run build
   ```

2. Start the backend server:
   ```bash
   npm start
   ```

3. Serve the frontend build with a static server or configure Express to serve it.

## API Endpoints

### Chat Endpoints

- `POST /api/chat` - Send message to Claude
  ```json
  {
    "messages": [
      {"role": "user", "content": "I need a domain for my photography business"}
    ]
  }
  ```

- `POST /api/chat/stream` - Stream responses from Claude (SSE)

### Domain Endpoints

- `POST /api/domains/check` - Check single domain availability
  ```json
  {
    "domain": "example.com"
  }
  ```

- `POST /api/domains/bulk-check` - Check multiple domains (max 20)
  ```json
  {
    "domains": ["example.com", "example.net", "example.io"]
  }
  ```

- `GET /api/domains/suggestions?keyword=photographer` - Get domain suggestions

### Questionnaire Endpoints

- `GET /api/questionnaire/flow` - Get questionnaire structure
- `POST /api/questionnaire/analyze` - Analyze responses and generate suggestions
  ```json
  {
    "responses": {
      "type": "business",
      "name": "John's Photography",
      "profession": "wedding photographer",
      ...
    }
  }
  ```

- `POST /api/questionnaire/suggest` - Get creative suggestions for entity
  ```json
  {
    "entity": "photography studio",
    "context": {"specialty": "weddings"}
  }
  ```

## Configuration

### Domain Availability Checking

Posty supports multiple methods for checking domain availability:

1. **GoDaddy API** (Recommended)
   - Most accurate
   - Requires API key and secret
   - Set `GODADDY_API_KEY` and `GODADDY_API_SECRET` in `.env`

2. **Namecheap API**
   - Good alternative
   - Requires API credentials
   - Set `NAMECHEAP_API_USER` and `NAMECHEAP_API_KEY` in `.env`

3. **DNS Lookup** (Fallback)
   - No API key required
   - Less accurate (checks if domain has DNS records)
   - Used automatically if no API keys are configured

### Claude AI Configuration

The system uses Claude 3.5 Sonnet for conversational AI. Configure in `backend/services/claudeService.js`:

- Model: `claude-3-5-sonnet-20241022`
- Temperature: `0.7` (adjustable for creativity)
- Max tokens: `4096`

## Questionnaire Flow

The questionnaire collects information in 4 sections:

1. **About You**: Type (personal/business), name, profession
2. **Your Unique Identity**: Values, specialty, keywords
3. **Domain Preferences**: Length, style, TLD preferences
4. **Creative Inspiration**: Brands admired, things to avoid

All responses are analyzed by Claude to generate personalized suggestions.

## Development

### Adding New Features

**New Questionnaire Questions:**
1. Edit `backend/services/questionnaireService.js`
2. Add question to appropriate section
3. Update response validation if needed

**New Domain Providers:**
1. Add provider method to `backend/services/domainService.js`
2. Update `.env.example` with new environment variables
3. Add provider option to availability checking logic

**Frontend Components:**
1. Create component in `frontend/src/components/`
2. Add styles in corresponding CSS file
3. Import and use in `App.js`

### Testing

The domain availability checker includes a DNS fallback that works without API keys. For testing:

```bash
# Start the backend only
npm run server

# Test domain checking
curl -X POST http://localhost:3001/api/domains/check \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com"}'
```

## Deployment

### Backend Deployment (e.g., Heroku, Railway, Render)

1. Set environment variables in your hosting platform
2. Ensure `ANTHROPIC_API_KEY` is set
3. Deploy the root directory
4. The backend will start on the configured `PORT`

### Frontend Deployment (e.g., Vercel, Netlify)

1. Build the frontend: `cd frontend && npm run build`
2. Deploy the `frontend/build` directory
3. Configure the API proxy/base URL to point to your backend

### Full Stack Deployment

You can also serve the frontend from Express:

1. Build the frontend
2. Copy `frontend/build` to `backend/public`
3. Add static file serving to `backend/server.js`:
   ```javascript
   app.use(express.static('public'));
   ```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key for Claude |
| `PORT` | No | Backend server port (default: 3001) |
| `NODE_ENV` | No | Environment (development/production) |
| `CORS_ORIGIN` | No | Allowed CORS origin (default: http://localhost:3000) |
| `GODADDY_API_KEY` | No | GoDaddy API key for domain checking |
| `GODADDY_API_SECRET` | No | GoDaddy API secret |
| `NAMECHEAP_API_USER` | No | Namecheap API username |
| `NAMECHEAP_API_KEY` | No | Namecheap API key |

## Troubleshooting

**Claude API Errors:**
- Verify your `ANTHROPIC_API_KEY` is correct
- Check you have sufficient API credits
- Review rate limits in your Anthropic account

**Domain Checking Not Working:**
- If using DNS fallback, results may be less accurate
- Consider setting up GoDaddy or Namecheap API keys
- Check network connectivity

**Frontend Not Connecting to Backend:**
- Ensure backend is running on port 3001
- Check CORS configuration in `backend/server.js`
- Verify proxy setting in `frontend/package.json`

## Future Enhancements

- [ ] User accounts and saved suggestions
- [ ] Email forwarding setup guides
- [ ] Integration with more domain registrars
- [ ] Domain price comparison
- [ ] Bulk domain purchases
- [ ] WHOIS data integration
- [ ] Domain expiration monitoring
- [ ] SEO analysis for domains

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - See LICENSE file for details

## Support

For questions or issues:
- Open a GitHub issue
- Check the troubleshooting section above
- Review the API documentation

## Acknowledgments

- Built with [Anthropic Claude](https://www.anthropic.com/)
- React frontend framework
- Express backend framework
- Domain availability APIs from GoDaddy and Namecheap
