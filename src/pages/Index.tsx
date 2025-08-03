import { useState } from "react";
import { BookOpen, Brain } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { AIChat } from "@/components/AIChat";
import { PersonalitySelector } from "@/components/PersonalitySelector";
import { Card } from "@/components/ui/card";

const Index = () => {
  const [selectedPersonality, setSelectedPersonality] = useState<'calm' | 'angry' | 'cool' | 'lazy'>('calm');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleAnalyzeCanvas = () => {
    // This would integrate with actual AI analysis
    console.log("Analyzing canvas with", selectedPersonality, "personality");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Digital Notebook</h1>
                <p className="text-sm text-muted-foreground">AI-powered learning companion</p>
              </div>
            </div>
            
            <PersonalitySelector
              selectedPersonality={selectedPersonality}
              onPersonalityChange={setSelectedPersonality}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-120px)]">
          {/* Left Column - Exercise and Drawing */}
          <div className="lg:col-span-2 space-y-6">
            {/* Exercise Upload Section */}
            <ImageUpload 
              onImageUpload={setUploadedImage}
              className="bg-gradient-to-br from-notebook-paper to-card"
            />
            
            {/* Drawing Canvas Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Work Area</h2>
                <p className="text-sm text-muted-foreground">Draw, write, and solve your exercise here</p>
              </div>
              
              <DrawingCanvas className="bg-gradient-to-br from-canvas-bg to-notebook-paper shadow-notebook" />
            </div>
          </div>

          {/* Right Column - AI Chat */}
          <div className="lg:col-span-1">
            <AIChat
              selectedPersonality={selectedPersonality}
              onAnalyzeCanvas={handleAnalyzeCanvas}
              className="h-full shadow-chat bg-gradient-to-br from-card to-background"
            />
          </div>
        </div>
      </div>

      {/* Subtle paper texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-5" 
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='0.1'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")"
        }}
      />
    </div>
  );
};

export default Index;
