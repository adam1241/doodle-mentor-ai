import { ApiService } from './api';

export interface CanvasAnalysisResult {
  extractedText: string;
  confidence: number;
  timestamp: Date;
  hasSignificantChange: boolean;
  analysisType: 'text' | 'drawing' | 'mixed';
}

export interface LiveCommentary {
  message: string;
  type: 'encouragement' | 'suggestion' | 'correction' | 'observation';
  timestamp: Date;
  triggerReason: string;
  isLiveCommentary: boolean;
}

export class CanvasAnalysisService {
  private lastAnalysis: CanvasAnalysisResult | null = null;
  private lastImageData: string | null = null;
  private isProcessing = false;
  private analysisQueue: (() => Promise<void>)[] = [];
  private commentaryCallback: ((commentary: LiveCommentary) => void) | null = null;
  private personality: string = 'calm';

  constructor() {
    // No initialization needed for Mistral OCR
  }

  setPersonality(personality: string) {
    this.personality = personality;
  }

  setCommentaryCallback(callback: (commentary: LiveCommentary) => void) {
    this.commentaryCallback = callback;
  }

  private async processQueue() {
    if (this.isProcessing || this.analysisQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.analysisQueue.length > 0) {
      const task = this.analysisQueue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('Canvas analysis task failed:', error);
        }
      }
    }
    
    this.isProcessing = false;
  }

  private queueAnalysis(task: () => Promise<void>) {
    // Limit queue size to prevent memory issues
    if (this.analysisQueue.length > 3) {
      this.analysisQueue.shift(); // Remove oldest task
    }
    
    this.analysisQueue.push(task);
    this.processQueue();
  }

  private hasSignificantImageChange(newImageData: string): boolean {
    if (!this.lastImageData) return true;
    
    // Simple change detection - compare image data length and a sample
    const sizeDifference = Math.abs(newImageData.length - this.lastImageData.length);
    const significantSizeChange = sizeDifference > 1000; // Threshold for significant change
    
    // Sample comparison at multiple points
    const samplePoints = [0.25, 0.5, 0.75];
    let differenceCount = 0;
    
    for (const point of samplePoints) {
      const index = Math.floor(newImageData.length * point);
      const oldIndex = Math.floor(this.lastImageData.length * point);
      
      if (index < newImageData.length && oldIndex < this.lastImageData.length) {
        const newSample = newImageData.substr(index, 100);
        const oldSample = this.lastImageData.substr(oldIndex, 100);
        
        if (newSample !== oldSample) {
          differenceCount++;
        }
      }
    }
    
    return significantSizeChange || differenceCount >= 2;
  }

  private async performOCR(imageData: string): Promise<{ text: string; confidence: number }> {
    try {
      // Convert data URL to blob
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      // Use Mistral OCR via API
      const ocrResult = await ApiService.performOCR(blob);
      
      return {
        text: ocrResult.extractedText,
        confidence: ocrResult.confidence
      };
    } catch (error) {
      console.error('Mistral OCR processing failed:', error);
      return { text: '', confidence: 0 };
    }
  }

  private determineAnalysisType(extractedText: string, imageData: string): 'text' | 'drawing' | 'mixed' {
    const textLength = extractedText.replace(/\s/g, '').length;
    const hasText = textLength > 5;
    const imageSize = imageData.length;
    
    // Heuristic: if we have significant text and the image is large, it's mixed
    if (hasText && imageSize > 50000) {
      return 'mixed';
    } else if (hasText) {
      return 'text';
    } else {
      return 'drawing';
    }
  }

  private async generateLiveCommentary(analysis: CanvasAnalysisResult): Promise<void> {
    if (!this.commentaryCallback) {
      console.log('No commentary callback set');
      return;
    }

    console.log('Generating live commentary for:', analysis.extractedText);
    
    try {
      let triggerReason = '';
      let commentType: LiveCommentary['type'] = 'correction';
      
      // Determine trigger reason and comment type with better logic
      if (analysis.extractedText.length > 1) {
        if (this.detectMathContent(analysis.extractedText)) {
          triggerReason = 'math_content_detected';
          commentType = this.detectPotentialMathError(analysis.extractedText) ? 'correction' : 'suggestion';
        } else if (this.detectQuestionWords(analysis.extractedText)) {
          triggerReason = 'question_detected';
          commentType = 'suggestion';
        } else if (this.detectLearningKeywords(analysis.extractedText)) {
          triggerReason = 'learning_content_detected';
          commentType = 'suggestion';
        } else {
          triggerReason = 'text_written';
          commentType = 'observation';
        }
      } else if (analysis.analysisType === 'drawing') {
        triggerReason = 'drawing_activity';
        commentType = 'suggestion';
      } else {
        triggerReason = 'canvas_activity';
        commentType = 'observation';
      }

      // Generate contextual prompt for AI
      const contextPrompt = this.buildContextualPrompt(analysis, triggerReason);
      
      // Get AI response
      const response = await ApiService.sendChatMessage(
        [{ role: 'user', content: contextPrompt }],
        this.personality,
        false
      );

      const commentary: LiveCommentary = {
        message: response.message,
        type: commentType,
        timestamp: new Date(),
        triggerReason,
        isLiveCommentary: true
      };

      console.log('Generated commentary:', commentary);
      this.commentaryCallback(commentary);
    } catch (error) {
      console.error('Failed to generate live commentary:', error);
      console.error('Error details:', error.message);
    }
  }

  private buildContextualPrompt(analysis: CanvasAnalysisResult, triggerReason: string): string {
    const text = analysis.extractedText;
    
    switch (triggerReason) {
      case 'math_content_detected':
        return `Check: "${text}". Is this right? If wrong, say what's wrong. If right, what's next?`;
      case 'question_detected':
        return `You asked: "${text}". What do you think? Break it down step by step.`;
      case 'drawing_activity':
        return `Nice drawing! What does this show? Is it accurate?`;
      default:
        return `I see: "${text}". What's your next step?`;
    }
  }

  private detectMathContent(text: string): boolean {
    const mathPatterns = [
      /\d+\s*[\+\-\*\/\=]\s*\d+/,  // Basic math operations: 2+3, 5*4, etc.
      /\d+\s*[\+\-\*\/]\s*\d+\s*[\+\-\*\/]\s*\d+/, // Multi-step: 2+3*4
      /\b(solve|equation|calculate|sum|product|divide|multiply|add|subtract)\b/i,
      /\b[a-z]\s*[\+\-\*\/\=]\s*\d+/i,  // Variables: x = 5, y + 3
      /\b\d+[a-z]\b/i, // Algebra: 3x, 5y
      /\b(fraction|decimal|percentage|percent|ratio|proportion)\b/i,
      /\b(geometry|triangle|circle|square|rectangle|area|perimeter|volume)\b/i,
      /\b(sin|cos|tan|log|ln)\b/i, // Trig/calculus
      /\d+\/\d+/, // Fractions: 1/2, 3/4
      /\b(theorem|proof|formula|derivative|integral)\b/i,
      /\b\d+\s*degrees?\b/i, // Angles: 45 degrees
      /\b(slope|intercept|linear|quadratic|polynomial)\b/i,
      /\^\d+/, // Exponents: x^2, 2^3
      /√\d+/, // Square roots
      /\b(prime|factor|GCD|LCM)\b/i // Number theory
    ];
    
    return mathPatterns.some(pattern => pattern.test(text));
  }

  private detectQuestionWords(text: string): boolean {
    const questionPatterns = [
      /\b(what|how|why|when|where|which|who)\b/i,
      /\?/,
      /\b(help|stuck|confused|don't understand)\b/i
    ];
    
    return questionPatterns.some(pattern => pattern.test(text));
  }

  private detectPotentialMathError(text: string): boolean {
    // Simple heuristics to detect common math errors
    const errorPatterns = [
      /\d+\s*[\+\-\*\/]\s*\d+\s*=\s*[^\d\s]/, // Wrong answer format
      /0\s*\/\s*\d+\s*=\s*\d+/, // Division by zero misconceptions
      /\d+\s*\*\s*0\s*=\s*[^0]/, // Multiplication by zero errors
      /\d+\s*\+\s*\d+\s*=\s*\d+\s*\*\s*\d+/, // Mixed up operations
      /\b(infinite|undefined|impossible)\b/i, // Student recognizing errors
    ];
    
    return errorPatterns.some(pattern => pattern.test(text));
  }

  private detectLearningKeywords(text: string): boolean {
    const learningPatterns = [
      /\b(definition|theorem|rule|formula|principle)\b/i,
      /\b(because|therefore|thus|hence|so)\b/i,
      /\b(step|method|process|procedure|algorithm)\b/i,
      /\b(example|instance|case|scenario)\b/i,
      /\b(property|characteristic|feature|attribute)\b/i,
      /\b(concept|idea|theory|hypothesis)\b/i,
      /\b(remember|recall|know|understand|learn)\b/i
    ];
    
    return learningPatterns.some(pattern => pattern.test(text));
  }

  async analyzeCanvas(canvasElement: HTMLCanvasElement): Promise<CanvasAnalysisResult | null> {
    if (!canvasElement) return null;

    // Convert canvas to data URL with high quality
    const imageData = canvasElement.toDataURL('image/png', 1.0);
    
    console.log('Canvas analysis - Canvas size:', canvasElement.width, 'x', canvasElement.height);
    console.log('Canvas analysis - Image data length:', imageData.length);
    
    // Check if there's a significant change
    if (!this.hasSignificantImageChange(imageData)) {
      return this.lastAnalysis;
    }

    // Queue the analysis to prevent blocking
    this.queueAnalysis(async () => {
      try {
        // Perform OCR
        const ocrResult = await this.performOCR(imageData);
        
        // Create analysis result
        const analysis: CanvasAnalysisResult = {
          extractedText: ocrResult.text,
          confidence: ocrResult.confidence,
          timestamp: new Date(),
          hasSignificantChange: true,
          analysisType: this.determineAnalysisType(ocrResult.text, imageData)
        };

        // Store current state
        this.lastAnalysis = analysis;
        this.lastImageData = imageData;

        console.log('Canvas analysis - Extracted text:', analysis.extractedText);
        console.log('Canvas analysis - Confidence:', analysis.confidence);
        
        // Generate live commentary for ANY content - even single characters for competition
        if (analysis.extractedText.length > 0 || analysis.analysisType === 'drawing') {
          await this.generateLiveCommentary(analysis);
        }
      } catch (error) {
        console.error('Canvas analysis failed:', error);
      }
    });

    return this.lastAnalysis;
  }

  // Method to analyze uploaded images
  async analyzeUploadedImage(imageFile: File): Promise<CanvasAnalysisResult> {
    try {
      // Use Mistral OCR directly for uploaded files
      const ocrResult = await ApiService.performOCR(imageFile);
      
      const analysis: CanvasAnalysisResult = {
        extractedText: ocrResult.extractedText,
        confidence: ocrResult.confidence,
        timestamp: new Date(),
        hasSignificantChange: true,
        analysisType: this.determineAnalysisType(ocrResult.extractedText, '')
      };

      // Generate commentary for uploaded content
      if (analysis.extractedText.length > 1) {
        await this.generateLiveCommentary(analysis);
      }

      return analysis;
    } catch (error) {
      console.error('Image analysis failed:', error);
      throw error;
    }
  }

  // Clean up resources
  async dispose() {
    // No cleanup needed for Mistral OCR
  }
}

// Singleton instance
export const canvasAnalysisService = new CanvasAnalysisService();