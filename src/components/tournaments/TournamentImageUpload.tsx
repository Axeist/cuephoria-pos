
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tournament } from '@/types/tournament.types';

interface TournamentImageUploadProps {
  tournament: Tournament;
  onImageUploaded?: () => void;
}

const TournamentImageUpload: React.FC<TournamentImageUploadProps> = ({
  tournament,
  onImageUploaded
}) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [winnerName, setWinnerName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive"
      });
      return;
    }

    setSelectedFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreview(null);
    setCaption('');
    setWinnerName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `tournament-${tournament.id}-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tournament-images')
        .upload(fileName, selectedFile);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('tournament-images')
        .getPublicUrl(fileName);

      // Save image record to database
      const { error: dbError } = await supabase
        .from('tournament_winner_images')
        .insert({
          tournament_id: tournament.id,
          image_url: urlData.publicUrl,
          caption: caption.trim() || null,
          winner_name: winnerName.trim() || null,
          created_by: 'admin'
        });

      if (dbError) {
        throw dbError;
      }

      toast({
        title: "Image uploaded successfully",
        description: "The tournament image has been added to the gallery."
      });

      clearSelection();
      onImageUploaded?.();

    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload the image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Upload Tournament Image
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="image-upload">Select Image</Label>
          <Input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            ref={fileInputRef}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Maximum file size: 5MB. Supported formats: JPG, PNG, GIF, WebP
          </p>
        </div>

        {preview && (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-48 object-cover rounded-md border"
            />
            <Button
              size="sm"
              variant="destructive"
              className="absolute top-2 right-2"
              onClick={clearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div>
          <Label htmlFor="winner-name">Winner Name (Optional)</Label>
          <Input
            id="winner-name"
            value={winnerName}
            onChange={(e) => setWinnerName(e.target.value)}
            placeholder="Enter winner's name"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="caption">Caption (Optional)</Label>
          <Textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption for this image..."
            className="mt-1"
            rows={3}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={uploadImage}
            disabled={!selectedFile || uploading}
            className="flex-1"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </>
            )}
          </Button>
          
          {selectedFile && (
            <Button variant="outline" onClick={clearSelection}>
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TournamentImageUpload;
