
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageIcon, Calendar, Trophy } from 'lucide-react';

interface TournamentImage {
  id: string;
  tournament_id: string;
  image_url: string;
  caption: string | null;
  winner_name: string | null;
  uploaded_at: string;
  tournament_name?: string;
  tournament_date?: string;
}

const TournamentImageGallery: React.FC = () => {
  const [images, setImages] = useState<TournamentImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        // Fetch tournament images with tournament details
        const { data: imagesData, error } = await supabase
          .from('tournament_winner_images')
          .select(`
            *,
            tournaments:tournament_id (
              name,
              date
            )
          `)
          .order('uploaded_at', { ascending: false });

        if (error) {
          console.error('Error fetching tournament images:', error);
          return;
        }

        // Transform the data to include tournament details
        const transformedImages = imagesData?.map(img => ({
          ...img,
          tournament_name: img.tournaments?.name,
          tournament_date: img.tournaments?.date
        })) || [];

        setImages(transformedImages);
      } catch (error) {
        console.error('Error loading tournament images:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">Tournament Gallery</h2>
          <p className="text-muted-foreground">Celebrating our champions</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12">
        <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Images Yet</h2>
        <p className="text-muted-foreground">
          Tournament winner images will appear here once they're uploaded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">Tournament Gallery</h2>
        <p className="text-muted-foreground">Celebrating our champions</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image) => (
          <Card key={image.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative">
              <img
                src={image.image_url}
                alt={image.caption || 'Tournament winner'}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder.svg';
                }}
              />
              {image.winner_name && (
                <Badge className="absolute top-2 right-2 bg-gold text-black">
                  <Trophy className="h-3 w-3 mr-1" />
                  Winner
                </Badge>
              )}
            </div>
            
            <CardContent className="p-4">
              {image.tournament_name && (
                <h3 className="font-semibold text-lg mb-2">{image.tournament_name}</h3>
              )}
              
              {image.winner_name && (
                <p className="text-cuephoria-lightpurple font-medium mb-2">
                  Champion: {image.winner_name}
                </p>
              )}
              
              {image.caption && (
                <p className="text-muted-foreground text-sm mb-2">{image.caption}</p>
              )}
              
              <div className="flex items-center text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                {image.tournament_date ? 
                  new Date(image.tournament_date).toLocaleDateString() :
                  new Date(image.uploaded_at).toLocaleDateString()
                }
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TournamentImageGallery;
