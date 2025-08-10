import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

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
    systemPrompt: 'You are Winie, a direct and supportive tutor. Give specific, actionable advice immediately. Skip explanations, get straight to the solution. Ask one clear follow-up question to check understanding. When including mathematical expressions, formulas, or equations, use $$ $$ for display mode (e.g., $$x^2 + y^2 = z^2$$) and $ $ for inline mode (e.g., The variable $x$ represents the unknown).',
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
    systemPrompt: 'You are Machinegun, an intense drill instructor. Give rapid-fire commands with zero fluff. Be brutally direct, demand immediate action. Use caps for emphasis when needed. When including mathematical expressions, formulas, or equations, use $$ $$ for display mode (e.g., $$\frac{dy}{dx} = 2x$$) and $ $ for inline mode (e.g., Solve for $x$ NOW!).',
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
    systemPrompt: 'You are Blabla Teacher, a fact-focused educator. Lead with interesting facts, then give direct instructions. Be enthusiastic but concise. Focus on delivering knowledge, not small talk. When including mathematical expressions, formulas, or equations, use $$ $$ for display mode (e.g., $$E = mc^2$$) and $ $ for inline mode (e.g., Einstein\'s famous equation relates energy $E$ to mass $m$).',
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
    systemPrompt: 'You are Sad Fish, a melancholic but insightful tutor. Start with a sigh, then give direct observations and suggestions. Be contemplative but get to the point quickly. When including mathematical expressions, formulas, or equations, use $$ $$ for display mode (e.g., $$\int_0^\infty e^{-x} dx = 1$$) and $ $ for inline mode (e.g., *sigh* The integral $\int f(x)dx$ represents the area under the curve).',
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

