import { useEffect, useState } from 'react';
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
  Sparkles,
  Check,
  ExternalLink,
  ChevronDown,
  Wifi,
  CreditCard,
  Users,
  Music,
  Coffee,
} from 'lucide-react';

const STATS = [
  { value: '500+', label: 'Happy Members' },
  { value: '3,000+', label: 'Sessions Played' },
  { value: '4.9★', label: 'Google Rating' },
  { value: '2', label: 'Locations' },
];

const GAMES = [
  {
    icon: Monitor,
    label: 'PlayStation 5',
    desc: 'Latest titles, DualSense haptics, 4K display',
    tag: 'Most Popular',
    color: 'from-blue-500 to-indigo-600',
    glow: 'rgba(99,102,241,0.4)',
  },
  {
    icon: Crosshair,
    label: '8-Ball Pool',
    desc: 'Professional billiards with premium tables',
    tag: 'Classic',
    color: 'from-emerald-500 to-teal-600',
    glow: 'rgba(16,185,129,0.4)',
  },
  {
    icon: Headset,
    label: 'VR Experience',
    desc: 'Full immersion with cutting-edge headsets',
    tag: 'New',
    color: 'from-purple-500 to-pink-600',
    glow: 'rgba(168,85,247,0.4)',
  },
];

const LITE_FEATURES = [
  { icon: Sparkles, text: 'Same Premium Quality' },
  { icon: CreditCard, text: 'More Affordable Pricing' },
  { icon: Star, text: 'Exclusive NIT Discounts' },
  { icon: Clock, text: 'Late Night Hours' },
  { icon: Crosshair, text: 'Compact Pool Tables' },
  { icon: Wifi, text: 'High-Speed Internet' },
];

const FEATURES = [
  { icon: Calendar, title: 'Instant Booking', desc: 'Reserve your slot in seconds with live availability.' },
  { icon: Star, title: 'Loyalty Rewards', desc: 'Earn points on every visit and unlock exclusive perks.' },
  { icon: Zap, title: 'Instant Confirmation', desc: 'Get your slot confirmed with zero waiting time.' },
  { icon: TrendingUp, title: 'Track Your Stats', desc: 'Explore your gaming history and spending insights.' },
  { icon: Trophy, title: 'Achievements', desc: 'Climb tiers and earn badges the more you play.' },
  { icon: Users, title: 'Group Bookings', desc: 'Book multiple stations for squads and tournaments.' },
];

