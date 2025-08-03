import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Brain, Lightbulb, Volume2, VolumeX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Hi! I'm your ${selectedPersonality} AI tutor. Upload an exercise and I'll help you solve it step by step!`,
      isUser: false,
      timestamp: new Date(),
      type: 'help'
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Text-to-speech function
  const speakText = async (text: string) => {
    if (!isVoiceEnabled) return;
    
    try {
      // For now, we'll use the Web Speech API as a fallback
      // In production, you should replace this with ElevenLabs API
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

  // Update greeting message when personality changes
  useEffect(() => {
    const personalityGreetings = {
      calm: "Hello there! I'm your calm and patient AI tutor. Take your time, and I'll guide you through each step carefully.",
      angry: "Listen up! I'm here to push you to excellence! Don't waste time - let's tackle this exercise with determination!",
      cool: "Hey! 😎 Your cool AI tutor is here. We'll make learning this exercise smooth and fun!",
      lazy: "Oh... hi... I'm your... *yawn* ...laid-back tutor. Don't worry, we'll figure this out... eventually... 😴"
    };

    setMessages(prev => [
      {
        id: Date.now().toString(),
        content: personalityGreetings[selectedPersonality],
        isUser: false,
        timestamp: new Date(),
        type: 'help'
      }
    ]);
  }, [selectedPersonality]);

  const generateAIResponse = (userMessage: string, personality: string): string => {
    const responses = {
      calm: {
        general: "That's a thoughtful question. Let me help you understand this step by step...",
        encouragement: "You're doing great! Keep going at your own pace.",
        analysis: "I can see you're working on this problem. Let me analyze your approach..."
      },
      angry: {
        general: "FOCUS! The answer is right in front of you! Let me break it down...",
        encouragement: "Come on! You can do better than this! Push harder!",
        analysis: "I see what you're doing wrong! Listen carefully and fix these mistakes..."
      },
      cool: {
        general: "That's a solid question! Here's the smooth way to handle it...",
        encouragement: "Nice work! You're getting the hang of this! 🚀",
        analysis: "I'm checking out your work... Looking pretty good so far!"
      },
      lazy: {
        general: "Ugh... fine... let me explain this... *sigh*... it's actually pretty simple...",
        encouragement: "Yeah... that's... okay I guess... keep going...",
        analysis: "Let me take a look... *yawn*... oh yeah, I see what's happening here..."
      }
    };

    // Simple keyword matching for demonstration
    if (userMessage.toLowerCase().includes('help') || userMessage.toLowerCase().includes('stuck')) {
      return responses[personality as keyof typeof responses].encouragement;
    } else if (userMessage.toLowerCase().includes('analyze') || userMessage.toLowerCase().includes('check')) {
      return responses[personality as keyof typeof responses].analysis;
    } else {
      return responses[personality as keyof typeof responses].general;
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate AI thinking time
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: generateAIResponse(inputMessage, selectedPersonality),
        isUser: false,
        timestamp: new Date(),
        type: 'feedback'
      };

      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
      speakText(aiResponse.content);
    }, 1000 + Math.random() * 2000);
  };

  const handleAnalyzeCanvas = () => {
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

    setTimeout(() => {
      const responses = {
        calm: "I can see you've made some good progress. Here are some gentle suggestions to improve your solution...",
        angry: "WHAT IS THIS?! You're making basic mistakes! Fix these errors immediately!",
        cool: "Not bad at all! I can see some clever thinking here. Just a few tweaks and you'll nail it!",
        lazy: "Mmm... yeah... that's... actually not terrible... maybe try... *yawn* ...changing this part..."
      };

      const feedbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: responses[selectedPersonality],
        isUser: false,
        timestamp: new Date(),
        type: 'analysis'
      };

      setMessages(prev => [...prev, feedbackMessage]);
      setIsTyping(false);
      speakText(feedbackMessage.content);
    }, 2000);
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
    <Card className={`flex flex-col h-[600px] ${className}`}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-full bg-${getPersonalityColor()}/20`}>
            <Bot className={`h-5 w-5 text-${getPersonalityColor()}`} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">AI Tutor</h3>
            <Badge variant="secondary" className="text-xs">
              {selectedPersonality.charAt(0).toUpperCase() + selectedPersonality.slice(1)} Mode
            </Badge>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            className="gap-2"
          >
            {isVoiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            Voice
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

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
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
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <span className="text-xs opacity-70 mt-1 block">
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
              <div className="bg-muted text-muted-foreground p-3 rounded-lg">
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
      </ScrollArea>

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
            disabled={!inputMessage.trim() || isTyping}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};