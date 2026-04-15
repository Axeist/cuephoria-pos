import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCafeAuth } from '@/context/CafeAuthContext';
import AppLoadingOverlay from '@/components/loading/AppLoadingOverlay';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  User, Lock, ShoppingCart, UtensilsCrossed,
  BarChart2, Shield, Loader2, Eye, EyeOff, Users, TrendingUp,
  CreditCard, ClipboardList, ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
const CafeLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading: authLoading } = useCafeAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Visual hint only — real role comes from the server after login. */
  const [loginKind, setLoginKind] = useState<'staff' | 'admin'>('staff');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !username.trim() || !password) return;
    setIsSubmitting(true);
    try {
      const loggedInUser = await login(username.trim(), password);
      if (loggedInUser) {
        if (loggedInUser.role === 'cafe_admin') {
          navigate('/cafe/dashboard');
        } else {
          navigate('/cafe/pos');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const roles: { value: 'staff' | 'admin'; label: string; icon: React.ElementType; desc: string }[] = [
    { value: 'staff', label: 'Staff', icon: ShoppingCart, desc: 'POS, menu & orders' },
    { value: 'admin', label: 'Admin', icon: Shield, desc: 'Dashboard & reports' },
  ];

  return (
    <div className="min-h-screen flex bg-[#050508] overflow-hidden relative">
      <AppLoadingOverlay
        visible={isSubmitting}
        variant="cafe"
        title="Signing you in"
        subtitle="Validating credentials and opening your workspace…"
      />
      {/* ── LEFT BRANDING PANEL ── */}
      <div className="hidden lg:flex lg:w-[58%] relative flex-col justify-between p-14 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0a0515 0%, #0f0520 50%, #050508 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 15% 55%, rgba(249,115,22,0.18) 0%, transparent 60%)' }} />
        <div className="absolute bottom-0 right-0 w-[480px] h-[480px] rounded-full blur-[100px]" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.10), transparent)' }} />
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        {/* Logos */}
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-lg" style={{ background: 'rgba(249,115,22,0.3)' }} />
              <div className="relative h-14 w-14 rounded-2xl bg-[#f5f0e0] flex items-center justify-center p-1.5 ring-2 ring-orange-500/20">
                <img src="/choco-loca-logo.png" alt="Choco Loca" className="h-full w-full object-contain rounded-xl" />
              </div>
            </div>
            <span className="text-gray-600 text-lg font-heading">&times;</span>
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-lg" style={{ background: 'rgba(139,92,246,0.3)' }} />
              <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-1 ring-2 ring-purple-500/20">
                <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" alt="Cuephoria" className="h-full w-full object-contain rounded-xl" />
              </div>
            </div>
            <div className="ml-1">
              <span className="text-white font-extrabold text-xl tracking-tight block leading-none">Choco Loca</span>
              <span className="text-orange-400 text-[10px] tracking-[0.18em] uppercase font-medium">Cakes & Cafe</span>
            </div>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative z-10 max-w-[460px]">
          <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide"
            style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.2)', color: '#fb923c' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Live · POS · orders & menu
          </div>

          <h1 className="text-5xl font-extrabold text-white leading-[1.08] tracking-[-0.02em] mb-6">
            Your cafe,<br />
            fully managed,<br />
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-purple-400 bg-clip-text text-transparent">
              real-time.
            </span>
          </h1>

          <p className="text-gray-400 text-[15px] leading-relaxed mb-10">
            Complete cafe POS with order tracking, menu management, revenue split tracking, and customer analytics — powered by Cuephoria.
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: ShoppingCart, label: 'Smart POS System', color: 'text-orange-400' },
              { icon: ClipboardList, label: 'Orders & fulfilment', color: 'text-purple-400' },
              { icon: UtensilsCrossed, label: 'Menu & Inventory', color: 'text-blue-400' },
              { icon: TrendingUp, label: 'Revenue Analytics', color: 'text-green-400' },
              { icon: Users, label: 'Customer Hub', color: 'text-cyan-400' },
              { icon: CreditCard, label: 'Flexible Payments', color: 'text-pink-400' },
            ].map(({ icon: FeatureIcon, label, color }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <FeatureIcon className={`h-4 w-4 ${color} flex-shrink-0`} />
                <span className="text-gray-300 text-[13px] font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer trust row */}
        <div className="relative z-10 flex flex-wrap items-center gap-5">
          {[
            { icon: Shield, text: 'Session encrypted' },
            { icon: Lock, text: 'Auto-logout on idle' },
            { icon: BarChart2, text: '70/30 revenue split' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5">
              <Icon size={12} className="text-orange-500/50" />
              <span className="text-gray-600 text-xs">{text}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" alt="Cuephoria" className="h-4 w-4 rounded object-contain opacity-50" />
            <span className="text-gray-700 text-xs">Cuephoria Technologies</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 relative flex flex-col justify-center px-6 sm:px-10 lg:px-12 xl:px-16 py-12 overflow-auto"
        style={{ background: 'rgba(8,8,14,0.85)', backdropFilter: 'blur(24px)' }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.06), transparent)' }} />

        <div className="w-full max-w-[380px] mx-auto relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-16 w-16 rounded-2xl bg-[#f5f0e0] flex items-center justify-center p-1.5">
                <img src="/choco-loca-logo.png" alt="Choco Loca" className="h-full w-full object-contain rounded-xl" />
              </div>
              <span className="text-gray-600 font-heading">&times;</span>
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-1 ring-1 ring-purple-500/20">
                <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" alt="Cuephoria" className="h-full w-full object-contain rounded-xl" />
              </div>
            </div>
            <h1 className="text-2xl font-extrabold text-white font-heading">Choco Loca</h1>
            <p className="text-orange-400 text-[10px] tracking-[0.2em] uppercase font-medium">Cakes & Cafe · Cuephoria</p>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-[28px] font-extrabold text-white leading-tight tracking-tight mb-1.5">
              Welcome back
            </h2>
            <p className="text-gray-500 text-sm">Sign in to access the cafe management system</p>
          </div>

          {/* Role toggle */}
          <div className="flex p-1 rounded-xl mb-7"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {roles.map((r) => {
              const RoleIcon = r.icon;
              return (
              <button key={r.value} type="button" onClick={() => setLoginKind(r.value)}
                className={`flex-1 flex items-center justify-center gap-2 text-[13px] py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                  loginKind === r.value ? 'text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                }`}
                style={loginKind === r.value ? {
                  background: 'linear-gradient(135deg, #f97316, #9333ea)',
                  boxShadow: '0 4px 16px rgba(249,115,22,0.3)'
                } : {}}>
                <RoleIcon size={14} />
                {r.label}
              </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-gray-400 mb-1.5">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="pl-10 h-12 text-sm rounded-xl placeholder:text-gray-700"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'white' }}
                  autoComplete="username" />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-semibold text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                <Input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••"
                  className="pl-10 pr-11 h-12 text-sm rounded-xl placeholder:text-gray-700"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'white' }}
                  autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting || authLoading || !username.trim() || !password}
              className="w-full h-12 font-bold text-sm rounded-xl text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.01] mt-2"
              style={{ background: 'linear-gradient(135deg, #f97316, #9333ea)', boxShadow: '0 4px 20px rgba(249,115,22,0.3)' }}>
              {isSubmitting ? (
                <span className="flex items-center gap-2.5">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying credentials…
                </span>
              ) : (
                <span className="flex items-center gap-2.5">
                  {loginKind === 'admin' ? <Shield size={15} /> : <ShoppingCart size={15} />}
                  Sign in as {roles.find(r => r.value === loginKind)?.label}
                </span>
              )}
            </Button>
          </form>

          {/* Security strip */}
          <div className="mt-8 pt-6 flex flex-col gap-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 justify-center text-[11px] text-gray-700">
              <Shield size={11} className="text-orange-700" />
              <span>Authorised personnel only</span>
              <span className="text-gray-800">&middot;</span>
              <Lock size={11} className="text-orange-700" />
              <span>Activity is logged</span>
            </div>
            <div className="flex items-center justify-center gap-4">
              {['Cafe POS', 'Orders', '70/30 Split'].map((badge) => (
                <span key={badge} className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.12)', color: '#c2410c' }}>
                  {badge}
                </span>
              ))}
            </div>
            <Link
              to="/cafe/order"
              className="inline-flex items-center gap-1.5 text-[11px] text-orange-400/80 hover:text-orange-300 transition-colors font-quicksand"
            >
              <UtensilsCrossed size={11} /> Customer Self-Order Menu <ExternalLink size={9} />
            </Link>
            <div className="flex items-center justify-center gap-3 mt-1 opacity-50">
              <img src="/choco-loca-logo.png" alt="Choco Loca" className="h-5 w-5 rounded object-contain bg-[#f5f0e0] p-0.5" />
              <span className="text-[10px] text-gray-600">&times;</span>
              <img src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png" alt="Cuephoria" className="h-5 w-5 rounded object-contain" />
              <span className="text-[10px] text-gray-600">A Collaboration</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CafeLogin;
