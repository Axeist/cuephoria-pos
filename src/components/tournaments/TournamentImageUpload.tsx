
import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Upload, ImageIcon, Trophy, X, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tournament } from '@/types/tournament.types';

interface TournamentImageUploadProps {
  tournaments: Tournament[];
  onImageUploaded?: () => void;
  iconOnly?: boolean;
}

const TournamentImageUpload: React.FC<TournamentImageUploadProps> = ({ 
  tournaments, 
  onImageUploaded,
  iconOnly = false
}) => {
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [winnerName, setWinnerName] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Filter tournaments that have been completed
  const completedTournaments = tournaments.filter(t => t.status === 'completed');

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

    // Validate file size (5MB limit)
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
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedTournament || !winnerName.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields and select an image.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `tournament-winners/${fileName}`;

      // Upload image to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tournament-images')
        .upload(filePath, selectedFile);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        toast({
          title: "Upload failed",
          description: "Failed to upload image. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('tournament-images')
        .getPublicUrl(filePath);

      // Save record to database
      const { error: dbError } = await supabase
        .from('tournament_winner_images')
        .insert({
          tournament_id: selectedTournament,
          image_url: urlData.publicUrl,
          winner_name: winnerName.trim(),
          caption: caption.trim() || null,
          created_by: 'admin'
        });

      if (dbError) {
        console.error('Error saving to database:', dbError);
        
        // Clean up uploaded file if database insert fails
        await supabase.storage
          .from('tournament-images')
          .remove([filePath]);

        toast({
          title: "Save failed",
          description: "Failed to save image record. Please try again.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Image uploaded successfully!",
        description: "The tournament winner image has been added to the gallery.",
      });

      // Reset form
      setSelectedTournament('');
      setWinnerName('');
      setCaption('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setDialogOpen(false);

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Callback to refresh parent component
      if (onImageUploaded) {
        onImageUploaded();
      }

    } catch (error) {
      console.error('Unexpected error during upload:', error);
      toast({
        title: "Upload error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedTournament('');
    setWinnerName('');
    setCaption('');
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => {
      setDialogOpen(open);
      if (!open) {
        resetForm();
      }
    }}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <Button 
            size="sm"
            className="bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue hover:from-cuephoria-lightpurple/90 hover:to-cuephoria-blue/90 text-white font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-cuephoria-lightpurple/30"
            title="Upload Winner Image"
          >
            <Upload className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue hover:from-cuephoria-lightpurple/90 hover:to-cuephoria-blue/90 text-white font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-cuephoria-lightpurple/30">
            <Upload className="mr-2 h-4 w-4" />
            Upload Winner Image
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl bg-cuephoria-dark border-cuephoria-lightpurple/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-cuephoria-lightpurple flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Upload Tournament Winner Image
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tournament Selection */}
          <div className="space-y-2">
            <Label htmlFor="tournament-select" className="text-cuephoria-grey">
              Select Tournament *
            </Label>
            <Select value={selectedTournament} onValueChange={setSelectedTournament}>
              <SelectTrigger className="bg-cuephoria-dark border-cuephoria-grey/30 text-white focus:border-cuephoria-lightpurple">
                <SelectValue placeholder="Choose a completed tournament" />
              </SelectTrigger>
              <SelectContent className="bg-cuephoria-dark border-cuephoria-lightpurple/30">
                {completedTournaments.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No completed tournaments available
                  </SelectItem>
                ) : (
                  completedTournaments.map((tournament) => (
                    <SelectItem 
                      key={tournament.id} 
                      value={tournament.id}
                      className="text-white hover:bg-cuephoria-lightpurple/20"
                    >
                      {tournament.name} - {tournament.date}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Winner Name */}
          <div className="space-y-2">
            <Label htmlFor="winner-name" className="text-cuephoria-grey">
              Winner Name *
            </Label>
            <Input
              id="winner-name"
              value={winnerName}
              onChange={(e) => setWinnerName(e.target.value)}
              placeholder="Enter the tournament winner's name"
              className="bg-cuephoria-dark border-cuephoria-grey/30 text-white focus:border-cuephoria-lightpurple"
            />
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption" className="text-cuephoria-grey">
              Caption (Optional)
            </Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption or description for this image..."
              rows={3}
              className="bg-cuephoria-dark border-cuephoria-grey/30 text-white focus:border-cuephoria-lightpurple resize-none"
            />
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <Label className="text-cuephoria-grey">
              Tournament Winner Image *
            </Label>
            
            <div className="border-2 border-dashed border-cuephoria-grey/40 rounded-lg p-6 text-center hover:border-cuephoria-lightpurple/60 transition-colors">
              {previewUrl ? (
                <div className="space-y-4">
                  <div className="relative inline-block">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-w-full max-h-48 rounded-lg shadow-lg"
                    />
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-cuephoria-grey">
                    {selectedFile?.name}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col items-center">
                    <ImageIcon className="h-12 w-12 text-cuephoria-grey/60 mb-4" />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-cuephoria-lightpurple/30 text-cuephoria-lightpurple hover:bg-cuephoria-lightpurple/10"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Choose Image
                    </Button>
                  </div>
                  <p className="text-sm text-cuephoria-grey">
                    PNG, JPG or JPEG up to 5MB
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
          </div>

          {/* Upload Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-cuephoria-lightpurple/20">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={uploading}
              className="border-cuephoria-grey/30 text-cuephoria-grey hover:bg-cuephoria-grey/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !selectedTournament || !winnerName.trim()}
              className="bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue hover:from-cuephoria-lightpurple/90 hover:to-cuephoria-blue/90 text-white font-semibold"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Upload Image
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TournamentImageUpload;
