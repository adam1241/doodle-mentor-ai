import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Line } from "fabric";
import { Pencil, Eraser, Square, Circle, Type, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface DrawingCanvasProps {
  className?: string;
}

export const DrawingCanvas = ({ className }: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<"draw" | "erase" | "select">("draw");
  const [brushSize, setBrushSize] = useState(3);
  const [brushColor, setBrushColor] = useState("#2563eb");

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 500,
      backgroundColor: "hsl(var(--canvas-bg))",
    });

    // Add notebook lines background
    const drawNotebookLines = () => {
      const lineHeight = 25;
      const canvasHeight = canvas.height || 500;
      
      for (let i = lineHeight; i < canvasHeight; i += lineHeight) {
        const line = new Line([0, i, canvas.width || 800, i], {
          stroke: "hsl(var(--notebook-lines))",
          strokeWidth: 1,
          selectable: false,
          evented: false,
          opacity: 0.3,
        });
        canvas.add(line);
      }
    };

    // Initialize drawing brush
    canvas.freeDrawingBrush.color = brushColor;
    canvas.freeDrawingBrush.width = brushSize;
    canvas.isDrawingMode = activeTool === "draw";

    drawNotebookLines();
    setFabricCanvas(canvas);
    toast("Drawing canvas ready! Start creating!");

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "draw";
    
    if (fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = brushColor;
      fabricCanvas.freeDrawingBrush.width = brushSize;
    }
  }, [activeTool, brushColor, brushSize, fabricCanvas]);

  const handleClearCanvas = () => {
    if (!fabricCanvas) return;
    
    // Keep only the background lines
    const objects = fabricCanvas.getObjects();
    const linesToKeep = objects.filter(obj => 
      obj.type === 'line' && !obj.selectable
    );
    
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "hsl(var(--canvas-bg))";
    
    linesToKeep.forEach(line => fabricCanvas.add(line));
    fabricCanvas.renderAll();
    toast("Canvas cleared!");
  };

  const handleDownload = () => {
    if (!fabricCanvas) return;
    
    const dataURL = fabricCanvas.toDataURL({
      multiplier: 1,
      format: 'png',
      quality: 1,
    });
    
    const link = document.createElement('a');
    link.download = 'my-drawing.png';
    link.href = dataURL;
    link.click();
    toast("Drawing downloaded!");
  };

  const colors = [
    "#2563eb", // blue
    "#dc2626", // red
    "#16a34a", // green
    "#ca8a04", // yellow
    "#9333ea", // purple
    "#ea580c", // orange
    "#0891b2", // cyan
    "#be185d", // pink
    "#374151", // gray
    "#000000", // black
  ];

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTool === "draw" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTool("draw")}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            Draw
          </Button>
          
          <Button
            variant={activeTool === "select" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTool("select")}
            className="gap-2"
          >
            <Square className="h-4 w-4" />
            Select
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Size:</span>
            <Slider
              value={[brushSize]}
              onValueChange={(value) => setBrushSize(value[0])}
              max={20}
              min={1}
              step={1}
              className="w-20"
            />
            <span className="text-xs text-muted-foreground w-6">{brushSize}</span>
          </div>

          <Button variant="outline" size="sm" onClick={handleClearCanvas}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium">Colors:</span>
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => setBrushColor(color)}
            className={`w-6 h-6 rounded-full border-2 transition-all ${
              brushColor === color ? 'border-ring scale-110' : 'border-border hover:scale-105'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="border-2 border-canvas-border rounded-lg overflow-hidden shadow-card">
        <canvas ref={canvasRef} className="block" />
      </div>
    </Card>
  );
};
