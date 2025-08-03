import { useState } from "react";
import { Brain, Zap, Glasses, Coffee, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Personality = 'calm' | 'angry' | 'cool' | 'lazy';

interface PersonalityOption {
  id: Personality;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface PersonalitySelectorProps {
  selectedPersonality: Personality;
  onPersonalityChange: (personality: Personality) => void;
  className?: string;
}

export const PersonalitySelector = ({ 
  selectedPersonality, 
  onPersonalityChange, 
  className 
}: PersonalitySelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const personalities: PersonalityOption[] = [
    {
      id: 'calm',
      name: 'Calm Teacher',
      description: 'Patient and encouraging, explains things step by step',
      icon: <Brain className="h-5 w-5" />,
      color: 'text-ai-calm',
      bgColor: 'bg-ai-calm/20'
    },
    {
      id: 'angry',
      name: 'Strict Teacher',
      description: 'Direct and demanding, pushes you to excellence',
      icon: <Zap className="h-5 w-5" />,
      color: 'text-ai-angry',
      bgColor: 'bg-ai-angry/20'
    },
    {
      id: 'cool',
      name: 'Cool Teacher',
      description: 'Fun and modern, makes learning enjoyable',
      icon: <Glasses className="h-5 w-5" />,
      color: 'text-ai-cool',
      bgColor: 'bg-ai-cool/20'
    },
    {
      id: 'lazy',
      name: 'Laid-back Teacher',
      description: 'Relaxed and casual, takes things easy',
      icon: <Coffee className="h-5 w-5" />,
      color: 'text-ai-lazy',
      bgColor: 'bg-ai-lazy/20'
    }
  ];

  const selectedOption = personalities.find(p => p.id === selectedPersonality);

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 min-w-[180px] justify-between"
          >
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-full ${selectedOption?.bgColor}`}>
                <div className={selectedOption?.color}>
                  {selectedOption?.icon}
                </div>
              </div>
              <span className="font-medium">{selectedOption?.name}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-80 p-2">
          <div className="space-y-1">
            <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
              Choose your AI tutor personality
            </div>
            
            {personalities.map((personality) => (
              <Card
                key={personality.id}
                className={`p-3 cursor-pointer transition-all hover:shadow-sm ${
                  selectedPersonality === personality.id 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => {
                  onPersonalityChange(personality.id);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${personality.bgColor} flex-shrink-0`}>
                    <div className={personality.color}>
                      {personality.icon}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm text-foreground">
                        {personality.name}
                      </h4>
                      {selectedPersonality === personality.id && (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {personality.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};