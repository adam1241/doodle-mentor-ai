import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Line, IText, PencilBrush, Circle, Rect } from "fabric";
import { Pencil, Square, RotateCcw, Download, Type, Circle as CircleIcon, RectangleHorizontal, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface DrawingCanvasProps {
  className?: string;
}

export const DrawingCanvas = ({ className }: DrawingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<"draw" | "text" | "erase" | "select" | "circle" | "rectangle">("draw");
  const [brushSize, setBrushSize] = useState(2);
  const [brushColor, setBrushColor] = useState("#2563eb");
  const [showGrid, setShowGrid] = useState(true);
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [currentShape, setCurrentShape] = useState<any>(null);

  // Initialize canvas with better precision settings (only once)
  const initializeCanvas = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth - 32; // Account for padding
    const containerHeight = Math.max(600, container.clientHeight - 100);

    const canvas = new FabricCanvas(canvasRef.current, {
      width: containerWidth,
      height: containerHeight,
      backgroundColor: "#ffffff",
      selection: true,
      preserveObjectStacking: true,
      renderOnAddRemove: false,
    });

    // Set high DPI for crisp rendering
    const ratio = window.devicePixelRatio || 1;
    canvas.setDimensions({
      width: containerWidth,
      height: containerHeight
    });
    
    const canvasEl = canvas.getElement();
    canvasEl.width = containerWidth * ratio;
    canvasEl.height = containerHeight * ratio;
    canvasEl.style.width = containerWidth + 'px';
    canvasEl.style.height = containerHeight + 'px';
    
    canvas.getContext().scale(ratio, ratio);

    // Configure drawing brush for precision
    const brush = new PencilBrush(canvas);
    brush.color = brushColor;
    brush.width = brushSize;
    brush.shadow = null;
    canvas.freeDrawingBrush = brush;
    
    canvas.isDrawingMode = activeTool === "draw";

    setFabricCanvas(canvas);
    toast("Enhanced drawing canvas ready! Try all the tools!");

    return canvas;
  }, []); // Empty dependency array - only initialize once

  // Add grid function (separate from initialization)
  const addGrid = useCallback(() => {
    if (!fabricCanvas || !showGrid) return;
    
    // Remove existing grid lines first
    const existingGridLines = fabricCanvas.getObjects().filter(obj => (obj as any).name === 'grid-line');
    existingGridLines.forEach(line => fabricCanvas.remove(line));
    
    const gridSize = 20;
    const canvasWidth = fabricCanvas.width || 800;
    const canvasHeight = fabricCanvas.height || 600;
    
    // Create vertical lines
    for (let i = 0; i <= canvasWidth; i += gridSize) {
      const line = new Line([i, 0, i, canvasHeight], {
        stroke: "#f3f4f6",
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        name: 'grid-line'
      });
      fabricCanvas.add(line);
    }
    
    // Create horizontal lines
    for (let i = 0; i <= canvasHeight; i += gridSize) {
      const line = new Line([0, i, canvasWidth, i], {
        stroke: "#f3f4f6",
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        name: 'grid-line'
      });
      fabricCanvas.add(line);
    }
    
    fabricCanvas.renderAll();
  }, [fabricCanvas, showGrid]);

  // Initialize canvas only once
  useEffect(() => {
    const canvas = initializeCanvas();
    
    const handleResize = () => {
      if (canvas && containerRef.current) {
        const container = containerRef.current;
        const containerWidth = container.clientWidth - 32;
        const containerHeight = Math.max(600, container.clientHeight - 100);
        
        canvas.setDimensions({
          width: containerWidth,
          height: containerHeight
        });
        canvas.renderAll();
      }
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (canvas) {
        canvas.dispose();
      }
    };
  }, [initializeCanvas]);

  // Add grid when canvas is ready or showGrid changes
  useEffect(() => {
    if (fabricCanvas) {
      addGrid();
    }
  }, [fabricCanvas, addGrid]);

  // Setup event listeners for tools (separate from initialization)
  useEffect(() => {
    if (!fabricCanvas) return;

    // Remove existing event listeners
    fabricCanvas.off('mouse:down');
    fabricCanvas.off('mouse:move');
    fabricCanvas.off('mouse:up');

    // Add event listeners for better interaction
    const handleMouseDown = (options: any) => {
      const pointer = fabricCanvas.getPointer(options.e);
      
      if (activeTool === 'text') {
        const text = new IText('Type here...', {
          left: pointer.x,
          top: pointer.y,
          fontFamily: 'Arial',
          fontSize: Math.max(16, brushSize),
          fill: brushColor,
          editable: true,
        });
        fabricCanvas.add(text);
        fabricCanvas.setActiveObject(text);
        text.enterEditing();
        fabricCanvas.renderAll();
      } else if (activeTool === 'circle') {
        // Start creating circle with drag
        setIsDrawingShape(true);
        setStartPoint({ x: pointer.x, y: pointer.y });
        
        const circle = new Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 1,
          fill: 'transparent',
          stroke: brushColor,
          strokeWidth: brushSize,
          selectable: false, // Disable selection during creation
        });
        
        fabricCanvas.add(circle);
        setCurrentShape(circle);
        fabricCanvas.renderAll();
      } else if (activeTool === 'rectangle') {
        // Start creating rectangle with drag
        setIsDrawingShape(true);
        setStartPoint({ x: pointer.x, y: pointer.y });
        
        const rect = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 1,
          height: 1,
          fill: 'transparent',
          stroke: brushColor,
          strokeWidth: brushSize,
          selectable: false, // Disable selection during creation
        });
        
        fabricCanvas.add(rect);
        setCurrentShape(rect);
        fabricCanvas.renderAll();
      }
    };

    const handleMouseMove = (options: any) => {
      if (!isDrawingShape || !startPoint || !currentShape) return;
      
      const pointer = fabricCanvas.getPointer(options.e);
      
      if (activeTool === 'circle') {
        // Calculate radius based on distance from start point
        const deltaX = pointer.x - startPoint.x;
        const deltaY = pointer.y - startPoint.y;
        const radius = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        currentShape.set({
          radius: Math.max(5, radius),
        });
      } else if (activeTool === 'rectangle') {
        // Calculate width and height from start point
        const width = Math.abs(pointer.x - startPoint.x);
        const height = Math.abs(pointer.y - startPoint.y);
        
        currentShape.set({
          left: Math.min(startPoint.x, pointer.x),
          top: Math.min(startPoint.y, pointer.y),
          width: Math.max(5, width),
          height: Math.max(5, height),
        });
      }
      
      fabricCanvas.renderAll();
    };

    const handleMouseUp = () => {
      if (isDrawingShape && currentShape) {
        // Enable selection and resizing after creation
        currentShape.set({
          selectable: true,
          hasControls: true,
          hasBorders: true,
        });
        
        // Auto-select the newly created shape for immediate editing
        fabricCanvas.setActiveObject(currentShape);
        fabricCanvas.renderAll();
      }
      
      // Reset drawing state
      setIsDrawingShape(false);
      setStartPoint(null);
      setCurrentShape(null);
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:move', handleMouseMove);
    fabricCanvas.on('mouse:up', handleMouseUp);

    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:up', handleMouseUp);
    };
  }, [fabricCanvas, activeTool, brushColor, brushSize, isDrawingShape, startPoint, currentShape]);

  // Update canvas settings when tool/color/size changes
  useEffect(() => {
    if (!fabricCanvas) return;

    // Set drawing mode and selection based on active tool
    fabricCanvas.isDrawingMode = activeTool === "draw" || activeTool === "erase";
    fabricCanvas.selection = activeTool === "select" || activeTool === "circle" || activeTool === "rectangle" || activeTool === "text";
    
    // Update brush properties
    if (fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = brushColor;
      fabricCanvas.freeDrawingBrush.width = brushSize;
    }
    
    // Handle eraser mode
    if (activeTool === "erase") {
      fabricCanvas.isDrawingMode = true;
      if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = "#ffffff";
        fabricCanvas.freeDrawingBrush.width = brushSize * 2;
      }
    }
    
    // Enable object controls for shape and text tools
    if (activeTool === "select" || activeTool === "circle" || activeTool === "rectangle" || activeTool === "text") {
      fabricCanvas.getObjects().forEach(obj => {
        if (obj.type === 'circle' || obj.type === 'rect' || obj.type === 'i-text') {
          obj.set({
            selectable: true,
            hasControls: true,
            hasBorders: true,
          });
        }
      });
    } else {
      // Disable selection for drawing tools to prevent accidental selection
      fabricCanvas.discardActiveObject();
    }
    
    fabricCanvas.renderAll();
  }, [activeTool, brushColor, brushSize, fabricCanvas]);

  const handleClearCanvas = () => {
    if (!fabricCanvas) return;
    
    // Clear all objects except grid lines
    const objects = fabricCanvas.getObjects();
    const nonGridObjects = objects.filter(obj => (obj as any).name !== 'grid-line');
    
    nonGridObjects.forEach(obj => fabricCanvas.remove(obj));
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
    toast("Canvas cleared!");
  };
  
  const toggleGrid = () => {
    setShowGrid(!showGrid);
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
    <Card className={`p-4 ${className}`} ref={containerRef}>
      {/* Enhanced Toolbar */}
      <div className="space-y-4 mb-4">
        {/* Drawing Tools */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
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
              variant={activeTool === "text" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("text")}
              className="gap-2"
            >
              <Type className="h-4 w-4" />
              Text
            </Button>
            
            <Button
              variant={activeTool === "erase" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("erase")}
              className="gap-2"
            >
              <Eraser className="h-4 w-4" />
              Erase
            </Button>
            
            <Button
              variant={activeTool === "circle" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("circle")}
              className="gap-2"
            >
              <CircleIcon className="h-4 w-4" />
              Circle
            </Button>
            
            <Button
              variant={activeTool === "rectangle" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("rectangle")}
              className="gap-2"
            >
              <RectangleHorizontal className="h-4 w-4" />
              Rectangle
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

          <div className="flex items-center gap-2">
            <Button 
              variant={showGrid ? "default" : "outline"} 
              size="sm" 
              onClick={toggleGrid}
              className="text-xs"
            >
              Grid
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleClearCanvas}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Size and Color Controls */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Size:</span>
            <Slider
              value={[brushSize]}
              onValueChange={(value) => setBrushSize(value[0])}
              max={activeTool === 'text' ? 48 : 20}
              min={1}
              step={1}
              className="w-24"
            />
            <span className="text-xs text-muted-foreground w-8 text-center">{brushSize}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Colors:</span>
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setBrushColor(color)}
                className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-105 ${
                  brushColor === color ? 'border-ring scale-110 shadow-lg' : 'border-border'
                }`}
                style={{ backgroundColor: color }}
                title={`Select ${color}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="border-2 border-border rounded-lg overflow-hidden bg-white">
        <canvas 
          ref={canvasRef} 
          className="block cursor-crosshair" 
          style={{ display: 'block' }}
        />
      </div>
    </Card>
  );
};
