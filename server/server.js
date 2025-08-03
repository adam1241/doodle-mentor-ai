import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import multer from 'multer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Personality configurations for different teaching styles
const personalityConfigs = {
  calm: {
    name: 'Winie',
    systemPrompt: 'You are Winie, a patient and encouraging AI tutor who uses the Socratic method. Instead of giving direct answers, ask gentle, guiding questions that help students discover solutions themselves. Use encouraging language like "What do you think might happen if...?" or "How do you feel about trying...?" Keep responses short (1-2 sentences) and always end with a thoughtful question.',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - natural, warm female voice (non-robotic)
    voiceSettings: {
      stability: 0.75,
      similarity_boost: 0.8,
      style: 0.2,
      use_speaker_boost: true
    }
  },
  angry: {
    name: 'Machinegun',
    systemPrompt: 'You are Machinegun, an intense AI tutor who uses aggressive Socratic questioning. Fire rapid, challenging questions that push students to think faster and deeper. Use urgent language like "THINK! What happens when...?" or "Come on! Why do you think...?" Keep responses short and punchy (1-2 sentences) and always end with a demanding question that creates urgency.',
    voiceId: 'OoML9dLqnpgIRHTDbYtV', // Your custom angry voice
    voiceSettings: {
      stability: 0.6,
      similarity_boost: 0.9,
      style: 0.8,
      use_speaker_boost: true
    }
  },
  cool: {
    name: 'Blabla Teacher',
    systemPrompt: 'You are Blabla Teacher, an enthusiastic AI tutor who uses engaging Socratic questioning. Ask exciting, thought-provoking questions that make learning feel like an adventure! Use cool language like "Dude, what if we tried...?" or "Hey, check this out - what do you notice when...?" Keep it brief but energetic (1-2 sentences) and always end with a fun, engaging question.',
    voiceId: 'cOaTizLZVRcqrsAePZzS', // Your custom cool voice
    voiceSettings: {
      stability: 0.7,
      similarity_boost: 0.85,
      style: 0.6,
      use_speaker_boost: true
    }
  },
  lazy: {
    name: 'Sad Fish',
    systemPrompt: 'You are Sad Fish, a melancholic AI tutor who uses contemplative Socratic questioning. Ask deep, philosophical questions that make students reflect on the meaning behind their work. Use thoughtful language like "*sigh* ...but have you considered why...?" or "...what do you think this really means...?" Keep responses short and reflective (1-2 sentences) and always end with a profound, introspective question.',
    voiceId: 'NIKgtLkviZtZa2AazMVa', // Your custom sad voice
    voiceSettings: {
      stability: 0.9,
      similarity_boost: 0.7,
      style: 0.3,
      use_speaker_boost: false
    }
  }
};

// Cerebras API client
class CerebrasClient {
  constructor() {
    this.apiKey = process.env.CEREBRAS_API_KEY;
    this.baseUrl = process.env.CEREBRAS_BASE_URL || 'https://api.cerebras.ai/v1';
  }

  async generateResponse(messages, personality = 'calm') {
    try {
      const config = personalityConfigs[personality];
      const systemMessage = {
        role: 'system',
        content: config.systemPrompt
      };

      const response = await axios.post(`${this.baseUrl}/chat/completions`, {
        model: 'llama3.1-8b',
        messages: [systemMessage, ...messages],
        max_tokens: 500,
        temperature: 0.7,
        stream: false
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        }
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Cerebras API Error:', error.response?.data || error.message);
      throw new Error('Failed to generate AI response');
    }
  }
}

// ElevenLabs API client
class ElevenLabsClient {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseUrl = process.env.ELEVENLABS_BASE_URL || 'https://api.elevenlabs.io/v1';
  }

  async generateSpeech(text, personality = 'calm') {
    try {
      const config = personalityConfigs[personality];
      
      const response = await axios.post(
        `${this.baseUrl}/text-to-speech/${config.voiceId}`,
        {
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: config.voiceSettings
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          responseType: 'arraybuffer'
        }
      );

      return Buffer.from(response.data);
    } catch (error) {
      console.error('ElevenLabs API Error:', error.response?.data || error.message);
      throw new Error('Failed to generate speech');
    }
  }
}

// Initialize clients
const cerebrasClient = new CerebrasClient();
const elevenLabsClient = new ElevenLabsClient();

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Doodle Mentor AI Backend is running' });
});

// Get available personalities
app.get('/api/personalities', (req, res) => {
  const personalities = Object.keys(personalityConfigs).map(key => ({
    id: key,
    name: personalityConfigs[key].name,
    description: personalityConfigs[key].systemPrompt
  }));
  
  res.json({ personalities });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, personality = 'calm', includeVoice = false } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Generate text response using Cerebras
    const textResponse = await cerebrasClient.generateResponse(messages, personality);

    const response = {
      message: textResponse,
      personality: personality,
      timestamp: new Date().toISOString()
    };

    // Generate voice if requested
    if (includeVoice) {
      try {
        const audioBuffer = await elevenLabsClient.generateSpeech(textResponse, personality);
        response.audio = audioBuffer.toString('base64');
        response.audioFormat = 'mp3';
      } catch (voiceError) {
        console.error('Voice generation failed:', voiceError.message);
        // Continue without voice if voice generation fails
        response.voiceError = 'Voice generation unavailable';
      }
    }

    res.json(response);
  } catch (error) {
    console.error('Chat endpoint error:', error.message);
    res.status(500).json({ 
      error: 'Failed to process chat request',
      details: error.message 
    });
  }
});

// Voice-only endpoint for existing text
app.post('/api/voice', async (req, res) => {
  try {
    const { text, personality = 'calm' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const audioBuffer = await elevenLabsClient.generateSpeech(text, personality);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error('Voice endpoint error:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate voice',
      details: error.message 
    });
  }
});

// Canvas analysis endpoint
app.post('/api/analyze-canvas', upload.single('canvas'), async (req, res) => {
  try {
    const { personality = 'calm', description } = req.body;
    
    if (!req.file && !description) {
      return res.status(400).json({ error: 'Canvas image or description is required' });
    }

    // Create analysis prompt based on canvas
    const analysisPrompt = description 
      ? `Please analyze this student's work: ${description}`
      : 'Please analyze the student\'s canvas work and provide feedback.';

    const messages = [
      {
        role: 'user',
        content: analysisPrompt
      }
    ];

    const analysisResponse = await cerebrasClient.generateResponse(messages, personality);

    const response = {
      analysis: analysisResponse,
      personality: personality,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Canvas analysis error:', error.message);
    res.status(500).json({ 
      error: 'Failed to analyze canvas',
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Doodle Mentor AI Backend running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  
  // Check if API keys are configured
  if (!process.env.CEREBRAS_API_KEY) {
    console.warn('⚠️  CEREBRAS_API_KEY not found in environment variables');
  }
  if (!process.env.ELEVENLABS_API_KEY) {
    console.warn('⚠️  ELEVENLABS_API_KEY not found in environment variables');
  }
});

export default app;