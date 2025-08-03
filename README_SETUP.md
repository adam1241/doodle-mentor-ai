
# Doodle Mentor AI - Setup Guide

This application integrates Cerebras for AI text generation and ElevenLabs for voice synthesis to create an interactive AI tutor with different personality types.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Cerebras API Key** - Get from [Cerebras Cloud](https://cloud.cerebras.ai/)
4. **ElevenLabs API Key** - Get from [ElevenLabs](https://elevenlabs.io/)

## Setup Instructions

### 1. Install Frontend Dependencies

```bash
# Already done if you ran npm install in the main directory
npm install
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Configure Environment Variables

1. Copy the example environment file:
```bash
cd server
cp .env.example .env
```

2. Edit `.env` file and add your API keys:
```env
# Cerebras API Configuration
CEREBRAS_API_KEY=your_cerebras_api_key_here
CEREBRAS_BASE_URL=https://api.cerebras.ai/v1

# ElevenLabs API Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_BASE_URL=https://api.elevenlabs.io/v1

# Server Configuration
PORT=3001
NODE_ENV=development
```

### 4. Start the Backend Server

```bash
cd server
npm run dev
```

The backend will run on http://localhost:3001

### 5. Start the Frontend (in a new terminal)

```bash
# From the project root directory
npm run dev
```

The frontend will run on http://localhost:8080

## API Keys Setup

### Cerebras API Key
1. Visit [Cerebras Cloud](https://cloud.cerebras.ai/)
2. Sign up or log in
3. Navigate to API keys section
4. Create a new API key
5. Copy the key to your `.env` file

### ElevenLabs API Key
1. Visit [ElevenLabs](https://elevenlabs.io/)
2. Sign up or log in
3. Go to your profile/settings
4. Navigate to API keys
5. Create a new API key
6. Copy the key to your `.env` file

## Teacher Personalities

The system includes 4 different AI tutor personalities:

1. **Winie (Calm)** - Patient and encouraging
2. **Machinegun (Angry)** - Fast-paced and intense
3. **Blabla Teacher (Cool)** - Talkative and enthusiastic
4. **Sad Fish (Lazy)** - Melancholic and thoughtful

Each personality has:
- Unique response styles via Cerebras
- Different voice characteristics via ElevenLabs
- Customized teaching approaches

## Features

### Chat Functionality
- Real-time AI responses using Cerebras
- Voice synthesis using ElevenLabs
- Personality-based responses
- Message history

### Canvas Analysis
- AI analysis of student work
- Feedback based on selected personality
- Voice feedback option

### Voice Features
- Toggle voice on/off
- Personality-specific voice settings
- Fallback to browser TTS if ElevenLabs fails

## Troubleshooting

### Backend Connection Issues
- Ensure backend server is running on port 3001
- Check that API keys are properly set in `.env`
- Verify firewall/network settings

### Voice Issues
- Check ElevenLabs API key and quota
- Ensure browser allows audio playback
- Check browser console for audio errors

### API Rate Limits
- Both Cerebras and ElevenLabs have rate limits
- Consider implementing request queuing for production use
- Monitor API usage in respective dashboards

## Development

### Adding New Personalities
1. Update `personalityConfigs` in `server/server.js`
2. Add corresponding entries in frontend components
3. Configure appropriate ElevenLabs voice IDs

### Backend Endpoints
- `GET /health` - Health check
- `POST /api/chat` - Send chat message
- `POST /api/voice` - Generate voice only
- `POST /api/analyze-canvas` - Analyze canvas work
- `GET /api/personalities` - Get available personalities

## Production Deployment

1. Set `NODE_ENV=production` in backend `.env`
2. Update `API_BASE_URL` in frontend to production backend URL
3. Configure proper CORS settings
4. Set up proper error handling and logging
5. Consider implementing rate limiting
6. Set up monitoring for API usage and costs

## Security Notes

- Never commit `.env` files to version control
- Use environment-specific API keys
- Implement proper input validation
- Consider adding authentication for production use
- Monitor API key usage and set up alerts