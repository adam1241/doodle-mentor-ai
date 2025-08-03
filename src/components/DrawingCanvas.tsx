import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Line, IText, PencilBrush, Circle, Rect } from "fabric";
import { Pencil, Square, RotateCcw, Download, Type, Circle as CircleIcon, RectangleHorizontal, Eraser, Minus } from "lucide-react";
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
  const [activeTool, setActiveTool] = useState<"draw" | "text" | "erase" | "select" | "circle" | "rectangle" | "line">("draw");
  const [brushSize, setBrushSize] = useState(2);
  const [brushColor, setBrushColor] = useState("#2563eb");
  const [showGrid, setShowGrid] = useState(true);
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [currentShape, setCurrentShape] = useState<any>(null);
  const [lastRenderTime, setLastRenderTime] = useState(0);
  const renderTimeoutRef = useRef<number | null>(null);

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
      renderOnAddRemove: false, // Manual rendering control
      skipTargetFind: false,
      allowTouchScrolling: false,
      imageSmoothingEnabled: true,
      // Optimize selection appearance
      selectionColor: 'rgba(37, 99, 235, 0.1)',
      selectionBorderColor: '#2563eb',
      selectionLineWidth: 2,
      selectionDashArray: [5, 5],
      // Restore high-DPI for crisp rendering
      enableRetinaScaling: true,
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

  // Handle keyboard events for delete functionality
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fabricCanvas) return;
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObject = fabricCanvas.getActiveObject();
        
        // Check if user is actively editing text - if so, don't interfere
        if (activeObject && activeObject.type === 'i-text' && (activeObject as any).isEditing) {
          return; // Let the text editor handle the key press
        }
        
        const activeObjects = fabricCanvas.getActiveObjects();
        
        if (activeObjects.length > 0) {
          // Delete all selected objects (except grid lines)
          activeObjects.forEach(obj => {
            if ((obj as any).name !== 'grid-line') {
              fabricCanvas.remove(obj);
            }
          });
          fabricCanvas.discardActiveObject();
          fabricCanvas.renderAll();
          toast("Selected objects deleted!");
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [fabricCanvas]);

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
      
      // Check if we're clicking on an existing object
      const target = fabricCanvas.findTarget(options.e);
      
      if (activeTool === 'text') {
        // Only create text if not clicking on an existing object
        if (!target || (target as any).name === 'grid-line') {
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
        }
      } else if (activeTool === 'circle') {
        // Only create new circle if not clicking on an existing object
        if (!target || (target as any).name === 'grid-line') {
          // Disable selection temporarily during creation
          fabricCanvas.selection = false;
          fabricCanvas.discardActiveObject();
          
          setIsDrawingShape(true);
          setStartPoint({ x: pointer.x, y: pointer.y });
          
          const circle = new Circle({
            left: pointer.x,
            top: pointer.y,
            radius: 1,
            fill: 'transparent',
            stroke: brushColor,
            strokeWidth: brushSize,
            selectable: false,
            evented: false, // Disable events during creation
            hasControls: false,
            hasBorders: false,
          });
          
          fabricCanvas.add(circle);
          setCurrentShape(circle);
          // Defer rendering for better performance
          requestAnimationFrame(() => {
            fabricCanvas.renderAll();
          });
        }
      } else if (activeTool === 'rectangle') {
        // Only create new rectangle if not clicking on an existing object
        if (!target || (target as any).name === 'grid-line') {
          // Disable selection temporarily during creation
          fabricCanvas.selection = false;
          fabricCanvas.discardActiveObject();
          
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
            selectable: false,
            evented: false, // Disable events during creation
            hasControls: false,
            hasBorders: false,
          });
          
          fabricCanvas.add(rect);
          setCurrentShape(rect);
          // Defer rendering for better performance
          requestAnimationFrame(() => {
            fabricCanvas.renderAll();
          });
        }
      } else if (activeTool === 'line') {
        // Only create new line if not clicking on an existing object
        if (!target || (target as any).name === 'grid-line') {
          // Disable selection temporarily during creation
          fabricCanvas.selection = false;
          fabricCanvas.discardActiveObject();
          
          setIsDrawingShape(true);
          setStartPoint({ x: pointer.x, y: pointer.y });
          
          const line = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
            stroke: brushColor,
            strokeWidth: brushSize,
            fill: 'transparent',
            selectable: false,
            evented: false, // Disable events during creation
            hasControls: false,
            hasBorders: false,
          });
          
          fabricCanvas.add(line);
          setCurrentShape(line);
          // Defer rendering for better performance
          requestAnimationFrame(() => {
            fabricCanvas.renderAll();
          });
        }
      } else if (activeTool === 'erase') {
        // Handle eraser functionality
        const pointer = fabricCanvas.getPointer(options.e);
        const objects = fabricCanvas.getObjects();
        
        // Find objects to erase (excluding grid lines)
        const objectsToRemove = objects.filter(obj => {
          if ((obj as any).name === 'grid-line') return false;
          
          // Check if pointer is within object bounds
          const objBounds = obj.getBoundingRect();
          return pointer.x >= objBounds.left && 
                 pointer.x <= objBounds.left + objBounds.width &&
                 pointer.y >= objBounds.top && 
                 pointer.y <= objBounds.top + objBounds.height;
        });
        
        // Remove found objects
        objectsToRemove.forEach(obj => fabricCanvas.remove(obj));
        if (objectsToRemove.length > 0) {
          // Defer rendering for better performance
          requestAnimationFrame(() => {
            fabricCanvas.renderAll();
          });
          toast("Objects erased!");
        }
      }
    };

    const handleMouseMove = (options: any) => {
      if (!isDrawingShape || !startPoint || !currentShape) return;
      
      // More aggressive throttling for better performance (33ms = ~30fps)
      const now = Date.now();
      if (now - lastRenderTime < 33) return;
      setLastRenderTime(now);
      
      const pointer = fabricCanvas.getPointer(options.e);
      
      if (activeTool === 'circle') {
        // Calculate radius based on distance from start point
        const deltaX = pointer.x - startPoint.x;
        const deltaY = pointer.y - startPoint.y;
        const radius = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Update circle with center-based positioning
        currentShape.set({
          left: startPoint.x - radius,
          top: startPoint.y - radius,
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
      } else if (activeTool === 'line') {
        // Update line end point
        currentShape.set({
          x2: pointer.x,
          y2: pointer.y,
        });
      }
      
      // Clear any pending render and schedule a new one
      if (renderTimeoutRef.current) {
        cancelAnimationFrame(renderTimeoutRef.current);
      }
      
      renderTimeoutRef.current = requestAnimationFrame(() => {
        fabricCanvas.renderAll();
        renderTimeoutRef.current = null;
      });
    };

    const handleMouseUp = () => {
      if (isDrawingShape && currentShape) {
        // Enable selection and resizing after creation (using default selection styling)
        currentShape.set({
          selectable: true,
          hasControls: true,
          hasBorders: true,
          evented: true, // Re-enable events
        });
        
        // Re-enable canvas selection
        fabricCanvas.selection = true;
        
        // Auto-select the newly created shape for immediate editing
        fabricCanvas.setActiveObject(currentShape);
        
        // Single render call after all changes
        requestAnimationFrame(() => {
          fabricCanvas.renderAll();
        });
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
    fabricCanvas.isDrawingMode = activeTool === "draw";
    
    // Only enable selection when not actively drawing shapes
    if (!isDrawingShape) {
      fabricCanvas.selection = activeTool === "select" || activeTool === "circle" || activeTool === "rectangle" || activeTool === "text" || activeTool === "line";
    }
    
    // Update brush properties
    if (fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = brushColor;
      fabricCanvas.freeDrawingBrush.width = brushSize;
    }
    
    // Handle eraser mode with custom logic to avoid erasing grid
    if (activeTool === "erase") {
      fabricCanvas.isDrawingMode = false; // Disable free drawing mode for eraser
    }
    
    // Configure object controls based on active tool
    if (activeTool === "select" || activeTool === "circle" || activeTool === "rectangle" || activeTool === "text" || activeTool === "line") {
      fabricCanvas.getObjects().forEach(obj => {
        if (obj.type === 'circle' || obj.type === 'rect' || obj.type === 'i-text' || obj.type === 'line') {
          obj.set({
            selectable: true,
            hasControls: true,
            hasBorders: true,
            evented: true,
          });
        }
      });
    } else if (activeTool === "draw" || activeTool === "erase") {
      // Disable selection for drawing tools to prevent accidental selection
      fabricCanvas.discardActiveObject();
      fabricCanvas.getObjects().forEach(obj => {
        if (obj.type === 'circle' || obj.type === 'rect' || obj.type === 'i-text' || obj.type === 'line') {
          obj.set({
            selectable: false,
            hasControls: false,
            hasBorders: false,
          });
        }
      });
    }
    
    fabricCanvas.renderAll();
  }, [activeTool, brushColor, brushSize, fabricCanvas, isDrawingShape]);

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
              variant={activeTool === "line" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool("line")}
              className="gap-2"
            >
              <Minus className="h-4 w-4" />
              Line
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
