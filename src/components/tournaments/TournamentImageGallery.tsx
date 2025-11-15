
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Crown, Medal, Calendar, GamepadIcon, X, ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TournamentWinnerImage {
  id: string;
  tournament_id: string;
  image_url: string;
  caption: string | null;
  winner_name: string | null;
  uploaded_at: string;
  created_by: string;
}

interface TournamentImageGalleryProps {
  className?: string;
}

const TournamentImageGallery: React.FC<TournamentImageGalleryProps> = ({ className = "" }) => {
  const [images, setImages] = useState<TournamentWinnerImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<TournamentWinnerImage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
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
        console.error('Error fetching tournament images:', error);
        toast({
          title: "Error",
          description: "Failed to load tournament images.",
          variant: "destructive"
        });
        return;
      }

      setImages(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (image: TournamentWinnerImage) => {
    setSelectedImage(image);
    setDialogOpen(true);
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

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cuephoria-lightpurple/20 mb-4">
            <ImageIcon className="h-8 w-8 text-cuephoria-lightpurple animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue mb-2">
            Tournament Gallery
          </h2>
          <p className="text-cuephoria-grey">Loading tournament winner images...</p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-cuephoria-lightpurple/20 mb-6 relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cuephoria-lightpurple/30 to-cuephoria-blue/30 animate-ping"></div>
            <Trophy className="h-10 w-10 text-cuephoria-lightpurple relative z-10" />
          </div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue mb-4">
            Tournament Gallery
          </h2>
          <p className="text-cuephoria-grey text-lg">
            Tournament winner photos will appear here soon!
          </p>
          <p className="text-cuephoria-grey/80 text-sm mt-2">
            Check back after tournaments are completed
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Gallery Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue mb-4 relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cuephoria-lightpurple/30 to-cuephoria-blue/30 animate-ping"></div>
          <Trophy className="h-8 w-8 text-white relative z-10" />
        </div>
        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue mb-2">
          Tournament Gallery
        </h2>
        <p className="text-cuephoria-grey text-lg">
          Celebrating our champions and memorable moments
        </p>
        <Badge variant="outline" className="mt-2 border-cuephoria-lightpurple/30 text-cuephoria-lightpurple">
          {images.length} {images.length === 1 ? 'Photo' : 'Photos'}
        </Badge>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {images.map((image, index) => (
          <Card 
            key={image.id}
            className="group cursor-pointer overflow-hidden bg-gradient-to-br from-cuephoria-dark/90 to-cuephoria-darkpurple/50 border-cuephoria-lightpurple/20 hover:border-cuephoria-lightpurple/60 transition-all duration-500 hover:shadow-2xl hover:shadow-cuephoria-lightpurple/20 hover:-translate-y-2 hover:scale-[1.02]"
            onClick={() => handleImageClick(image)}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="relative aspect-square overflow-hidden">
              <img
                src={image.image_url}
                alt={image.caption || `Tournament winner: ${image.winner_name}`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              
              {/* Overlay with champion info */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500">
                <div className="absolute bottom-4 left-4 right-4">
                  {image.winner_name && (
                    <div className="flex items-center gap-2 text-white mb-2">
                      <Crown className="h-4 w-4 text-yellow-400" />
                      <span className="font-semibold text-sm">{image.winner_name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-cuephoria-grey text-xs">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(image.uploaded_at)}</span>
                  </div>
                </div>
              </div>

              {/* Hover effect overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-cuephoria-lightpurple/20 to-cuephoria-blue/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>

            <CardContent className="p-4">
              {image.winner_name && (
                <div className="flex items-center gap-2 text-cuephoria-lightpurple mb-2">
                  <Medal className="h-4 w-4" />
                  <span className="font-semibold text-sm truncate">{image.winner_name}</span>
                </div>
              )}
              
              {image.caption && (
                <p className="text-cuephoria-grey text-xs leading-relaxed line-clamp-2 mb-2">
                  {image.caption}
                </p>
              )}
              
              <div className="flex items-center justify-between text-xs text-cuephoria-grey/80">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(image.uploaded_at)}</span>
                </div>
                <Badge variant="outline" className="text-xs border-cuephoria-purple/30 text-cuephoria-purple">
                  Champion
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Image Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl bg-cuephoria-dark border-cuephoria-lightpurple/30 p-0 overflow-hidden">
          {selectedImage && (
            <>
              <div className="relative">
                <img
                  src={selectedImage.image_url}
                  alt={selectedImage.caption || `Tournament winner: ${selectedImage.winner_name}`}
                  className="w-full h-auto max-h-[70vh] object-contain"
                />
                <button
                  onClick={() => setDialogOpen(false)}
                  className="absolute top-4 right-4 z-50 p-2 -m-2 rounded-full bg-black/50 text-white hover:bg-black/70 active:bg-black/80 touch-manipulation transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 bg-gradient-to-r from-cuephoria-dark to-cuephoria-darkpurple">
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-cuephoria-lightpurple flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Tournament Champion
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {selectedImage.winner_name && (
                    <div className="flex items-center gap-3">
                      <Crown className="h-5 w-5 text-yellow-400" />
                      <span className="text-white font-semibold text-lg">{selectedImage.winner_name}</span>
                    </div>
                  )}
                  
                  {selectedImage.caption && (
                    <div className="bg-cuephoria-purple/10 p-4 rounded-lg border border-cuephoria-purple/20">
                      <p className="text-cuephoria-grey leading-relaxed">{selectedImage.caption}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-cuephoria-grey border-t border-cuephoria-lightpurple/20 pt-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Uploaded on {formatDate(selectedImage.uploaded_at)}</span>
                    </div>
                    <Badge variant="outline" className="border-cuephoria-lightpurple/30 text-cuephoria-lightpurple">
                      Tournament Winner
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentImageGallery;
