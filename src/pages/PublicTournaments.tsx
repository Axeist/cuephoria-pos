
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Calendar, Users, GamepadIcon, Crown, ImageIcon } from 'lucide-react';
import PublicTournamentHistory from '@/components/tournaments/PublicTournamentHistory';
import TournamentImageGallery from '@/components/tournaments/TournamentImageGallery';
import PublicLeaderboard from '@/components/tournaments/PublicLeaderboard';
import PromotionalPopup from '@/components/PromotionalPopup';

const PublicTournaments: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cuephoria-dark via-cuephoria-darkpurple to-cuephoria-dark">
      <PromotionalPopup />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-cuephoria-dark via-cuephoria-darkpurple to-cuephoria-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-cuephoria-lightpurple/10 to-cuephoria-blue/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-cuephoria-lightpurple to-cuephoria-blue mb-8 relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cuephoria-lightpurple/30 to-cuephoria-blue/30 animate-ping"></div>
            <Trophy className="h-10 w-10 text-white relative z-10" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-lightpurple via-cuephoria-blue to-cuephoria-purple mb-6">
            Tournament Central
          </h1>
          <p className="text-xl text-cuephoria-grey max-w-3xl mx-auto leading-relaxed">
            Welcome to the ultimate tournament experience. Track live competitions, celebrate our champions, and witness gaming excellence unfold.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        
        {/* Tournament Tabs Section */}
        <Card className="bg-gradient-to-br from-cuephoria-dark/90 to-cuephoria-darkpurple/50 border-cuephoria-lightpurple/30 shadow-2xl shadow-cuephoria-lightpurple/10">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl font-bold text-cuephoria-lightpurple flex items-center justify-center gap-3">
              <GamepadIcon className="h-8 w-8" />
              Live Tournaments
            </CardTitle>
            <p className="text-cuephoria-grey text-lg mt-2">Follow the action as it happens</p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-cuephoria-dark/50 border border-cuephoria-lightpurple/20 p-1 rounded-xl">
                <TabsTrigger
                  value="active"
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cuephoria-lightpurple data-[state=active]:to-cuephoria-blue data-[state=active]:text-white text-cuephoria-grey hover:text-cuephoria-lightpurple transition-all duration-300 rounded-lg py-3"
                >
                  <Trophy className="h-4 w-4" />
                  Active
                </TabsTrigger>
                <TabsTrigger
                  value="upcoming"
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cuephoria-lightpurple data-[state=active]:to-cuephoria-blue data-[state=active]:text-white text-cuephoria-grey hover:text-cuephoria-lightpurple transition-all duration-300 rounded-lg py-3"
                >
                  <Calendar className="h-4 w-4" />
                  Upcoming
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cuephoria-lightpurple data-[state=active]:to-cuephoria-blue data-[state=active]:text-white text-cuephoria-grey hover:text-cuephoria-lightpurple transition-all duration-300 rounded-lg py-3"
                >
                  <Users className="h-4 w-4" />
                  History
                </TabsTrigger>
              </TabsList>

              <div className="mt-8">
                <TabsContent value="active" className="space-y-6">
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cuephoria-lightpurple/20 mb-6">
                      <Trophy className="h-8 w-8 text-cuephoria-lightpurple" />
                    </div>
                    <h3 className="text-2xl font-bold text-cuephoria-lightpurple mb-4">No Active Tournaments</h3>
                    <p className="text-cuephoria-grey text-lg">Check back soon for exciting tournament action!</p>
                  </div>
                </TabsContent>

                <TabsContent value="upcoming" className="space-y-6">
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cuephoria-blue/20 mb-6">
                      <Calendar className="h-8 w-8 text-cuephoria-blue" />
                    </div>
                    <h3 className="text-2xl font-bold text-cuephoria-blue mb-4">No Upcoming Tournaments</h3>
                    <p className="text-cuephoria-grey text-lg">Stay tuned for tournament announcements!</p>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-6">
                  <PublicTournamentHistory />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Champions Leaderboard Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cuephoria-lightpurple/5 to-cuephoria-blue/5 rounded-3xl"></div>
          <div className="relative bg-gradient-to-br from-cuephoria-dark/95 to-cuephoria-darkpurple/80 backdrop-blur-sm rounded-3xl border border-cuephoria-lightpurple/30 shadow-2xl shadow-cuephoria-lightpurple/20 p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400/20 to-orange-400/20 mb-4 relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400/30 to-orange-400/30 animate-pulse"></div>
                <Crown className="h-8 w-8 text-yellow-400 relative z-10" />
              </div>
              <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 mb-2">
                Hall of Champions
              </h2>
              <p className="text-cuephoria-grey text-lg">
                Celebrating our tournament legends and their victories
              </p>
            </div>
            <PublicLeaderboard />
          </div>
        </div>

        {/* Tournament Gallery Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cuephoria-blue/5 to-cuephoria-purple/5 rounded-3xl"></div>
          <div className="relative bg-gradient-to-br from-cuephoria-dark/95 to-cuephoria-darkpurple/80 backdrop-blur-sm rounded-3xl border border-cuephoria-blue/30 shadow-2xl shadow-cuephoria-blue/20 p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-cuephoria-blue/20 to-cuephoria-purple/20 mb-4 relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cuephoria-blue/30 to-cuephoria-purple/30 animate-pulse"></div>
                <ImageIcon className="h-8 w-8 text-cuephoria-blue relative z-10" />
              </div>
              <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-blue via-cuephoria-purple to-cuephoria-lightpurple mb-2">
                Victory Gallery
              </h2>
              <p className="text-cuephoria-grey text-lg">
                A visual journey through our most memorable tournament moments
              </p>
            </div>
            <TournamentImageGallery />
          </div>
        </div>

      </div>
    </div>
  );
};

export default PublicTournaments;
