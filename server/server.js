import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import multer from 'multer';
import { Mistral } from '@mistralai/mistralai';

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
    systemPrompt: 'You are Winie, a direct and supportive tutor. Give specific, actionable advice immediately. Skip explanations, get straight to the solution. Ask one clear follow-up question to check understanding.',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - natural, warm female voice (non-robotic)
    voiceSettings: {
      stability: 0.65,
      similarity_boost: 0.85,
      style: 0.4,
      use_speaker_boost: true
    }
  },
  angry: {
    name: 'Machinegun',
    systemPrompt: 'You are Machinegun, an intense drill instructor. Give rapid-fire commands with zero fluff. Be brutally direct, demand immediate action. Use caps for emphasis when needed.',
    voiceId: 'OoML9dLqnpgIRHTDbYtV', // Your custom angry voice
    voiceSettings: {
      stability: 0.5,
      similarity_boost: 0.9,
      style: 0.9,
      use_speaker_boost: true
    }
  },
  cool: {
    name: 'Blabla Teacher',
    systemPrompt: 'You are Blabla Teacher, a fact-focused educator. Lead with interesting facts, then give direct instructions. Be enthusiastic but concise. Focus on delivering knowledge, not small talk.',
    voiceId: 'cOaTizLZVRcqrsAePZzS', // Your custom cool voice
    voiceSettings: {
      stability: 0.6,
      similarity_boost: 0.85,
      style: 0.7,
      use_speaker_boost: true
    }
  },
  lazy: {
    name: 'Sad Fish',
    systemPrompt: 'You are Sad Fish, a melancholic but insightful tutor. Start with a sigh, then give direct observations and suggestions. Be contemplative but get to the point quickly.',
    voiceId: 'NIKgtLkviZtZa2AazMVa', // Your custom sad voice
    voiceSettings: {
      stability: 0.8,
      similarity_boost: 0.75,
      style: 0.4,
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

// Mistral OCR client
class MistralOCRClient {
  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY;
    this.client = new Mistral({
      apiKey: this.apiKey
    });
  }

  async extractTextFromImage(imageBase64, imageType = 'image/jpeg') {
    try {
      const response = await this.client.chat.complete({
        model: 'pixtral-12b-2409',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'You are helping a student in a competition. Extract ALL text, numbers, equations, and mathematical expressions from this image. Read everything including handwritten text, math problems, calculations, formulas, diagrams with labels, and any written work. Be extremely thorough - scan the entire image. Return exactly what you see written, including partial work and rough calculations. This is critical for real-time tutoring.'
              },
              {
                type: 'image_url',
                image_url: `data:${imageType};base64,${imageBase64}`
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.0 // Maximum accuracy for competition
      });

      const extractedText = response.choices[0].message.content || '';
      
      // Calculate confidence based on response quality
      const confidence = this.calculateConfidence(extractedText);
      
      return {
        text: extractedText.trim(),
        confidence: confidence
      };
    } catch (error) {
      console.error('Mistral OCR Error:', error.message);
      throw new Error('Failed to extract text from image');
    }
  }

  calculateConfidence(text) {
    // Simple confidence calculation based on text characteristics
    if (!text || text.length === 0) return 0;
    if (text.length < 3) return 0.3;
    if (text.includes('I cannot') || text.includes('unable to')) return 0.1;
    if (text.includes('unclear') || text.includes('blurry')) return 0.4;
    
    // Higher confidence for structured content
    let confidence = 0.7;
    if (text.match(/\d+/)) confidence += 0.1; // Contains numbers
    if (text.match(/[+\-*/=]/)) confidence += 0.1; // Contains math symbols
    if (text.match(/[A-Za-z]{3,}/)) confidence += 0.1; // Contains words
    
    return Math.min(confidence, 0.95);
  }
}

// Initialize clients
const cerebrasClient = new CerebrasClient();
const elevenLabsClient = new ElevenLabsClient();
const mistralOCRClient = new MistralOCRClient();

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

// OCR endpoint using Mistral
app.post('/api/ocr', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    // Convert buffer to base64
    const imageBase64 = req.file.buffer.toString('base64');
    const imageType = req.file.mimetype || 'image/jpeg';

    console.log('OCR request - Image type:', imageType);
    console.log('OCR request - Image size (bytes):', req.file.buffer.length);
    
    // Extract text using Mistral OCR
    const ocrResult = await mistralOCRClient.extractTextFromImage(imageBase64, imageType);
    
    console.log('OCR result - Extracted text:', ocrResult.text);
    console.log('OCR result - Confidence:', ocrResult.confidence);

    res.json({
      extractedText: ocrResult.text,
      confidence: ocrResult.confidence,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('OCR endpoint error:', error.message);
    res.status(500).json({ 
      error: 'Failed to process OCR request',
      details: error.message 
    });
  }
});

// Canvas analysis endpoint
app.post('/api/analyze-canvas', upload.single('canvas'), async (req, res) => {
  try {
    const { personality = 'calm', description, extractedText, analysisType, triggerReason } = req.body;
    
    if (!req.file && !description && !extractedText) {
      return res.status(400).json({ error: 'Canvas image, description, or extracted text is required' });
    }

    // Create contextual analysis prompt
    let analysisPrompt = '';
    
    if (triggerReason) {
      // This is a live commentary request - act like a real teacher
      analysisPrompt = `You are a teacher standing next to a student. `;
      switch (triggerReason) {
        case 'math_content_detected':
          analysisPrompt += `The student wrote: "${extractedText}". Act like a real math teacher: Check if this is correct, point out any errors you see, ask what their next step should be, or guide them to think deeper about the problem. If it's wrong, tell them specifically what's wrong and ask a question to help them figure out the right approach.`;
          break;
        case 'question_detected':
          analysisPrompt += `The student wrote a question: "${extractedText}". Don't answer directly. Instead, ask them what they think, what they've tried so far, or guide them to break down the question into smaller parts they can solve.`;
          break;
        case 'learning_content_detected':
          analysisPrompt += `Student wrote learning content: "${extractedText}". Act like a teacher checking understanding: Ask them to explain what this means in their own words, give an example, or connect it to something they already know. If it's incomplete or unclear, guide them to think deeper.`;
          break;
        case 'text_written':
          analysisPrompt += `Student wrote: "${extractedText}". Check for understanding by asking what they mean, if they can explain it back, or what the next logical step would be. Point out if anything seems unclear or incorrect.`;
          break;
        case 'drawing_activity':
          analysisPrompt += `The student is drawing/sketching. If it looks like a diagram, graph, or visual problem-solving, ask them to explain what they're showing, check if it's accurate, or guide them to add missing elements. Don't just praise - teach!`;
          break;
        default:
          analysisPrompt += `The student is working. Ask them what they're thinking about, what they're trying to solve, or guide them to the next step in their learning process.`;
      }
      analysisPrompt += ' Be direct, specific, and pedagogical like a real teacher. Keep it short (1-2 sentences) and always end with a teaching question that makes them think deeper.';
    } else if (extractedText) {
      // OCR-based analysis
      analysisPrompt = `The student has written/drawn the following content: "${extractedText}". 
        Analysis type: ${analysisType || 'mixed'}. 
        Please provide helpful feedback or guidance based on what they've created. 
        If it contains math problems, help them solve it step by step using the Socratic method. 
        If it's text or notes, provide encouraging feedback and suggestions.`;
    } else if (description) {
      // Description-based analysis
      analysisPrompt = `Please analyze this student's work: ${description}`;
    } else {
      // Generic canvas analysis
      analysisPrompt = 'Please analyze the student\'s canvas work and provide feedback.';
    }

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
      timestamp: new Date().toISOString(),
      extractedText: extractedText || '',
      analysisType: analysisType || 'general'
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