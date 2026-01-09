import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Gamepad2, 
  Calendar, 
  Gift, 
  Star, 
  Clock, 
  TrendingUp, 
  Shield, 
  Smartphone,
  Zap,
  Trophy,
  User,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const features = [
    {
      icon: Calendar,
      title: 'Easy Booking',
      description: 'Book your gaming sessions instantly with real-time availability',
      gradient: 'from-blue-600 to-purple-600'
    },
    {
      icon: Star,
      title: 'Loyalty Rewards',
      description: 'Earn points with every booking and unlock exclusive rewards',
      gradient: 'from-purple-600 to-pink-600'
    },
    {
      icon: Gift,
      title: 'Exclusive Offers',
      description: 'Get personalized offers and discounts directly on your dashboard',
      gradient: 'from-orange-600 to-red-600'
    },
    {
      icon: TrendingUp,
      title: 'Track Your Stats',
      description: 'View your gaming history, hours played, and spending insights',
      gradient: 'from-green-600 to-teal-600'
    },
    {
      icon: Zap,
      title: 'Instant Updates',
      description: 'Get real-time notifications about your bookings and new offers',
      gradient: 'from-yellow-600 to-orange-600'
    },
    {
      icon: Trophy,
      title: 'Achievements',
      description: 'Unlock badges and climb the membership tiers as you play',
      gradient: 'from-indigo-600 to-blue-600'
    }
  ];

  const benefits = [
    'No waiting in line - book ahead and play',
    'Earn loyalty points on every session',
    'Get exclusive member-only offers',
    'Track all your bookings in one place',
    'Manage your profile and preferences',
    'Access special promotions and events'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 right-0 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 backdrop-blur-xl bg-gray-900/50 border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-purple-500/50 text-white hover:bg-purple-500/20"
              onClick={() => window.open('https://cuephoria.in', '_blank')}
            >
              Website
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/50"
              onClick={() => navigate('/public/booking')}
            >
              Book Now
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - Customer Login Focus */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20">
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <img
              src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
              alt="Cuephoria Logo"
              className="h-32 md:h-40 drop-shadow-[0_0_40px_rgba(168,85,247,0.6)] animate-pulse"
            />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Cuephoria
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Your premium gaming destination with PlayStation 5, Pool Tables & VR
          </p>

          {/* Main CTA - Customer Login */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-500 hover:via-pink-500 hover:to-blue-500 text-white text-lg px-8 py-6 h-auto shadow-2xl shadow-purple-500/50 transform hover:scale-105 transition-all duration-300 font-bold"
              onClick={() => navigate('/customer/login')}
            >
              <User className="mr-2" size={24} />
              Customer Login
              <ArrowRight className="ml-2" size={24} />
            </Button>
            
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-purple-500/50 text-white hover:bg-purple-500/20 text-lg px-8 py-6 h-auto backdrop-blur-xl"
              onClick={() => navigate('/public/booking')}
            >
              <Calendar className="mr-2" size={20} />
              Book as Guest
            </Button>
          </div>

          <p className="text-sm text-gray-400">
            New customer?{' '}
            <span className="text-purple-400 font-medium">Your account is automatically created when you make your first booking!</span>
          </p>
        </div>

        {/* Customer Dashboard Preview */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            ✨ What You Get with Customer Login
          </h2>
          <p className="text-center text-gray-300 mb-12 max-w-2xl mx-auto">
            Access your personalized dashboard with exclusive features designed for gamers
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className={`bg-gradient-to-br ${feature.gradient} border-0 shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 transition-all duration-300 backdrop-blur-xl`}
                  style={{animationDelay: `${index * 0.1}s`}}
                >
                  <CardContent className="p-6 text-center">
                    <div className="mb-4 flex justify-center">
                      <div className="p-4 bg-white/20 rounded-full backdrop-blur-xl">
                        <Icon size={32} className="text-white" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-white/90 text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Benefits Section */}
        <div className="grid md:grid-cols-2 gap-8 items-center mb-16">
          <div>
            <h2 className="text-3xl font-bold text-white mb-6">
              Why Login to Your Customer Dashboard?
            </h2>
            <div className="space-y-3">
              {benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 bg-gradient-to-r from-purple-600/20 to-transparent p-4 rounded-lg backdrop-blur-xl border border-purple-500/30 transform hover:scale-105 transition-all duration-200"
                >
                  <CheckCircle2 className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
                  <span className="text-gray-200">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <Card className="bg-gradient-to-br from-gray-800/90 to-purple-900/90 border border-purple-500/40 shadow-2xl shadow-purple-500/30 backdrop-blur-xl overflow-hidden">
              <CardContent className="p-0">
                {/* Mock Dashboard Preview */}
                <div className="p-6 bg-gradient-to-r from-purple-600 to-pink-600">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white">Good Evening, Player!</h3>
                      <p className="text-white/80 text-sm">Welcome back to Cuephoria</p>
                    </div>
                    <User className="text-white" size={40} />
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-blue-600/90 to-purple-600/90 p-4 rounded-lg text-center backdrop-blur-xl">
                      <Calendar className="mx-auto mb-2 text-white" size={24} />
                      <p className="text-2xl font-bold text-white">3</p>
                      <p className="text-xs text-white/90">Upcoming</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-600/90 to-teal-600/90 p-4 rounded-lg text-center backdrop-blur-xl">
                      <Star className="mx-auto mb-2 text-white" size={24} />
                      <p className="text-2xl font-bold text-white">1,250</p>
                      <p className="text-xs text-white/90">Points</p>
                    </div>
                  </div>
                  
                  <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-4 backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-semibold">Next Session</span>
                      <Badge className="bg-green-500">Confirmed</Badge>
                    </div>
                    <p className="text-gray-300 text-sm">Tomorrow • 3:00 PM</p>
                  </div>
                  
                  <div className="bg-orange-600/20 border border-orange-500/30 rounded-lg p-4 backdrop-blur-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Gift className="text-orange-400" size={20} />
                      <span className="text-white font-semibold">Special Offer</span>
                    </div>
                    <p className="text-gray-300 text-sm">50% OFF Weekend Gaming</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mobile App Preview */}
        <div className="text-center bg-gradient-to-r from-indigo-600/30 to-purple-600/30 border border-indigo-500/40 rounded-2xl p-8 backdrop-blur-xl">
          <Smartphone className="mx-auto mb-4 text-indigo-400" size={48} />
          <h3 className="text-2xl font-bold text-white mb-3">Mobile-First Experience</h3>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Our customer dashboard is optimized for mobile devices, so you can manage your bookings, 
            track rewards, and redeem offers on the go!
          </p>
        </div>
      </section>

      {/* Footer with Staff Login */}
      <footer className="relative z-10 border-t border-purple-500/20 bg-gray-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* About */}
            <div>
              <h3 className="text-white font-semibold mb-3">About Cuephoria</h3>
              <p className="text-gray-400 text-sm">
                Premium gaming lounge offering PlayStation 5, Pool Tables, and VR experiences in a modern, comfortable environment.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-white font-semibold mb-3">Quick Links</h3>
              <div className="space-y-2">
                <button
                  className="block text-gray-400 hover:text-white text-sm transition-colors"
                  onClick={() => navigate('/public/booking')}
                >
                  Book a Session
                </button>
                <button
                  className="block text-gray-400 hover:text-white text-sm transition-colors"
                  onClick={() => navigate('/customer/login')}
                >
                  Customer Login
                </button>
                <button
                  className="block text-gray-400 hover:text-white text-sm transition-colors"
                  onClick={() => window.open('https://cuephoria.in', '_blank')}
                >
                  Official Website
                </button>
              </div>
            </div>

            {/* Staff Access */}
            <div>
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Shield size={18} />
                Staff Access
              </h3>
              <p className="text-gray-400 text-sm mb-3">
                For Cuephoria staff and administrators only
              </p>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-400 hover:text-white hover:bg-gray-800"
                onClick={() => navigate('/login')}
              >
                <Shield className="mr-2" size={16} />
                Admin Login
              </Button>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-800 pt-6 text-center">
            <p className="text-gray-500 text-sm">
              © 2024 Cuephoria. All rights reserved. | Premium Gaming Lounge
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Badge component (if not already imported)
const Badge = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${className}`}>
    {children}
  </span>
);

export default Index;
