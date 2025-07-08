
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Crown, Medal, Calendar, GamepadIcon, X, ImageIcon, Star, Sparkles } from 'lucide-react';
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
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-cuephoria-lightpurple/20 to-cuephoria-blue/20 mb-6 relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cuephoria-lightpurple/30 to-cuephoria-blue/30 animate-ping"></div>
            <ImageIcon className="h-10 w-10 text-cuephoria-lightpurple animate-pulse relative z-10" />
          </div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue mb-2">
            Champion Gallery
          </h2>
          <p className="text-cuephoria-grey">Loading tournament moments...</p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-cuephoria-lightpurple/20 to-cuephoria-blue/20 mb-8 relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cuephoria-lightpurple/30 to-cuephoria-blue/30 animate-ping"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-r from-cuephoria-lightpurple/10 to-cuephoria-blue/10 animate-pulse"></div>
            <Trophy className="h-12 w-12 text-cuephoria-lightpurple relative z-10" />
            <Sparkles className="h-6 w-6 text-yellow-400 absolute -top-2 -right-2 animate-bounce" />
          </div>
          <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-lightpurple via-cuephoria-blue to-cuephoria-purple mb-4">
            Champion Gallery
          </h2>
          <p className="text-cuephoria-grey text-lg mb-2">
            🏆 Celebrating Our Tournament Champions
          </p>
          <p className="text-cuephoria-grey/80 text-sm">
            Victory moments will be showcased here after tournaments are completed
          </p>
          <div className="mt-8 flex justify-center">
            <Badge 
              variant="outline" 
              className="border-cuephoria-lightpurple/30 text-cuephoria-lightpurple px-4 py-2 text-sm"
            >
              <Star className="h-4 w-4 mr-2" />
              Coming Soon
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Enhanced Gallery Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue mb-6 relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cuephoria-lightpurple/30 to-cuephoria-blue/30 animate-ping"></div>
          <div className="absolute inset-2 rounded-full bg-gradient-to-r from-cuephoria-lightpurple/20 to-cuephoria-blue/20 animate-pulse"></div>
          <Trophy className="h-10 w-10 text-white relative z-10" />
          <Crown className="h-6 w-6 text-yellow-400 absolute -top-2 -right-2 animate-bounce" />
        </div>
        <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-lightpurple via-cuephoria-blue to-cuephoria-purple mb-4">
          🏆 Champion Gallery
        </h2>
        <p className="text-cuephoria-grey text-lg mb-4">
          Celebrating our tournament champions and their victory moments
        </p>
        <div className="flex items-center justify-center gap-4">
          <Badge 
            variant="outline" 
            className="border-cuephoria-lightpurple/30 text-cuephoria-lightpurple px-4 py-2"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            {images.length} {images.length === 1 ? 'Photo' : 'Photos'}
          </Badge>
          <Badge 
            variant="outline" 
            className="border-yellow-400/30 text-yellow-400 px-4 py-2"
          >
            <Star className="h-4 w-4 mr-2" />
            Hall of Fame
          </Badge>
        </div>
      </div>

      {/* Enhanced Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {images.map((image, index) => (
          <Card 
            key={image.id}
            className="group cursor-pointer overflow-hidden bg-gradient-to-br from-cuephoria-dark/95 to-cuephoria-darkpurple/60 border-cuephoria-lightpurple/20 hover:border-cuephoria-lightpurple/80 transition-all duration-700 hover:shadow-2xl hover:shadow-cuephoria-lightpurple/30 hover:-translate-y-3 hover:scale-[1.02] animate-fade-in"
            onClick={() => handleImageClick(image)}
            style={{ animationDelay: `${index * 150}ms` }}
          >
            <div className="relative aspect-square overflow-hidden">
              <img
                src={image.image_url}
                alt={image.caption || `Tournament winner: ${image.winner_name}`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-115"
                loading="lazy"
              />
              
              {/* Enhanced gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-90 transition-all duration-500">
              </div>
              
              {/* Winner crown overlay */}
              <div className="absolute top-4 right-4 transform rotate-12 group-hover:rotate-0 transition-transform duration-500">
                <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-2 rounded-full shadow-lg">
                  <Crown className="h-5 w-5 text-black" />
                </div>
              </div>

              {/* Champion info overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                {image.winner_name && (
                  <div className="flex items-center gap-2 text-white mb-2">
                    <div className="bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue p-1 rounded-full">
                      <Trophy className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-lg">{image.winner_name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-cuephoria-grey text-sm">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(image.uploaded_at)}</span>
                  </div>
                  <Badge className="bg-gradient-to-r from-cuephoria-lightpurple/80 to-cuephoria-blue/80 text-white text-xs">
                    Champion
                  </Badge>
                </div>
              </div>

              {/* Sparkle effects */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-pulse"
                    style={{
                      left: `${20 + Math.random() * 60}%`,
                      top: `${20 + Math.random() * 60}%`,
                      animationDelay: `${i * 0.2}s`,
                      animationDuration: `${1 + Math.random()}s`
                    }}
                  />
                ))}
              </div>
            </div>

            <CardContent className="p-4">
              <div className="space-y-3">
                {image.winner_name && (
                  <div className="flex items-center gap-2 text-cuephoria-lightpurple">
                    <Medal className="h-4 w-4 text-yellow-400" />
                    <span className="font-bold text-base truncate">{image.winner_name}</span>
                  </div>
                )}
                
                {image.caption && (
                  <p className="text-cuephoria-grey text-sm leading-relaxed line-clamp-2">
                    {image.caption}
                  </p>
                )}
                
                <div className="flex items-center justify-between pt-2 border-t border-cuephoria-lightpurple/20">
                  <div className="flex items-center gap-1 text-xs text-cuephoria-grey/80">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(image.uploaded_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue rounded-full animate-pulse"></div>
                    <span className="text-xs text-cuephoria-lightpurple font-medium">Victory</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enhanced Image Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl bg-gradient-to-br from-cuephoria-dark via-cuephoria-darkpurple to-cuephoria-dark border-2 border-cuephoria-lightpurple/50 p-0 overflow-hidden">
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
                  className="absolute top-4 right-4 p-3 rounded-full bg-black/70 hover:bg-black/90 text-white hover:text-cuephoria-lightpurple transition-all duration-300 backdrop-blur-sm"
                >
                  <X className="h-5 w-5" />
                </button>
                
                {/* Floating winner badge */}
                <div className="absolute top-4 left-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-black px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-lg">
                  <Crown className="h-4 w-4" />
                  Champion
                </div>
              </div>
              
              <div className="p-8 bg-gradient-to-r from-cuephoria-dark via-cuephoria-darkpurple to-cuephoria-dark">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-2xl font-bold text-cuephoria-lightpurple flex items-center gap-3">
                    <div className="bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue p-2 rounded-full">
                      <Trophy className="h-6 w-6 text-white" />
                    </div>
                    Tournament Victory
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6">
                  {selectedImage.winner_name && (
                    <div className="bg-gradient-to-r from-cuephoria-lightpurple/10 to-cuephoria-blue/10 p-6 rounded-xl border border-cuephoria-lightpurple/20">
                      <div className="flex items-center gap-3 mb-2">
                        <Crown className="h-6 w-6 text-yellow-400" />
                        <span className="text-yellow-300 font-semibold text-lg">Champion</span>
                      </div>
                      <p className="text-white font-bold text-2xl">{selectedImage.winner_name}</p>
                    </div>
                  )}
                  
                  {selectedImage.caption && (
                    <div className="bg-cuephoria-purple/10 p-6 rounded-xl border border-cuephoria-purple/20">
                      <h4 className="text-cuephoria-lightpurple font-semibold mb-3">Victory Story</h4>
                      <p className="text-cuephoria-grey leading-relaxed text-lg">{selectedImage.caption}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-cuephoria-grey border-t border-cuephoria-lightpurple/20 pt-6">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5" />
                      <span className="text-base">Captured on {formatDate(selectedImage.uploaded_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[...Array(3)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                        ))}
                      </div>
                      <Badge 
                        variant="outline" 
                        className="border-cuephoria-lightpurple/30 text-cuephoria-lightpurple px-3 py-1"
                      >
                        Hall of Fame
                      </Badge>
                    </div>
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
