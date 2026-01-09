
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Monitor, Gamepad, Trophy, Users, Star, ZapIcon, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Mail, Phone, Clock, MapPin } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-cuephoria-dark flex flex-col relative overflow-hidden">
      {/* Minimalistic animated background - simplified for mobile */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.06]"
          style={{ 
            backgroundImage: 'linear-gradient(to right, rgb(40, 44, 52) 1px, transparent 1px), linear-gradient(to bottom, rgb(40, 44, 52) 1px, transparent 1px)',
            backgroundSize: isMobile ? '40px 40px' : '50px 50px' 
          }}>
        </div>
        
        {/* Animated gradients - optimized for mobile */}
        <div className="absolute top-0 left-1/4 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full bg-gradient-to-br from-cuephoria-purple/10 to-transparent blur-[80px] sm:blur-[100px] animate-float opacity-15"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] rounded-full bg-gradient-to-tr from-cuephoria-blue/10 to-transparent blur-[60px] sm:blur-[80px] animate-float opacity-15" style={{animationDelay: '2s'}}></div>
        
        {/* Light streaks - only on desktop */}
        {!isMobile && (
          <>
            <div className="absolute top-[30%] w-full h-px bg-gradient-to-r from-transparent via-cuephoria-purple/20 to-transparent"></div>
            <div className="absolute top-[60%] w-full h-px bg-gradient-to-r from-transparent via-cuephoria-blue/20 to-transparent"></div>
          </>
        )}
      </div>

      {/* Mobile-optimized Header */}
      <header className="h-16 sm:h-20 flex items-center px-3 sm:px-6 border-b border-gray-800 relative z-10 backdrop-blur-md bg-cuephoria-dark/90">
        <div className="scale-90 sm:scale-100 origin-left">
          <Logo size={isMobile ? "sm" : "md"} />
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            className="text-white border-gray-700 hover:bg-gray-800 text-[10px] sm:text-sm px-2 sm:px-4 h-9 sm:h-10 rounded-lg"
            onClick={() => window.open('https://cuephoria.in', '_blank')}
          >
            {isMobile ? 'Website' : 'Official Website'}
          </Button>
          <Button
            variant="default"
            size={isMobile ? "sm" : "default"}
            className="bg-cuephoria-purple text-white hover:bg-cuephoria-purple/90 text-[10px] sm:text-sm px-2 sm:px-4 h-9 sm:h-10 rounded-lg font-medium"
            onClick={() => window.open('https://cuephoria.in/book', '_blank')}
          >
            Book Now
          </Button>
        </div>
      </header>

      {/* Hero section - Mobile optimized */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative z-10">
        <div className="mb-6 sm:mb-8 animate-float-shadow">
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-cuephoria-purple to-cuephoria-blue rounded-full opacity-60 sm:opacity-70 blur-lg animate-pulse-glow"></div>
            <img
              src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
              alt="Cuephoria Logo" 
              className="h-24 sm:h-32 md:h-40 relative z-10 drop-shadow-[0_0_15px_rgba(155,135,245,0.5)]"
            />
          </div>
        </div>
        
        <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-center text-white font-heading leading-tight mb-4 sm:mb-6 px-2">
          Welcome to{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple animate-text-gradient">
            Cuephoria
          </span>
        </h1>
        
        <p className="text-sm sm:text-lg md:text-xl text-center text-gray-300 max-w-2xl mb-6 sm:mb-8 px-4 leading-relaxed">
          A modern gaming lounge with premium PlayStation 5 consoles and professional 8-ball pool tables.
        </p>
        
        {/* Mobile-optimized CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-12 sm:mb-16 w-full max-w-md sm:max-w-none px-4 sm:px-0">
          <Button
            size={isMobile ? "default" : "lg"}
            className="bg-cuephoria-purple text-white hover:bg-cuephoria-purple/90 shadow-lg shadow-cuephoria-purple/20 h-12 sm:h-12 text-sm sm:text-base font-medium rounded-xl active:scale-[0.98] transition-all"
            onClick={() => navigate('/login')}
          >
            <ShieldCheck className="mr-2 h-5 w-5" />
            Login to Dashboard
          </Button>
          <Button
            size={isMobile ? "default" : "lg"}
            variant="outline"
            className="text-white border-gray-700 hover:bg-gray-800 group relative overflow-hidden h-12 sm:h-12 text-sm sm:text-base font-medium rounded-xl active:scale-[0.98] transition-all"
            onClick={() => navigate('/public/stations')}
          >
            <div className="absolute inset-0 w-full bg-gradient-to-r from-cuephoria-purple/0 via-cuephoria-lightpurple/20 to-cuephoria-purple/0 animate-shimmer pointer-events-none"></div>
            <Monitor className="mr-2 h-5 w-5" />
            <span>View Station Availability</span>
          </Button>
        </div>
        
        {/* Features - Mobile optimized */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 w-full max-w-5xl mx-auto mb-10 sm:mb-16 px-4 sm:px-0">
          <div className="bg-cuephoria-darker p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-800 hover:border-cuephoria-purple/40 transition-all duration-300 hover:shadow-lg hover:shadow-cuephoria-purple/20 active:scale-[0.98] sm:hover:-translate-y-1 group">
            <div className="flex items-center mb-3 sm:mb-4">
              <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-cuephoria-purple/20 to-cuephoria-blue/20 flex items-center justify-center text-cuephoria-purple group-hover:scale-110 transition-transform flex-shrink-0">
                <Gamepad size={22} />
              </div>
              <h3 className="ml-3 text-base sm:text-lg font-semibold text-white">Premium Gaming</h3>
            </div>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed">Experience gaming like never before with our high-end PlayStation 5 consoles and 4K displays.</p>
          </div>
          
          <div className="bg-cuephoria-darker p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-800 hover:border-cuephoria-orange/40 transition-all duration-300 hover:shadow-lg hover:shadow-cuephoria-orange/20 active:scale-[0.98] sm:hover:-translate-y-1 group">
            <div className="flex items-center mb-3 sm:mb-4">
              <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-cuephoria-orange/20 to-cuephoria-red/20 flex items-center justify-center text-cuephoria-orange group-hover:scale-110 transition-transform flex-shrink-0">
                <Trophy size={22} />
              </div>
              <h3 className="ml-3 text-base sm:text-lg font-semibold text-white">Pool Tables</h3>
            </div>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed">Professional 8-ball pool tables for casual games or competitive tournaments.</p>
          </div>
          
          <div className="bg-cuephoria-darker p-5 sm:p-6 rounded-xl sm:rounded-2xl border border-gray-800 hover:border-cuephoria-blue/40 transition-all duration-300 hover:shadow-lg hover:shadow-cuephoria-blue/20 active:scale-[0.98] sm:hover:-translate-y-1 group">
            <div className="flex items-center mb-3 sm:mb-4">
              <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-cuephoria-blue/20 to-cuephoria-lightpurple/20 flex items-center justify-center text-cuephoria-blue group-hover:scale-110 transition-transform flex-shrink-0">
                <Users size={22} />
              </div>
              <h3 className="ml-3 text-base sm:text-lg font-semibold text-white">Community Events</h3>
            </div>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed">Join our regular tournaments and gaming events for prizes and bragging rights.</p>
          </div>
        </div>
        
        {/* Stats - Mobile optimized */}
        <div className="w-full max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-10 sm:mb-16 px-4 sm:px-0">
          <div className="text-center p-4 sm:p-5 bg-cuephoria-darker/50 backdrop-blur-md rounded-xl border border-gray-800 hover:border-cuephoria-purple/30 transition-all">
            <Star className="h-6 w-6 sm:h-7 sm:w-7 text-cuephoria-purple mx-auto mb-2" />
            <div className="text-xl sm:text-2xl font-bold text-white">12+</div>
            <div className="text-xs sm:text-sm text-gray-400 leading-tight">Gaming Stations</div>
          </div>
          
          <div className="text-center p-4 sm:p-5 bg-cuephoria-darker/50 backdrop-blur-md rounded-xl border border-gray-800 hover:border-cuephoria-orange/30 transition-all">
            <Trophy className="h-6 w-6 sm:h-7 sm:w-7 text-cuephoria-orange mx-auto mb-2" />
            <div className="text-xl sm:text-2xl font-bold text-white">8</div>
            <div className="text-xs sm:text-sm text-gray-400 leading-tight">Pool Tables</div>
          </div>
          
          <div className="text-center p-4 sm:p-5 bg-cuephoria-darker/50 backdrop-blur-md rounded-xl border border-gray-800 hover:border-cuephoria-blue/30 transition-all">
            <Users className="h-6 w-6 sm:h-7 sm:w-7 text-cuephoria-blue mx-auto mb-2" />
            <div className="text-xl sm:text-2xl font-bold text-white">500+</div>
            <div className="text-xs sm:text-sm text-gray-400 leading-tight">Members</div>
          </div>
          
          <div className="text-center p-4 sm:p-5 bg-cuephoria-darker/50 backdrop-blur-md rounded-xl border border-gray-800 hover:border-cuephoria-green/30 transition-all">
            <ZapIcon className="h-6 w-6 sm:h-7 sm:w-7 text-cuephoria-green mx-auto mb-2" />
            <div className="text-xl sm:text-2xl font-bold text-white">24/7</div>
            <div className="text-xs sm:text-sm text-gray-400 leading-tight">Support</div>
          </div>
        </div>
        
        {/* CTA Section - Mobile optimized */}
        <div className="w-full max-w-4xl mx-auto bg-gradient-to-br from-cuephoria-darker to-cuephoria-dark border border-gray-800 rounded-2xl p-5 sm:p-8 relative overflow-hidden mx-4">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          <div className="absolute top-0 right-0 h-48 w-48 sm:h-64 sm:w-64 bg-cuephoria-purple/10 blur-3xl rounded-full"></div>
          
          <div className="relative z-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-white mb-3 sm:mb-4 px-2">Ready to Experience Cuephoria?</h2>
            <p className="text-center text-gray-300 text-sm sm:text-base mb-6 sm:mb-8 max-w-2xl mx-auto px-2 leading-relaxed">
              Join our community of gamers and pool enthusiasts. Book a station, participate in tournaments, and connect with fellow players.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-2">
              <Button
                size={isMobile ? "default" : "lg"}
                className="bg-cuephoria-purple text-white hover:bg-cuephoria-purple/90 shadow-md group h-12 sm:h-12 text-sm sm:text-base font-medium rounded-xl active:scale-[0.98] transition-all"
                onClick={() => navigate('/login')}
              >
                <ShieldCheck className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                Admin Access
              </Button>
              <Button
                size={isMobile ? "default" : "lg"}
                variant="outline"
                className="text-white border-gray-700 hover:bg-gray-800 hover:border-cuephoria-lightpurple h-12 sm:h-12 text-sm sm:text-base font-medium rounded-xl active:scale-[0.98] transition-all"
                onClick={() => navigate('/public/stations')}
              >
                <Monitor className="mr-2 h-5 w-5" />
                Public Station View
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Mobile optimized */}
      <footer className="py-6 sm:py-8 border-t border-gray-800 relative z-10 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row items-center mb-4 md:mb-0 text-center sm:text-left">
              <div className="scale-90 sm:scale-100 mb-2 sm:mb-0">
                <Logo size="sm" />
              </div>
              <span className="text-xs sm:text-sm text-gray-400 sm:ml-2">© {new Date().getFullYear()} Cuephoria. All rights reserved.</span>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              <Dialog open={openDialog === 'terms'} onOpenChange={(open) => setOpenDialog(open ? 'terms' : null)}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-400 hover:text-white text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 rounded-lg"
                  onClick={() => setOpenDialog('terms')}
                >
                  Terms
                </Button>
                <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto bg-cuephoria-dark border-gray-800 text-white rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl font-bold text-white">Terms and Conditions</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-5 sm:space-y-6 text-gray-300 mt-4 text-sm sm:text-base">
                    <section className="space-y-3 sm:space-y-4">
                      <h2 className="text-base sm:text-lg font-semibold text-white">1. Acceptance of Terms</h2>
                      <p className="leading-relaxed">
                        By accessing and using Cuephoria's services, you agree to be bound by these Terms and Conditions. 
                        If you do not agree to these terms, please do not use our services.
                      </p>
                    </section>
                    
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-white">2. Membership and Gaming Sessions</h2>
                      <p>
                        Cuephoria provides gaming facilities and services on a pre-booking or walk-in basis, subject to availability.
                        Members may receive preferential rates and privileges as communicated in our membership plans.
                      </p>
                      <p>
                        All gaming sessions are charged according to our current rate card. Time extensions may be 
                        subject to availability and additional charges.
                      </p>
                    </section>
                    
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-white">3. Conduct and Responsibilities</h2>
                      <p>
                        Users must maintain appropriate conduct within our premises. Cuephoria reserves the right to refuse service 
                        to anyone engaging in disruptive, abusive, or inappropriate behavior.
                      </p>
                      <p>
                        Users are responsible for any damage caused to equipment, furniture, or fixtures through improper use.
                        Such damage may result in charges equivalent to repair or replacement costs.
                      </p>
                    </section>
                    
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-white">4. Refunds and Cancellations</h2>
                      <p>
                        Bookings may be cancelled or rescheduled at least 2 hours prior to the reserved time without penalty.
                        Late cancellations or no-shows may be charged a fee equivalent to 50% of the booking amount.
                      </p>
                      <p>
                        Refunds for technical issues or service interruptions will be assessed on a case-by-case basis by management.
                      </p>
                    </section>
                    
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-white">5. Modifications to Terms</h2>
                      <p>
                        Cuephoria reserves the right to modify these terms at any time. Changes will be effective immediately 
                        upon posting on our website or premises. Continued use of our services constitutes acceptance of modified terms.
                      </p>
                    </section>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={openDialog === 'privacy'} onOpenChange={(open) => setOpenDialog(open ? 'privacy' : null)}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-gray-400 hover:text-white text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 rounded-lg"
                  onClick={() => setOpenDialog('privacy')}
                >
                  Privacy
                </Button>
                <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto bg-cuephoria-dark border-gray-800 text-white rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl font-bold text-white">Privacy Policy</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6 text-gray-300 mt-4">
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-white">1. Information We Collect</h2>
                      <p>
                        Cuephoria may collect personal information including but not limited to name, contact details, 
                        and payment information when you register or book our services.
                      </p>
                      <p>
                        We also collect usage data such as gaming preferences, session duration, and purchase history 
                        to improve our services and customize your experience.
                      </p>
                    </section>
                    
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-white">2. How We Use Your Information</h2>
                      <p>
                        We use collected information to:
                      </p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Process bookings and payments</li>
                        <li>Personalize your gaming experience</li>
                        <li>Communicate regarding services and promotions</li>
                        <li>Improve our facilities and offerings</li>
                        <li>Maintain security and prevent fraud</li>
                      </ul>
                    </section>
                    
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-white">3. Information Sharing</h2>
                      <p>
                        We do not sell or rent your personal information to third parties. We may share information with:
                      </p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Service providers who assist in our operations</li>
                        <li>Legal authorities when required by law</li>
                        <li>Business partners with your explicit consent</li>
                      </ul>
                    </section>
                    
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-white">4. Your Rights</h2>
                      <p>
                        You have the right to:
                      </p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Access your personal information</li>
                        <li>Request correction of inaccurate information</li>
                        <li>Request deletion of your information</li>
                        <li>Opt-out of marketing communications</li>
                        <li>Lodge a complaint with relevant authorities</li>
                      </ul>
                    </section>
                    
                    <section className="space-y-4">
                      <h2 className="text-lg font-semibold text-white">5. Changes to Privacy Policy</h2>
                      <p>
                        Cuephoria reserves the right to update this privacy policy at any time. Changes will be posted on our website, 
                        and your continued use of our services after such modifications constitutes acceptance of the updated policy.
                      </p>
                    </section>
                  </div>
                </DialogContent>
              </Dialog>

              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-gray-400 hover:text-white text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 rounded-lg"
                  >
                    Contact
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[85vw] sm:w-80 bg-cuephoria-dark border-gray-800 text-white p-4 rounded-xl" align={isMobile ? "center" : "end"}>
                  <h3 className="font-semibold text-base sm:text-lg mb-3 text-white">Contact Us</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 text-cuephoria-purple mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs sm:text-sm font-medium">Phone</p>
                        <a href="tel:+918637625155" className="text-gray-300 text-xs sm:text-sm hover:text-white transition-colors">
                          +91 86376 25155
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 text-cuephoria-blue mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs sm:text-sm font-medium">Email</p>
                        <a href="mailto:contact@cuephoria.in" className="text-gray-300 text-xs sm:text-sm hover:text-white transition-colors break-all">
                          contact@cuephoria.in
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Clock className="h-5 w-5 text-cuephoria-orange mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs sm:text-sm font-medium">Hours</p>
                        <span className="text-gray-300 text-xs sm:text-sm">11:00 AM - 11:00 PM</span>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-cuephoria-green mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs sm:text-sm font-medium">Location</p>
                        <span className="text-gray-300 text-xs sm:text-sm">Cuephoria Gaming Lounge</span>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="text-[10px] sm:text-xs text-center text-gray-500">
            <p className="mb-2 sm:mb-1">Designed and developed by RK<sup>™</sup></p>
            <div className="flex flex-col md:flex-row justify-center items-center gap-2 sm:gap-4 text-gray-400">
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-[10px] sm:text-xs">Phone: </span>
                <a href="tel:+918637625155" className="hover:text-white transition-colors text-[10px] sm:text-xs">+91 86376 25155</a>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-[10px] sm:text-xs">Email: </span>
                <a href="mailto:contact@cuephoria.in" className="hover:text-white transition-colors text-[10px] sm:text-xs">contact@cuephoria.in</a>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-[10px] sm:text-xs">Hours: </span>
                <span className="text-[10px] sm:text-xs">11:00 AM - 11:00 PM</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Animated elements - hide on mobile for better performance */}
      {!isMobile && (
        <>
          <div className="fixed top-[10%] left-[10%] text-cuephoria-lightpurple opacity-20 animate-float">
            <Gamepad size={24} className="animate-wiggle" />
          </div>
          <div className="fixed bottom-[15%] right-[15%] text-accent opacity-20 animate-float delay-300">
            <ZapIcon size={24} className="animate-pulse-soft" />
          </div>
          <div className="fixed top-[30%] right-[10%] text-cuephoria-orange opacity-20 animate-float delay-150">
            <Trophy size={20} className="animate-wiggle" />
          </div>
          <div className="fixed bottom-[25%] left-[20%] text-cuephoria-blue opacity-20 animate-float delay-200">
            <Star size={22} className="animate-pulse-soft" />
          </div>
        </>
      )}
    </div>
  );
};

export default Index;
