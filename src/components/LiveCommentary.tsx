import { useState, useEffect, useRef } from "react";
import { MessageCircle, Eye, Lightbulb, AlertCircle, X, Volume2, VolumeX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LiveCommentary } from "@/services/canvasAnalysis";
import { ApiService } from "@/services/api";

interface LiveCommentaryProps {
  commentary: LiveCommentary[];
  personality: 'calm' | 'angry' | 'cool' | 'lazy';
  isVoiceEnabled: boolean;
  className?: string;
  onToggleVoice?: () => void;
  onClear?: () => void;
}

export const LiveCommentaryComponent = ({ 
  commentary, 
  personality, 
  isVoiceEnabled, 
  className,
  onToggleVoice,
  onClear 
}: LiveCommentaryProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Auto-scroll to latest commentary
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [commentary]);

  // Play voice for new commentary
  useEffect(() => {
    if (commentary.length > 0 && isVoiceEnabled) {
      const latestComment = commentary[commentary.length - 1];
      const now = new Date();
      const commentAge = now.getTime() - latestComment.timestamp.getTime();
      
      // Only play voice for comments less than 5 seconds old
      if (commentAge < 5000) {
        playCommentaryVoice(latestComment.message);
      }
    }
  }, [commentary, isVoiceEnabled]);

  const playCommentaryVoice = async (text: string) => {
    if (!isVoiceEnabled || isPlayingVoice) return;
    
    setIsPlayingVoice(true);
    try {
      const audioBlob = await ApiService.generateVoice(text, personality);
      
      if (audioRef.current) {
        const audioUrl = URL.createObjectURL(audioBlob);
        audioRef.current.src = audioUrl;
        
        audioRef.current.onended = () => {
          URL.revokeObjectURL(audioUrl);
          setIsPlayingVoice(false);
        };
        
        audioRef.current.onerror = () => {
          setIsPlayingVoice(false);
        };
        
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Failed to play commentary voice:', error);
      setIsPlayingVoice(false);
    }
  };

  const getCommentaryIcon = (type: LiveCommentary['type']) => {
    switch (type) {
      case 'encouragement':
        return <Lightbulb className="h-4 w-4 text-green-600" />;
      case 'suggestion':
        return <MessageCircle className="h-4 w-4 text-blue-600" />;
      case 'correction':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'observation':
        return <Eye className="h-4 w-4 text-purple-600" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getCommentaryBadgeColor = (type: LiveCommentary['type']) => {
    switch (type) {
      case 'encouragement':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'suggestion':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'correction':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'observation':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPersonalityColor = () => {
    switch (personality) {
      case 'calm': return 'border-ai-calm';
      case 'angry': return 'border-ai-angry';
      case 'cool': return 'border-ai-cool';
      case 'lazy': return 'border-ai-lazy';
      default: return 'border-primary';
    }
  };

  if (!isVisible) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button 
          onClick={() => setIsVisible(true)}
          className="rounded-full h-12 w-12 p-0 shadow-lg"
          variant="default"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
        {commentary.length > 0 && (
          <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
            {commentary.length}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={`${className} ${getPersonalityColor()} border-2`}>
      {/* Hidden audio element */}
      <audio ref={audioRef} style={{ display: 'none' }} />
      
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Live AI Commentary</h3>
          <Badge variant="secondary" className="text-xs">
            {personality.charAt(0).toUpperCase() + personality.slice(1)}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Voice toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVoice}
            className="h-8 w-8 p-0"
            title={isVoiceEnabled ? "Disable voice" : "Enable voice"}
          >
            {isVoiceEnabled ? (
              <Volume2 className={`h-4 w-4 ${isPlayingVoice ? 'text-green-600 animate-pulse' : ''}`} />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
          
          {/* Clear commentary */}
          {commentary.length > 0 && onClear && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-8 w-8 p-0"
              title="Clear commentary"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          {/* Minimize */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Commentary List */}
      <ScrollArea className="h-64">
        <div className="p-3 space-y-3">
          {commentary.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Start writing or drawing...</p>
              <p className="text-xs">I'll provide live feedback!</p>
            </div>
          ) : (
            commentary.map((comment, index) => (
              <div key={index} className="flex gap-2 animate-in slide-in-from-bottom-2">
                <div className="flex-shrink-0 mt-1">
                  {getCommentaryIcon(comment.type)}
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={`text-xs ${getCommentaryBadgeColor(comment.type)} capitalize`}
                      variant="outline"
                    >
                      {comment.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {comment.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  
                  <p className="text-sm leading-relaxed">
                    {comment.message}
                  </p>
                  
                  {/* Debug info for trigger reason (only in development) */}
                  {process.env.NODE_ENV === 'development' && (
                    <p className="text-xs text-muted-foreground opacity-70">
                      Trigger: {comment.triggerReason}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
          
          {/* Scroll reference */}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Footer */}
      {commentary.length > 0 && (
        <div className="px-3 py-2 border-t bg-muted/50">
          <p className="text-xs text-muted-foreground text-center">
            {commentary.length} comment{commentary.length !== 1 ? 's' : ''} • 
            AI is watching your work live
          </p>
        </div>
      )}
    </Card>
  );
};