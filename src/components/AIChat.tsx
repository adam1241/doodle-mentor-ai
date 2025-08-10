import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Brain, Lightbulb, Volume2, VolumeX, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiService, ChatMessage } from "@/services/api";


interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'analysis' | 'help' | 'feedback';
}

interface AIChatProps {
  className?: string;
  selectedPersonality: 'calm' | 'angry' | 'cool' | 'lazy';
  onAnalyzeCanvas?: () => void;
}

export const AIChat = ({ className, selectedPersonality, onAnalyzeCanvas }: AIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [backendError, setBackendError] = useState<string>("");
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Check backend connection
  const checkBackendConnection = useCallback(async () => {
    try {
      const isConnected = await ApiService.checkHealth();
      setIsBackendConnected(isConnected);
      if (!isConnected) {
        setBackendError("Backend server is not running. Please start the server first.");
      } else {
        setBackendError("");
      }
    } catch (error) {
      setIsBackendConnected(false);
      setBackendError("Failed to connect to backend server.");
    }
  }, []);

  // Stop all audio playback
  const stopAudio = useCallback(() => {
    // Stop HTML5 audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Stop speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    
    setIsPlaying(false);
  }, []);

  // Play audio from base64 or blob
  const playAudio = useCallback(async (audioData?: string, audioBlob?: Blob) => {
    if (!isVoiceEnabled) {
      console.log('🔇 Voice disabled, skipping audio playback');
      return;
    }
    
    console.log('🎧 Starting audio playback...');
    
    try {
      let audioUrl: string;
      
      if (audioData) {
        console.log('📥 Converting base64 audio data to blob...');
        // Convert base64 to blob and create URL
        const byteCharacters = atob(audioData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'audio/mpeg' });
        audioUrl = URL.createObjectURL(blob);
        console.log('✅ Audio blob created, size:', blob.size, 'bytes');
      } else if (audioBlob) {
        audioUrl = URL.createObjectURL(audioBlob);
        console.log('✅ Audio URL created from provided blob');
      } else {
        console.log('❌ No audio data provided');
        return;
      }

      if (audioRef.current) {
        console.log('🎵 Setting audio source and attempting to play...');
        audioRef.current.src = audioUrl;
        setIsPlaying(true);
        
        // Add error handler
        audioRef.current.onerror = (e) => {
          console.error('❌ Audio element error:', e);
          setIsPlaying(false);
        };
        
        await audioRef.current.play();
        console.log('✅ Audio playback started successfully');
        
        // Clean up URL after playing
        audioRef.current.onended = () => {
          console.log('🏁 Audio playback ended');
          URL.revokeObjectURL(audioUrl);
          setIsPlaying(false);
        };
        
        // Handle pause/stop events
        audioRef.current.onpause = () => {
          console.log('⏸️ Audio playback paused');
          setIsPlaying(false);
        };
      } else {
        console.error('❌ Audio ref not available');
      }
    } catch (error) {
      console.error('❌ Audio playback error:', error);
      setIsPlaying(false);
      // Fallback to text-to-speech if audio fails
      console.log('🔄 Falling back to browser TTS due to audio error');
      await fallbackTextToSpeech('');
    }
  }, [isVoiceEnabled]);

  // Fallback text-to-speech function
  const fallbackTextToSpeech = async (text: string) => {
    if (!isVoiceEnabled || !text) return;
    
    try {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Adjust voice characteristics based on personality
        switch (selectedPersonality) {
          case 'calm':
            utterance.rate = 0.8;
            utterance.pitch = 1.0;
            break;
          case 'angry':
            utterance.rate = 1.2;
            utterance.pitch = 1.2;
            utterance.volume = 0.9;
            break;
          case 'cool':
            utterance.rate = 0.9;
            utterance.pitch = 0.8;
            break;
          case 'lazy':
            utterance.rate = 0.6;
            utterance.pitch = 0.7;
            break;
        }
        
        speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Speech synthesis error:', error);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Check backend connection on component mount
  useEffect(() => {
    checkBackendConnection();
  }, [checkBackendConnection]);

  // Update greeting message when personality changes
  useEffect(() => {
    const personalityGreetings = {
      calm: "Hello there! I'm your calm and patient AI tutor. Take your time, and I'll guide you through each step carefully.",
      angry: "Listen up! I'm here to push you to excellence! Don't waste time - let's tackle this exercise with determination!",
      cool: "Hey! 😎 Your cool AI tutor is here. We'll make learning this exercise smooth and fun!",
      lazy: "Oh... hi... I'm your... *yawn* ...laid-back tutor. Don't worry, we'll figure this out... eventually... 😴"
    };

    setMessages([
      {
        id: Date.now().toString(),
        content: personalityGreetings[selectedPersonality],
        isUser: false,
        timestamp: new Date(),
        type: 'help'
      }
    ]);
  }, [selectedPersonality]);

  // Auto-scroll to bottom when messages change (important for long conversations)
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

    
  useEffect(()=>{
    if(typeof window?.MathJax !== "undefined"){
      window.MathJax.typeset()
    }
  },[messages])

  // Convert messages to chat format for API
  const convertToChatMessages = (messages: Message[]): ChatMessage[] => {
    return messages
      .filter(msg => msg.isUser || !msg.type || msg.type === 'feedback')
      .map(msg => ({
        role: msg.isUser ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !isBackendConnected) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);
    setBackendError("");

    try {
      // Convert current messages to chat format
      const chatMessages = convertToChatMessages([...messages, userMessage]);
      
      // Send to backend API
      const response = await ApiService.sendChatMessage(
        chatMessages, 
        selectedPersonality, 
        isVoiceEnabled
      );

      const aiResponse: Message = {
        id: Date.now().toString(),
        content: response.message,
        isUser: false,
        timestamp: new Date(response.timestamp),
        type: 'feedback'
      };

      setMessages(prev => [...prev, aiResponse]);
      
      // Play audio if available
      if (response.audio) {
        await playAudio(response.audio);
      } else if (isVoiceEnabled) {
        // Fallback to text-to-speech
        await fallbackTextToSpeech(response.message);
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      setBackendError("Failed to get AI response. Please try again.");
      
      // Add error message to chat
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "Sorry, I'm having trouble connecting right now. Please try again later.",
        isUser: false,
        timestamp: new Date(),
        type: 'feedback'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAnalyzeCanvas = async () => {
    if (!isBackendConnected) return;
    
    onAnalyzeCanvas?.();
    
    const analysisMessage: Message = {
      id: Date.now().toString(),
      content: "Let me analyze your work...",
      isUser: false,
      timestamp: new Date(),
      type: 'analysis'
    };

    setMessages(prev => [...prev, analysisMessage]);
    setIsTyping(true);
    setBackendError("");

    try {
      // For now, we'll send a description of the canvas analysis request
      const response = await ApiService.analyzeCanvas(
        undefined, 
        "Please analyze the student's current work on the canvas and provide feedback based on their drawing or mathematical work.",
        selectedPersonality
      );

      const feedbackMessage: Message = {
        id: Date.now().toString(),
        content: response.analysis,
        isUser: false,
        timestamp: new Date(response.timestamp),
        type: 'analysis'
      };

      setMessages(prev => [...prev, feedbackMessage]);
      
      // Generate voice for analysis if enabled
      if (isVoiceEnabled) {
        try {
          const audioBlob = await ApiService.generateVoice(response.analysis, selectedPersonality);
          await playAudio(undefined, audioBlob);
        } catch (voiceError) {
          console.error('Voice generation failed:', voiceError);
          await fallbackTextToSpeech(response.analysis);
        }
      }
      
    } catch (error) {
      console.error('Canvas analysis error:', error);
      setBackendError("Failed to analyze canvas. Please try again.");
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "Sorry, I couldn't analyze your work right now. Please try again later.",
        isUser: false,
        timestamp: new Date(),
        type: 'analysis'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const getMessageIcon = (type?: string) => {
    switch (type) {
      case 'analysis': return <Brain className="h-4 w-4" />;
      case 'help': return <Lightbulb className="h-4 w-4" />;
      default: return <Bot className="h-4 w-4" />;
    }
  };

  const getPersonalityColor = () => {
    switch (selectedPersonality) {
      case 'calm': return 'ai-calm';
      case 'angry': return 'ai-angry';
      case 'cool': return 'ai-cool';
      case 'lazy': return 'ai-lazy';
      default: return 'primary';
    }
  };

  return (
    <Card className={`flex flex-col h-full ${className} min-h-0`}>
      {/* Hidden audio element for playing ElevenLabs audio */}
      <audio ref={audioRef} style={{ display: 'none' }} />
      
      {/* Backend connection error alert */}
      {backendError && (
        <Alert className="m-4 mb-0">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{backendError}</AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-full bg-${getPersonalityColor()}/20`}>
            <Bot className={`h-5 w-5 text-${getPersonalityColor()}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">AI Tutor</h3>
              {isBackendConnected ? (
                <div className="w-2 h-2 bg-green-500 rounded-full" title="Connected to backend" />
              ) : (
                <div className="w-2 h-2 bg-red-500 rounded-full" title="Backend disconnected" />
              )}
            </div>
            <Badge variant="secondary" className="text-xs">
              {selectedPersonality.charAt(0).toUpperCase() + selectedPersonality.slice(1)} Mode
            </Badge>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              const newVoiceState = !isVoiceEnabled;
              setIsVoiceEnabled(newVoiceState);
              
              // Stop any playing audio when voice is disabled
              if (!newVoiceState) {
                stopAudio();
              }
            }}
            className={`gap-2 ${isPlaying ? 'bg-green-100 border-green-300' : ''}`}
          >
            {isVoiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            {isPlaying ? 'Stop Voice' : 'Voice'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAnalyzeCanvas}
            className="gap-2"
          >
            <Brain className="h-4 w-4" />
            Analyze Work
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="space-y-4 overflow-y-auto " style={{ minHeight: 'calc(100vh - 280px)', maxHeight: 'calc(100vh - 280px)', position: 'relative' }}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!message.isUser && (
                <div className={`p-2 rounded-full bg-${getPersonalityColor()}/20 flex-shrink-0`}>
                  {getMessageIcon(message.type)}
                </div>
              )}
              
              <div
                className={`max-w-[80%] p-3 rounded-lg ${
                  message.isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card text-card-foreground border shadow-sm'
                }`}
              >
                {message.isUser ? (
                  <p className="text-sm font-medium">{message.content}</p>
                ) : (
                  <p className="text-sm font-medium text-foreground">{message.content}</p>
                )}
                <span className={`text-xs mt-1 block ${
                  message.isUser ? 'opacity-70' : 'opacity-60 text-muted-foreground'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>

              {message.isUser && (
                <div className="p-2 rounded-full bg-primary/20 flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className={`p-2 rounded-full bg-${getPersonalityColor()}/20 flex-shrink-0`}>
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-card text-foreground p-3 rounded-lg border shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={scrollRef} />
        </div>
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask for help or guidance..."
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputMessage.trim() || isTyping || !isBackendConnected}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};