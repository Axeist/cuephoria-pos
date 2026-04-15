import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Coffee, User, Lock, ChefHat, ShoppingCart, UtensilsCrossed,
  BarChart2, Shield, Loader2, Eye, EyeOff, Clock, Users, Wifi,
  Smartphone, Bell, TrendingUp, CreditCard, Receipt
} from 'lucide-react';
import type { CafeUserRole } from '@/types/cafe.types';

const CafeLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading: authLoading } = useCafeAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CafeUserRole>('cashier');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !username.trim() || !password) return;
    setIsSubmitting(true);
    try {
      const success = await login(username.trim(), password);
      if (success) {
        const roleRedirects: Record<CafeUserRole, string> = {
          cafe_admin: '/cafe/dashboard',
          cashier: '/cafe/pos',
          kitchen: '/cafe/kitchen',
        };
        navigate(roleRedirects[selectedRole] || '/cafe/pos');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const roles: { value: CafeUserRole; label: string; icon: React.ElementType; desc: string }[] = [
    { value: 'cashier', label: 'Cashier', icon: ShoppingCart, desc: 'Take orders & billing' },
    { value: 'kitchen', label: 'Kitchen', icon: ChefHat, desc: 'KOT & preparation' },
    { value: 'cafe_admin', label: 'Admin', icon: Shield, desc: 'Full management' },
  ];

  const features = [
    { icon: ShoppingCart, label: 'Smart POS', desc: 'Quick order-taking with dine-in, takeaway & station delivery', color: 'from-orange-500/20 to-orange-500/5', iconColor: 'text-orange-400' },
    { icon: ChefHat, label: 'Kitchen Display', desc: 'Real-time KOT system with priority tracking and audio alerts', color: 'from-purple-500/20 to-purple-500/5', iconColor: 'text-purple-400' },
    { icon: UtensilsCrossed, label: 'Menu Management', desc: 'Categories, pricing, availability, veg/non-veg filters & CSV import', color: 'from-blue-500/20 to-blue-500/5', iconColor: 'text-blue-400' },
    { icon: TrendingUp, label: 'Revenue Analytics', desc: 'Daily trends, category breakdown, top items & revenue split tracking', color: 'from-green-500/20 to-green-500/5', iconColor: 'text-green-400' },
    { icon: Users, label: 'Customer Hub', desc: 'Central customer DB shared across gaming & cafe with loyalty points', color: 'from-cyan-500/20 to-cyan-500/5', iconColor: 'text-cyan-400' },
    { icon: CreditCard, label: 'Flexible Payments', desc: 'Cash, UPI, split payments, complimentary orders & discount system', color: 'from-pink-500/20 to-pink-500/5', iconColor: 'text-pink-400' },
  ];

  const highlights = [
    { icon: Clock, label: 'Live Orders' },
    { icon: Bell, label: 'Kitchen Alerts' },
    { icon: Wifi, label: 'Real-time Sync' },
    { icon: Smartphone, label: 'Self-Order' },
    { icon: Receipt, label: 'KOT Print' },
    { icon: BarChart2, label: 'Settlements' },
  ];

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#050508' }}>
      {/* ===== LEFT PANEL — Branding & Info ===== */}
      <div className="hidden lg:flex lg:w-[56%] relative flex-col p-8 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, #0a0515 0%, #0f0520 30%, #080b1a 70%, #050508 100%)',
        }} />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 20% 20%, rgba(249,115,22,0.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.08) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(194,135,95,0.06) 0%, transparent 40%)',
        }} />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />

        {/* Top: Dual Branding — Collab */}
        <div className="relative z-10 mb-6">
          <div className="flex items-center gap-4 mb-5">
            {/* Choco Loca Logo */}
            <div className="h-[72px] w-[72px] rounded-2xl bg-[#f5f0e0] flex items-center justify-center shadow-2xl shadow-orange-500/20 p-1.5 ring-2 ring-orange-500/20 flex-shrink-0">
              <img src="/choco-loca-logo.png" alt="Choco Loca" className="h-full w-full object-contain rounded-xl" />
            </div>
            {/* X divider */}
            <span className="text-lg text-gray-600 font-heading flex-shrink-0">&times;</span>
            {/* Cuephoria Logo */}
            <div className="h-[72px] w-[72px] rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center shadow-2xl shadow-purple-500/20 p-1 ring-2 ring-purple-500/20 flex-shrink-0">
              <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" alt="Cuephoria" className="h-full w-full object-contain rounded-xl" />
            </div>
          </div>

          {/* Brand names */}
          <div className="mb-4">
            <div className="flex items-baseline gap-3">
              <h1 className="text-3xl font-bold text-white font-heading tracking-tight">Choco Loca</h1>
              <span className="text-xs text-gray-600 font-quicksand">&times;</span>
              <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-cuephoria-lightpurple bg-clip-text text-transparent font-heading">Cuephoria</span>
            </div>
            <p className="text-sm text-orange-300/70 font-quicksand mt-0.5">Cakes and Cafe &middot; A Collaboration</p>
          </div>

          {/* Status pills */}
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-green-500/20 bg-green-500/5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-green-400 font-quicksand">System Online</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5">
              <span className="text-[10px] text-orange-300/70 font-quicksand">POS &middot; KOT &middot; Kitchen Display &middot; Analytics</span>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="relative z-10 grid grid-cols-2 gap-3 flex-1 my-4 content-center">
          {features.map((f, i) => (
            <div key={f.label}
              className="p-4 rounded-xl border border-white/[0.04] bg-gradient-to-br backdrop-blur-sm transition-all duration-300 hover:border-white/[0.08] hover:scale-[1.02] group"
              style={{
                animationDelay: `${i * 80}ms`,
                background: `linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)`,
              }}>
              <f.icon className={`h-5 w-5 ${f.iconColor} mb-2 group-hover:scale-110 transition-transform`} />
              <h3 className="text-[13px] font-semibold text-white font-heading mb-0.5">{f.label}</h3>
              <p className="text-[10px] text-gray-500 font-quicksand leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Highlights Bar */}
        <div className="relative z-10 flex items-center justify-between p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] mt-auto">
          {highlights.map((h) => (
            <div key={h.label} className="flex flex-col items-center gap-1">
              <h.icon className="h-3.5 w-3.5 text-orange-400/60" />
              <span className="text-[9px] text-gray-500 font-quicksand">{h.label}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between mt-4 text-[10px] text-gray-600 font-quicksand">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-orange-500/40" /> Secure Login</span>
            <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-orange-500/40" /> Encrypted</span>
          </div>
          <div className="flex items-center gap-2">
            <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" alt="Cuephoria" className="h-4 w-4 rounded object-contain opacity-60" />
            <span className="text-gray-600">Cuephoria Technologies</span>
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL — Login Form ===== */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 50% 20%, rgba(249,115,22,0.05) 0%, transparent 60%), radial-gradient(ellipse at 50% 80%, rgba(139,92,246,0.03) 0%, transparent 50%)',
        }} />

        <div className="w-full max-w-sm relative z-10">
          {/* Mobile header */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 rounded-2xl bg-[#f5f0e0] flex items-center justify-center shadow-lg p-1">
                <img src="/choco-loca-logo.png" alt="Choco Loca" className="h-full w-full object-contain rounded-xl" />
              </div>
              <span className="text-sm text-gray-600 font-heading">&times;</span>
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center shadow-lg p-1 ring-1 ring-purple-500/20">
                <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" alt="Cuephoria" className="h-full w-full object-contain rounded-xl" />
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white font-heading">Choco Loca <span className="text-base text-gray-500">&times;</span> <span className="text-lg bg-gradient-to-r from-purple-400 to-cuephoria-lightpurple bg-clip-text text-transparent">Cuephoria</span></h1>
              <p className="text-xs text-gray-400 font-quicksand">Cakes and Cafe &middot; A Collaboration</p>
            </div>
          </div>

          {/* Welcome text — desktop only */}
          <div className="hidden lg:block mb-6">
            <h2 className="text-xl font-bold text-white font-heading mb-1">Welcome back</h2>
            <p className="text-sm text-gray-500 font-quicksand">Sign in to access the cafe management system</p>
          </div>

          {/* Role Selector */}
          <div className="mb-6">
            <label className="text-[10px] text-gray-500 font-quicksand uppercase tracking-widest mb-2 block">Select your role</label>
            <div className="grid grid-cols-3 gap-2">
              {roles.map((r) => (
                <button key={r.value} onClick={() => setSelectedRole(r.value)}
                  className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl text-center transition-all duration-300 border ${
                    selectedRole === r.value
                      ? 'border-orange-500/40 text-white'
                      : 'border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10'
                  }`}
                  style={selectedRole === r.value ? {
                    background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(139,92,246,0.1))',
                    boxShadow: '0 4px 15px rgba(249,115,22,0.15)',
                  } : { background: 'rgba(255,255,255,0.02)' }}>
                  <r.icon className={`h-5 w-5 ${selectedRole === r.value ? 'text-orange-400' : ''}`} />
                  <span className="text-xs font-quicksand font-medium">{r.label}</span>
                  <span className="text-[9px] text-gray-500 font-quicksand leading-tight">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-400 font-quicksand uppercase tracking-widest">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="pl-10 h-11 bg-white/[0.03] border-white/10 text-white placeholder:text-gray-600 focus:border-orange-500/50 focus:ring-orange-500/20 font-quicksand rounded-xl"
                  autoComplete="username" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-400 font-quicksand uppercase tracking-widest">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="Enter password"
                  className="pl-10 pr-10 h-11 bg-white/[0.03] border-white/10 text-white placeholder:text-gray-600 focus:border-orange-500/50 focus:ring-orange-500/20 font-quicksand rounded-xl"
                  autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting || authLoading || !username.trim() || !password}
              className="w-full h-11 text-sm font-quicksand font-semibold text-white border-0 rounded-xl transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] mt-2"
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #c2875f 50%, #6E59A5 100%)',
                boxShadow: '0 4px 20px rgba(249,115,22,0.25)',
              }}>
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
            </Button>
          </form>

          {/* Security strip */}
          <div className="mt-6 flex items-center justify-center gap-3 text-[10px] text-gray-600 font-quicksand">
            <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Encrypted session</span>
            <span className="w-px h-3 bg-gray-800" />
            <span>Auto-logout on idle</span>
          </div>

          {/* Collab branding at the bottom of form */}
          <div className="mt-8 flex items-center justify-center gap-3 opacity-50 hover:opacity-70 transition-opacity">
            <img src="/choco-loca-logo.png" alt="Choco Loca" className="h-5 w-5 rounded object-contain bg-[#f5f0e0] p-0.5" />
            <span className="text-[10px] text-gray-500 font-quicksand">&times;</span>
            <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" alt="Cuephoria" className="h-5 w-5 rounded object-contain" />
            <span className="text-[10px] text-gray-500 font-quicksand">A Collaboration</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CafeLogin;