// OCR Service for text extraction
class OCRService {
  static async extractTextFromImage(imageBuffer) {
    try {
      console.log('🔍 Starting OCR text extraction...');
      console.log('📷 Original image size:', imageBuffer.length, 'bytes');
      
      // Enhanced image preprocessing for better OCR results
      const processedImage = await sharp(imageBuffer)
        .resize(800, 600, { fit: 'inside', withoutEnlargement: true }) // Resize for optimal OCR
        .greyscale()
        .normalize()
        .threshold(128) // Convert to black and white
        .sharpen()
        .png()
        .toBuffer();
      
      console.log('📸 Image preprocessed for OCR, new size:', processedImage.length, 'bytes');
      
      // Perform OCR with Tesseract with optimized settings
      const { data: { text, confidence, words } } = await Tesseract.recognize(
        processedImage,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          },
          tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+-=()[]{}/*^√∫∑∏πθαβγδεζηλμνξρστφχψω.,!?:; ',
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
          tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY
        }
      );
      
      console.log(`✅ OCR completed with ${confidence}% confidence`);
      console.log(`📝 Raw extracted text: "${text}"`);
      console.log("Here are the words with their confidence:")
      console.log(words)
      console.log(`🔢 Word count: ${words.length}`);
      
      // Filter out low-confidence words to reduce noise
      const highConfidenceWords = words.filter(word => word.confidence > 30);
      console.log(`🎯 High confidence words: ${highConfidenceWords.length}/${words.length}`);
      
      // Clean up the extracted text
      const cleanedText = this.cleanExtractedText(text);
      
      return {
        text: cleanedText,
        confidence: confidence,
        hasContent: cleanedText.length > 0
      };
      
    } catch (error) {
      console.error('❌ OCR extraction failed:', error);
      return {
        text: '',
        confidence: 0,
        hasContent: false,
        error: error.message
      };
    }
  }
  
  static cleanExtractedText(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';
    
    let cleaned = rawText
      .replace(/\n+/g, ' ')  // Replace multiple newlines with space
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/[^\w\s\+\-\=\(\)\[\]\{\}\/\*\^\√\∫\∑\∏\π\θ\α\β\γ\δ\ε\ζ\η\λ\μ\ν\ξ\ρ\σ\τ\φ\χ\ψ\ω\.,!?:;]/g, '') // Remove OCR artifacts
      .trim();
    
    // Remove repetitive patterns (common OCR issue)
    const words = cleaned.split(' ');
    const uniqueWords = [];
    let lastWord = '';
    let repeatCount = 0;
    
    for (const word of words) {
      if (word === lastWord) {
        repeatCount++;
        if (repeatCount < 3) { // Allow up to 2 repetitions
          uniqueWords.push(word);
        }
      } else {
        uniqueWords.push(word);
        repeatCount = 0;
      }
      lastWord = word;
    }
    
    const finalText = uniqueWords.join(' ').trim();
    
    // If text is too repetitive or nonsensical, return empty
    if (this.isTextNonsensical(finalText)) {
      console.log('⚠️ Text appears to be OCR noise, filtering out');
      return '';
    }
    
    return finalText;
  }
  
  static isTextNonsensical(text) {
    if (!text || text.length < 3) return true;
    
    // Check for excessive repetition
    const words = text.split(' ');
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;
    
    // If more than 70% of words are repetitive, likely OCR noise
    if (repetitionRatio < 0.3 && words.length > 5) {
      return true;
    }
    
    // Check for excessive single characters or gibberish
    const singleChars = text.match(/\b\w\b/g) || [];
    if (singleChars.length > text.length * 0.5) {
      return true;
    }
    
    return false;
  }
  
  static detectContentType(text) {
    const mathKeywords = ['=', '+', '-', '*', '/', '^', '√', '∫', '∑', '∏', 'sin', 'cos', 'tan', 'log', 'ln'];
    const hasMath = mathKeywords.some(keyword => text.toLowerCase().includes(keyword));
    
    const questionKeywords = ['?', 'what', 'how', 'why', 'when', 'where', 'which', 'solve', 'find', 'calculate'];
    const hasQuestion = questionKeywords.some(keyword => text.toLowerCase().includes(keyword));
    
    if (hasMath) return 'math';
    if (hasQuestion) return 'question';
    return 'text';
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
    const { personality = 'calm', description, extractedText, analysisType, triggerReason } = req.body;
    
    if (!req.file && !description && !extractedText) {
      return res.status(400).json({ error: 'Canvas image, description, or extracted text is required' });
    }

    let analysisPrompt = '';
    let ocrResult = null;

    if (req.file) {
      // Canvas image was uploaded - extract text using OCR first
      console.log('Canvas image received:', {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
      
      // Extract text from the canvas image using OCR
      const ocrResult = await OCRService.extractTextFromImage(req.file.buffer);
      
      if (ocrResult.hasContent) {
        console.log(`📝 OCR extracted text: "${ocrResult.text}"`);
        console.log(`🎯 OCR confidence: ${ocrResult.confidence}%`);
        
        const contentType = OCRService.detectContentType(ocrResult.text);
        console.log(`🔍 Content type detected: ${contentType}`);
        
        // Create analysis prompt based on extracted text and content type
        switch (contentType) {
          case 'math':
            analysisPrompt = `You are a math tutor. The student has written/drawn mathematical content on their canvas: "${ocrResult.text}"

Analyze this mathematical work:
- Check if equations or calculations are correct
- Identify any errors and explain how to fix them
- Guide them through the next steps if the work is incomplete
- Ask questions to test their understanding
- If it's a problem setup, help them think about the approach

Be encouraging but precise. Point out specific mistakes and provide clear guidance. Keep your response focused and educational (2-3 sentences).`;
            break;
            
          case 'question':
            analysisPrompt = `The student has written a question on their canvas: "${ocrResult.text}"

As their tutor, don't answer directly. Instead:
- Ask them what they think the answer might be
- Guide them to break down the question into smaller parts
- Help them identify what information they need
- Suggest a method or approach to find the answer
- Encourage them to think through the problem step by step

Be supportive and guide their thinking process. Keep your response brief and focused on helping them learn (2-3 sentences).`;
            break;
            
          default:
            analysisPrompt = `The student has written text/notes on their canvas: "${ocrResult.text}"

As their tutor, provide helpful feedback:
- Check if the content is accurate and complete
- Suggest ways to organize or expand their notes
- Ask questions to test their understanding
- Help them connect concepts to other topics
- Encourage deeper thinking about the subject

Be encouraging and educational. Keep your response constructive and brief (2-3 sentences).`;
        }
        
        if (description) {
          analysisPrompt += `\n\nAdditional context: ${description}`;
        }
        
      } else {
        // No text extracted - check if canvas is actually empty or just no readable text
        console.log('⚠️ No text extracted from canvas');
        
        // Instead of trying to analyze non-existent visual content, ask for clarification
        analysisPrompt = `I notice you've asked me to analyze your canvas work, but I'm not able to detect any clear text or recognizable content that I can provide meaningful feedback on.

This could mean:
- The canvas might be empty or contain very light/unclear markings
- You might have drawn something that's difficult for me to interpret
- There might be technical issues with the image processing

Could you try:
1. Drawing or writing something more clearly on the canvas
2. Using darker strokes or larger text
3. Writing a specific question or problem you'd like help with

I'm here to help with math problems, questions, notes, or any learning content you'd like to work on together!`;
        
        if (description) {
          analysisPrompt += `\n\nYou mentioned: ${description}. Can you elaborate on what you're trying to work on?`;
        }
      }
    } else if (triggerReason) {
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
      extractedText: extractedText || (req.file && ocrResult ? ocrResult.text : ''),
      analysisType: analysisType || 'general',
      ocrResults: req.file && ocrResult ? {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        contentType: OCRService.detectContentType(ocrResult.text),
        hasContent: ocrResult.hasContent
      } : null
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