
import { useState, useRef } from "react";
import { Upload, X, FileImage, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface ImageUploadProps {
  className?: string;
  onImageUpload?: (imageUrl: string) => void;
}

export const ImageUpload = ({ className, onImageUpload }: ImageUploadProps) => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setUploadedImage(imageUrl);
      onImageUpload?.(imageUrl);
      toast.success("Exercise image uploaded successfully!");
      setIsModalOpen(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const removeImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast("Image removed");
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={uploadedImage ? "default" : "outline"} 
          size="sm" 
          className={`gap-2 ${className}`}
        >
          <Image className="h-4 w-4" />
          {uploadedImage ? "View Exercise" : "Upload Exercise"}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exercise Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!uploadedImage ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                isDragOver 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground mb-1">
                    Drop your exercise image here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse files
                  </p>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <FileImage className="h-4 w-4" />
                  Choose Image
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative group">
                <img
                  src={uploadedImage}
                  alt="Uploaded exercise"
                  className="w-full h-auto max-h-[60vh] object-contain rounded-lg shadow-card border border-border"
                />
              </div>
              <div className="flex justify-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={removeImage}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Remove Image
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Exercise image uploaded. You can now work on it in the drawing area!
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
