import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Gamepad2,
  Calendar,
  Star,
  Clock,
  TrendingUp,
  Shield,
  Zap,
  Trophy,
  User,
  ArrowRight,
  MapPin,
  Monitor,
  Crosshair,
  Headset,
} from 'lucide-react';

const STATS = [
  { value: '500+', label: 'Happy Customers' },
  { value: '3 000+', label: 'Sessions Played' },
  { value: '4.9★', label: 'Average Rating' },
  { value: '2', label: 'Locations' },
];

const GAMES = [
  { icon: Monitor, label: 'PlayStation 5', desc: 'Latest titles & multiplayer', color: 'from-blue-600 to-indigo-700' },
  { icon: Crosshair, label: '8-Ball Pool', desc: 'Professional billiards tables', color: 'from-green-600 to-emerald-700' },
  { icon: Headset, label: 'VR Experience', desc: 'Immersive virtual reality', color: 'from-purple-600 to-pink-700' },
];

const FEATURES = [
  { icon: Calendar, title: 'Easy Booking', desc: 'Book sessions in seconds with live availability' },
  { icon: Star, title: 'Loyalty Rewards', desc: 'Earn points every visit & unlock exclusive perks' },
  { icon: Zap, title: 'Instant Confirmation', desc: 'Get confirmed slots with zero waiting time' },
  { icon: TrendingUp, title: 'Track Your Stats', desc: 'View playtime history and spending insights' },
  { icon: Trophy, title: 'Achievements', desc: 'Climb tiers and earn badges as you play' },
  { icon: Clock, title: 'Flexible Hours', desc: 'Open late — book whenever you feel like gaming' },
];

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-[#07070f] text-white overflow-x-hidden">

      {/* ── NOISE TEXTURE OVERLAY ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: '200px' }}
      />

      {/* ── HEADER ── */}
      <header className="relative z-20 border-b border-white/[0.06] bg-[#07070f]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
              alt="Cuephoria"
              className="h-9 w-auto"
            />
            <span className="font-bold text-lg tracking-tight hidden sm:block">Cuephoria</span>
          </div>
          <nav className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white text-sm hidden sm:flex"
              onClick={() => window.open('https://cuephoria.in', '_blank')}
            >
              Website
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white text-sm"
              onClick={() => navigate('/customer/login')}
            >
              <User size={15} className="mr-1.5" /> Login
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-purple-600/20 rounded-lg"
              onClick={() => navigate('/public/booking')}
            >
              Book Now
            </Button>
          </nav>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative z-10 pt-24 pb-20 px-5 sm:px-8 overflow-hidden">
        {/* background glow blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-purple-700/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-indigo-700/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            {/* left copy */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 text-purple-300 text-xs font-medium tracking-wide mb-6">
                <MapPin size={12} />
                Now open at 2 locations — Main &amp; Cuephoria Lite
              </div>

              <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
                Level up your<br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                  gaming life
                </span>
              </h1>

              <p className="text-gray-400 text-lg sm:text-xl leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                PlayStation 5, Pro pool tables, and VR experiences — all bookable online with instant confirmation.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:via-pink-500 hover:to-indigo-500 text-white text-base px-8 py-6 h-auto font-bold shadow-2xl shadow-purple-600/30 rounded-xl"
                  onClick={() => navigate('/customer/login')}
                >
                  <User size={18} className="mr-2" />
                  Customer Login
                  <ArrowRight size={18} className="ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/15 text-white hover:bg-white/5 text-base px-8 py-6 h-auto rounded-xl backdrop-blur-sm"
                  onClick={() => navigate('/public/booking')}
                >
                  <Calendar size={18} className="mr-2" />
                  Book as Guest
                </Button>
              </div>

              <p className="mt-4 text-xs text-gray-600">
                New here? Your account is created automatically on first booking.
              </p>
            </div>

            {/* right — logo / visual */}
            <div className="flex-shrink-0 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-indigo-600/20 rounded-3xl blur-2xl scale-110" />
              <div className="relative bg-white/[0.04] border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                <img
                  src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
                  alt="Cuephoria"
                  className="h-48 sm:h-56 w-auto drop-shadow-[0_0_50px_rgba(168,85,247,0.5)]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="relative z-10 border-y border-white/[0.06] bg-white/[0.02] py-8 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{s.value}</div>
              <div className="text-gray-500 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHAT WE OFFER ── */}
      <section className="relative z-10 py-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold mb-3">What we offer</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Three worlds of entertainment under one roof — pick your game, book your slot.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {GAMES.map((g) => {
              const Icon = g.icon;
              return (
                <div
                  key={g.label}
                  className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${g.color} p-px cursor-pointer group`}
                  onClick={() => navigate('/public/booking')}
                >
                  <div className="relative bg-[#0d0d1a]/80 rounded-2xl p-8 h-full group-hover:bg-transparent transition-colors duration-300">
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${g.color} mb-5`}>
                      <Icon size={26} className="text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{g.label}</h3>
                    <p className="text-gray-400 text-sm">{g.desc}</p>
                    <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-gray-400 group-hover:text-white transition-colors">
                      Book a slot <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="relative z-10 py-20 px-5 sm:px-8 bg-white/[0.015]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold mb-3">Built for gamers</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Create a free account and unlock the full Cuephoria experience.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] rounded-2xl p-6 transition-colors duration-200 group"
                >
                  <div className="p-2.5 rounded-xl bg-purple-600/15 w-fit mb-4 group-hover:bg-purple-600/25 transition-colors">
                    <Icon size={20} className="text-purple-400" />
                  </div>
                  <h3 className="font-bold text-white mb-1">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="relative z-10 py-24 px-5 sm:px-8 overflow-hidden">
        <div className="max-w-4xl mx-auto relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-700/30 via-pink-700/20 to-indigo-700/30 rounded-3xl blur-2xl" />
          <div className="relative bg-gradient-to-br from-purple-900/60 to-indigo-900/60 border border-purple-500/30 rounded-3xl p-12 text-center backdrop-blur-xl">
            <Gamepad2 className="mx-auto mb-5 text-purple-400" size={48} />
            <h2 className="text-4xl font-extrabold mb-4">Ready to play?</h2>
            <p className="text-gray-300 text-lg mb-8 max-w-lg mx-auto">
              Join hundreds of gamers who book their sessions online every week. It takes 30 seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="bg-white text-gray-900 hover:bg-gray-100 font-bold text-base px-8 py-6 h-auto rounded-xl"
                onClick={() => navigate('/public/booking')}
              >
                Book a Session Now
                <ArrowRight size={18} className="ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 text-base px-8 py-6 h-auto rounded-xl"
                onClick={() => navigate('/customer/login')}
              >
                <User size={18} className="mr-2" />
                View My Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-white/[0.07] bg-[#05050d] py-12 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" alt="Cuephoria" className="h-8 w-auto" />
                <span className="font-bold text-lg">Cuephoria</span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed max-w-xs">
                Premium gaming lounge with PlayStation 5, pool tables, and VR — now at 2 locations.
              </p>
            </div>

            <div>
              <p className="text-white text-sm font-semibold mb-3">Quick Links</p>
              <div className="space-y-2">
                {[
                  { label: 'Book a Session', action: () => navigate('/public/booking') },
                  { label: 'Customer Login', action: () => navigate('/customer/login') },
                  { label: 'Cuephoria Lite', action: () => navigate('/public/booking/lite') },
                  { label: 'Official Website', action: () => window.open('https://cuephoria.in', '_blank') },
                ].map((l) => (
                  <button key={l.label} onClick={l.action} className="block text-gray-600 hover:text-gray-300 text-sm transition-colors">
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                <Shield size={14} />Staff Access
              </p>
              <p className="text-gray-600 text-xs mb-3">For authorised Cuephoria personnel only.</p>
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 text-gray-500 hover:text-white hover:bg-white/5 text-xs rounded-lg"
                onClick={() => navigate('/login')}
              >
                <Shield size={13} className="mr-1.5" />
                Admin Login
              </Button>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-gray-700 text-xs">
              © {new Date().getFullYear()} Cuephoria. All rights reserved.
            </p>
            <p className="text-gray-700 text-xs">
              Built by{' '}
              <a href="https://cuephoriatech.in" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:text-purple-400 transition-colors">
                Cuephoria Tech
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