const TESTIMONIALS = [
  { name: 'Arjun K.', role: 'NIT Trichy Student', text: 'Best gaming lounge in Trichy. The PS5 setup is insane.', rating: 5 },
  { name: 'Priya S.', role: 'Regular Member', text: 'Love the loyalty system. Always get great discounts!', rating: 5 },
  { name: 'Rahul M.', role: 'VR Enthusiast', text: 'The VR experience here is something else entirely.', rating: 5 },
];

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-[#050508] text-white overflow-x-hidden">

      {/* ── BACKGROUND TEXTURE ── */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.018]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: '256px' }} />

      {/* ── AMBIENT GLOW LAYER ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[500px] bg-purple-700/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-72 h-72 bg-cyan-600/6 rounded-full blur-3xl" />
      </div>

      {/* ── STICKY HEADER ── */}
      <header className="relative z-50 border-b border-white/[0.06]"
        style={{ background: 'rgba(5,5,8,0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" alt="Cuephoria" className="h-8 w-auto" />
            <span className="font-bold text-[17px] tracking-tight hidden sm:block">Cuephoria</span>
          </div>
          <nav className="flex items-center gap-1.5">
            <button onClick={() => document.getElementById('lite-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="hidden md:flex text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
              Cuephoria Lite
            </button>
            <button onClick={() => window.open('https://cuephoria.in', '_blank')}
              className="hidden sm:flex text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
              Website
            </button>
            <button onClick={() => navigate('/customer/login')}
              className="text-gray-300 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1.5">
              <User size={14} /> Login
            </button>
            <Button size="sm"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-purple-600/25 rounded-lg text-sm h-9 px-4"
              onClick={() => navigate('/public/booking')}>
            Book Now
          </Button>
          </nav>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative z-10 pt-28 pb-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">

            {/* copy */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide"
                style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: '#c4b5fd' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Now open at 2 locations across Trichy
        </div>
        
              <h1 className="text-5xl sm:text-6xl md:text-[72px] font-extrabold leading-[1.03] tracking-[-0.02em] mb-6">
                Trichy's finest<br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                  gaming lounge
          </span>
        </h1>
        
              <p className="text-gray-400 text-lg sm:text-xl leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0">
                PlayStation 5, professional pool tables, and VR — all bookable online with instant confirmation. Experience gaming the way it should be.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-10">
                <Button size="lg"
                  className="bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-90 text-white text-base px-8 h-14 font-bold shadow-2xl shadow-purple-600/30 rounded-xl transition-all hover:scale-[1.02]"
                  onClick={() => navigate('/customer/login')}>
                  <User size={18} className="mr-2" />
              Customer Login
                  <ArrowRight size={18} className="ml-2" />
          </Button>
                <Button size="lg" variant="outline"
                  className="border-white/12 text-white hover:bg-white/[0.06] text-base px-8 h-14 rounded-xl backdrop-blur-sm"
                  onClick={() => navigate('/public/booking')}>
                  <Calendar size={18} className="mr-2" />
              Book as Guest
          </Button>
          </div>

              <p className="text-xs text-gray-600 text-center lg:text-left">
                No signup needed — your account is auto-created on first booking.
          </p>
        </div>
        
            {/* hero visual */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 scale-110 blur-3xl rounded-full"
                style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.3), transparent 70%)' }} />
              <div className="relative rounded-3xl p-10"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
                <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
                  alt="Cuephoria" className="h-52 sm:h-64 w-auto drop-shadow-[0_0_60px_rgba(168,85,247,0.5)]" />
              </div>
              {/* floating badges */}
              <div className="absolute -top-4 -right-4 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
                ● Open Now
              </div>
              <div className="absolute -bottom-4 -left-4 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd' }}>
                4.9★ Google
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS TICKER ── */}
      <div className="relative z-10 border-y"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-4xl mx-auto px-5 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-1">{s.value}</div>
              <div className="text-gray-500 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── WHAT WE OFFER ── */}
      <section className="relative z-10 py-28 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-purple-400 font-semibold mb-3">What we offer</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">Three worlds of play</h2>
            <p className="text-gray-500 max-w-lg mx-auto">Pick your game, book your slot, show up and play. It's that simple.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {GAMES.map((g) => {
              const Icon = g.icon;
              return (
                <div key={g.label} onClick={() => navigate('/public/booking')}
                  className="group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-300 hover:-translate-y-1"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {/* glow on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                    style={{ background: `radial-gradient(ellipse at 50% 0%, ${g.glow}, transparent 70%)` }} />
                  <div className="relative p-8">
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${g.color} mb-5 shadow-lg`}>
                      <Icon size={24} className="text-white" />
                    </div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-bold">{g.label}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', color: '#c4b5fd' }}>
                        {g.tag}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed mb-6">{g.desc}</p>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 group-hover:text-purple-400 transition-colors">
                      Book a session <ArrowRight size={13} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
      </section>

      {/* ── CUEPHORIA LITE LAUNCH SECTION ── */}
      <section id="lite-section" className="relative z-10 py-28 px-5 sm:px-8 overflow-hidden">
        {/* section background */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(139,92,246,0.04) 50%, rgba(5,5,8,0) 100%)' }} />
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.3), transparent)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent)' }} />

        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-16 items-center">

            {/* left: info */}
            <div className="flex-1">
              {/* launch badge */}
              <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full text-sm font-bold"
                style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)', color: '#22d3ee' }}>
                <Sparkles size={14} />
                NOW OPEN — APR 11, 2026 • 6 PM
              </div>

              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
                Introducing<br />
                <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Cuephoria Lite
                </span>
              </h2>

              <p className="text-xl text-gray-300 font-medium mb-3">
                Same Luxury, More Affordable — Right Next to NIT Trichy!
              </p>
              <p className="text-gray-500 leading-relaxed mb-8 max-w-lg">
                The authentic Cuephoria experience at student-friendly prices. Premium gaming, VR & pool — now closer to campus, with exclusive discounts for NIT students.
              </p>

              {/* opening offer */}
              <div className="rounded-2xl p-5 mb-8"
                style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className="text-cyan-400" />
                  <span className="text-cyan-300 font-bold text-sm tracking-wide">OPENING DAY OFFER</span>
            </div>
                <p className="text-2xl font-extrabold text-white">Up to 60% OFF</p>
                <p className="text-gray-400 text-sm mt-1">For all existing Cuephoria members on opening day</p>
          </div>
          
              {/* feature list */}
              <div className="grid grid-cols-2 gap-3 mb-8">
                {LITE_FEATURES.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.text} className="flex items-center gap-2.5 text-sm text-gray-300">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.25)' }}>
                        <Icon size={11} className="text-cyan-400" />
                      </div>
                      {f.text}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:opacity-90 text-white font-bold px-7 h-12 rounded-xl shadow-xl shadow-cyan-500/20 transition-all hover:scale-[1.02]"
                  onClick={() => navigate('/public/booking/lite')}>
                  Book at Lite Branch
                  <ArrowRight size={16} className="ml-2" />
                </Button>
                <Button size="lg" variant="outline"
                  className="border-cyan-500/25 text-cyan-300 hover:bg-cyan-500/10 h-12 rounded-xl"
                  onClick={() => window.open('https://maps.app.goo.gl/nvTtK6SG4nGQXenGA', '_blank')}>
                  <MapPin size={16} className="mr-2" />
                  View on Maps
                  <ExternalLink size={13} className="ml-2 opacity-60" />
                </Button>
          </div>
            </div>

            {/* right: map / location card */}
            <div className="flex-shrink-0 w-full lg:w-[420px]">
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(6,182,212,0.2)' }}>
                {/* Google Maps embed */}
                <div className="relative">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3917.9!2d78.8!3d10.77!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTDCsDQ2JzEyLjAiTiA3OMKwNDgnMDAuMCJF!5e0!3m2!1sen!2sin!4v1!5m2!1sen!2sin"
                    width="100%"
                    height="240"
                    style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) saturate(0.8)' }}
                    allowFullScreen
                    loading="lazy"
                    title="Cuephoria Lite Location"
                  />
                  <div className="absolute inset-0 pointer-events-none rounded-t-2xl"
                    style={{ background: 'linear-gradient(to bottom, transparent 60%, rgba(5,5,8,0.9))' }} />
        </div>
        
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.2)' }}>
                      <MapPin size={15} className="text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">Cuephoria Lite</p>
                      <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">
                        Opposite NIT Trichy<br />
                        QR64+CRV, Electronics Bus Stop<br />
                        Valavandankottai, Tamil Nadu 620015
                      </p>
                    </div>
          </div>
          
                  <div className="pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {[
                        { label: 'Distance from NIT', value: 'Walking distance' },
                        { label: 'Opens', value: 'Apr 11 • 6 PM' },
                        { label: 'Pricing', value: 'Student-friendly' },
                        { label: 'Discount', value: 'NIT Student code' },
                      ].map((item) => (
                        <div key={item.label}>
                          <p className="text-gray-600">{item.label}</p>
                          <p className="text-gray-300 font-medium mt-0.5">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <a href="https://maps.app.goo.gl/nvTtK6SG4nGQXenGA" target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-10 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                    style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.25)', color: '#22d3ee' }}>
                    <ExternalLink size={14} />
                    Open in Google Maps
                  </a>
                </div>
              </div>

              {/* Lite logo */}
              <div className="mt-4 flex items-center gap-3 p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <img src="/lovable-uploads/cuephoria-lite-logo.png" alt="Cuephoria Lite"
                  className="h-10 w-auto drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]" />
                <div>
                  <p className="text-white font-bold text-sm">Cuephoria Lite</p>
                  <p className="text-gray-500 text-xs">Student-focused • Compact • Affordable</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="relative z-10 py-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-purple-400 font-semibold mb-3">Member benefits</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">Built for gamers</h2>
            <p className="text-gray-500 max-w-lg mx-auto">Create a free account and unlock the full Cuephoria experience across all locations.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title}
                  className="group rounded-2xl p-6 transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="p-2.5 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform"
                    style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
                    <Icon size={18} className="text-purple-400" />
                  </div>
                  <h3 className="font-bold text-white mb-1.5">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── LOCATIONS COMPARISON ── */}
      <section className="relative z-10 py-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-purple-400 font-semibold mb-3">Our locations</p>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">Find us in Trichy</h2>
            <p className="text-gray-500 max-w-lg mx-auto">Two locations, one legendary experience.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Main */}
            <div className="rounded-2xl p-7 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300"
              style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.18)' }}>
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                style={{ background: 'linear-gradient(90deg, #7c3aed, #db2777)' }} />
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" alt="" className="h-7 w-auto" />
                    <span className="font-extrabold text-lg">Cuephoria Main</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }}>
                    FLAGSHIP
                  </span>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse mt-1.5" />
              </div>
              <div className="space-y-3 text-sm">
                {['PS5 Consoles', '8-Ball Pool Tables', 'VR Gaming', 'Snacks & Beverages', 'Air Conditioning', 'Premium Sound System'].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-gray-300">
                    <Check size={14} className="text-purple-400 flex-shrink-0" /> {f}
                  </div>
                ))}
              </div>
              <Button className="w-full mt-6 h-10 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90"
                onClick={() => navigate('/public/booking')}>
                Book at Main
              </Button>
            </div>

            {/* Lite */}
            <div className="rounded-2xl p-7 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300"
              style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)' }}>
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                style={{ background: 'linear-gradient(90deg, #06b6d4, #7c3aed)' }} />
              <div className="flex items-start justify-between mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <img src="/lovable-uploads/cuephoria-lite-logo.png" alt="" className="h-7 w-auto" />
                    <span className="font-extrabold text-lg">Cuephoria Lite</span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(6,182,212,0.12)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.3)' }}>
                    NEW — APR 11
                  </span>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse mt-1.5" />
                    </div>
              <div className="space-y-3 text-sm">
                {['PS5 Consoles', 'Compact Pool Tables', 'VR Gaming', 'Student-Friendly Pricing', 'NIT Exclusive Discounts', 'Late Night Hours'].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-gray-300">
                    <Check size={14} className="text-cyan-400 flex-shrink-0" /> {f}
                  </div>
                ))}
              </div>
              <Button className="w-full mt-6 h-10 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-600 to-purple-600 hover:opacity-90"
                onClick={() => navigate('/public/booking/lite')}>
                Book at Lite
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="relative z-10 py-24 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-purple-400 font-semibold mb-3">What players say</p>
            <h2 className="text-4xl font-extrabold tracking-tight">Loved by gamers</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="rounded-2xl p-6"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.name}</p>
                    <p className="text-gray-600 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="relative z-10 py-24 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl p-12 text-center"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(219,39,119,0.2) 50%, rgba(99,102,241,0.25) 100%)', border: '1px solid rgba(139,92,246,0.3)', backdropFilter: 'blur(20px)' }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.25), transparent 70%)' }} />
            <div className="relative">
              <Gamepad2 className="mx-auto mb-5 text-purple-400" size={48} />
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">Ready to play?</h2>
              <p className="text-gray-300 text-lg mb-10 max-w-xl mx-auto">
                Join hundreds of gamers who book sessions every week. Pick a location, pick a game, play.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg"
                  className="bg-white text-gray-900 hover:bg-gray-50 font-bold text-base px-8 h-13 rounded-xl hover:scale-[1.02] transition-transform"
                  onClick={() => navigate('/public/booking')}>
                  Book at Main Branch <ArrowRight size={18} className="ml-2" />
                </Button>
                <Button size="lg" variant="outline"
                  className="border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10 text-base px-8 h-13 rounded-xl"
                  onClick={() => navigate('/public/booking/lite')}>
                  <Sparkles size={16} className="mr-2" />
                  Book at Lite — Opp. NIT
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 py-14 px-5 sm:px-8"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(5,5,8,0.8)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" alt="Cuephoria" className="h-8 w-auto" />
                <span className="font-bold text-lg">Cuephoria</span>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed max-w-xs mb-5">
                Trichy's premium gaming destination with PlayStation 5, professional pool tables, and VR — now at 2 locations.
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-700">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Both locations open now
              </div>
            </div>
            
            <div>
              <p className="text-white text-sm font-semibold mb-4">Quick Links</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Book at Main Branch', action: () => navigate('/public/booking') },
                  { label: 'Book at Lite Branch', action: () => navigate('/public/booking/lite') },
                  { label: 'Customer Login', action: () => navigate('/customer/login') },
                  { label: 'Official Website', action: () => window.open('https://cuephoria.in', '_blank') },
                ].map((l) => (
                  <button key={l.label} onClick={l.action}
                    className="block text-gray-600 hover:text-gray-300 text-sm transition-colors text-left">
                    {l.label}
                </button>
                ))}
                      </div>
                    </div>
                    
            <div>
              <p className="text-white text-sm font-semibold mb-4">Locations</p>
              <div className="space-y-4 text-xs text-gray-600">
                <div>
                  <p className="text-gray-400 font-medium mb-1">Main Branch</p>
                  <p>Cuephoria Gaming Lounge<br />Trichy, Tamil Nadu</p>
                </div>
                      <div>
                  <p className="text-cyan-500 font-medium mb-1">Lite Branch — NEW</p>
                  <p>Opposite NIT Trichy<br />Valavandankottai, TN 620015</p>
                  <a href="https://maps.app.goo.gl/nvTtK6SG4nGQXenGA" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-cyan-600 hover:text-cyan-400 mt-1 transition-colors">
                    <MapPin size={10} /> Directions
                  </a>
                </div>
                <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-gray-500 text-xs mb-2">Staff & Admin</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <button onClick={() => navigate('/login')}
                      className="flex items-center gap-1.5 text-gray-600 hover:text-gray-400 text-xs transition-colors">
                      <Shield size={11} /> Admin Login
                    </button>
                    <button onClick={() => navigate('/cafe/login')}
                      className="flex items-center gap-1.5 text-gray-600 hover:text-gray-400 text-xs transition-colors">
                      <Coffee size={11} /> Cafe Login
                    </button>
                    <button onClick={() => navigate('/signup')}
                      className="flex items-center gap-1.5 text-purple-500 hover:text-purple-300 text-xs font-semibold transition-colors">
                      Start your own workspace →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-gray-700 text-xs">© {new Date().getFullYear()} Cuephoria. All rights reserved.</p>
            <p className="text-gray-700 text-xs">
              Built by{' '}
              <a href="https://cuephoriatech.in" target="_blank" rel="noopener noreferrer"
                className="text-purple-500 hover:text-purple-400 transition-colors">
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
