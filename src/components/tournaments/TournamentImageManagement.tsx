
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Trash2, Eye, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TournamentWinnerImage {
  id: string;
  tournament_id: string;
  image_url: string;
  caption: string | null;
  winner_name: string | null;
  uploaded_at: string;
  created_by: string;
}

interface TournamentImageManagementProps {
  onRefresh?: () => void;
}

const TournamentImageManagement: React.FC<TournamentImageManagementProps> = ({ onRefresh }) => {
  const [images, setImages] = useState<TournamentWinnerImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<TournamentWinnerImage | null>(null);
  const [editingImage, setEditingImage] = useState<TournamentWinnerImage | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    winner_name: '',
    caption: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_winner_images')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Error fetching images:', error);
        return;
      }

      setImages(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
    }
  };

  const handleView = (image: TournamentWinnerImage) => {
    setSelectedImage(image);
    setViewDialogOpen(true);
  };

  const handleEdit = (image: TournamentWinnerImage) => {
    setEditingImage(image);
    setEditForm({
      winner_name: image.winner_name || '',
      caption: image.caption || ''
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingImage) return;

    try {
      const updatedData = {
        winner_name: editForm.winner_name.trim() || null,
        caption: editForm.caption.trim() || null
      };

      const { error } = await supabase
        .from('tournament_winner_images')
        .update(updatedData)
        .eq('id', editingImage.id);

      if (error) {
        console.error('Error updating image:', error);
        toast({
          title: "Error",
          description: "Failed to update image details.",
          variant: "destructive"
        });
        return;
      }

      // Update the local state immediately with the new data
      setImages(prevImages => 
        prevImages.map(img => 
          img.id === editingImage.id 
            ? { ...img, ...updatedData }
            : img
        )
      );

      toast({
        title: "Success",
        description: "Image details updated successfully.",
      });

      setEditDialogOpen(false);
      setEditingImage(null);
      
      // Call onRefresh if provided to update parent components
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (imageId: string, imageUrl: string) => {
    setDeleting(imageId);
    try {
      // Extract file path from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `tournament-winners/${fileName}`;

      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('tournament-images')
        .remove([filePath]);

      if (storageError) {
        console.error('Error deleting from storage:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('tournament_winner_images')
        .delete()
        .eq('id', imageId);

      if (dbError) {
        console.error('Error deleting from database:', dbError);
        toast({
          title: "Error",
          description: "Failed to delete image record.",
          variant: "destructive"
        });
        return;
      }

      // Update local state immediately
      setImages(prevImages => prevImages.filter(img => img.id !== imageId));

      toast({
        title: "Success",
        description: "Image deleted successfully.",
      });

      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (images.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tournament Images</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No tournament winner images uploaded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tournament Images ({images.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <div key={image.id} className="border rounded-lg overflow-hidden">
                <div className="aspect-video relative">
                  <img
                    src={image.image_url}
                    alt={image.caption || `Tournament winner: ${image.winner_name}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3 space-y-2">
                  <div className="text-sm font-medium truncate">
                    {image.winner_name || 'Tournament Winner'}
                  </div>
                  {image.caption && (
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {image.caption}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {formatDate(image.uploaded_at)}
                  </div>
                  <div className="flex gap-1 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleView(image)}
                      className="flex-1"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(image)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 hover:bg-destructive hover:text-destructive-foreground"
                          disabled={deleting === image.id}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Image</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this tournament winner image? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(image.id, image.image_url)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          {selectedImage && (
            <>
              <DialogHeader>
                <DialogTitle>Tournament Winner Image</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <img
                    src={selectedImage.image_url}
                    alt={selectedImage.caption || `Tournament winner: ${selectedImage.winner_name}`}
                    className="w-full h-auto max-h-96 object-contain rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Winner:</strong> {selectedImage.winner_name || 'Not specified'}
                  </div>
                  <div>
                    <strong>Date:</strong> {formatDate(selectedImage.uploaded_at)}
                  </div>
                  {selectedImage.caption && (
                    <div className="col-span-2">
                      <strong>Caption:</strong> {selectedImage.caption}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Image Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-winner-name">Winner Name</Label>
              <Input
                id="edit-winner-name"
                value={editForm.winner_name}
                onChange={(e) => setEditForm(prev => ({ ...prev, winner_name: e.target.value }))}
                placeholder="Enter winner's name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-caption">Caption</Label>
              <Textarea
                id="edit-caption"
                value={editForm.caption}
                onChange={(e) => setEditForm(prev => ({ ...prev, caption: e.target.value }))}
                placeholder="Enter image caption..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TournamentImageManagement;
