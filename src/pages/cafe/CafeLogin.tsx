import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCafeAuth } from '@/context/CafeAuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Coffee, User, Lock, ChefHat, ShoppingCart, UtensilsCrossed, BarChart2, Shield, Loader2, Eye, EyeOff } from 'lucide-react';
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

  const roles: { value: CafeUserRole; label: string; icon: React.ElementType }[] = [
    { value: 'cashier', label: 'Cashier', icon: ShoppingCart },
    { value: 'kitchen', label: 'Kitchen', icon: ChefHat },
    { value: 'cafe_admin', label: 'Admin', icon: Shield },
  ];

  const features = [
    { icon: ShoppingCart, label: 'Smart POS', desc: 'Quick order-taking with table management' },
    { icon: ChefHat, label: 'Kitchen Display', desc: 'Real-time KOT system for kitchen staff' },
    { icon: UtensilsCrossed, label: 'Menu Management', desc: 'Configurable menu with categories' },
    { icon: BarChart2, label: 'Reports & Settlement', desc: 'Revenue tracking and partner splits' },
  ];

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#050508' }}>
      {/* Left Panel — Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[58%] relative flex-col justify-between p-10 overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, #0a0515 0%, #0f0520 30%, #080b1a 70%, #050508 100%)',
        }} />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(249,115,22,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.1) 0%, transparent 50%)',
        }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        {/* Top: Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-cuephoria-purple flex items-center justify-center shadow-2xl shadow-orange-500/30">
              <Coffee className="h-9 w-9 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white font-heading">Cuephoria Cafe</h1>
              <p className="text-sm text-gray-400 font-quicksand">Kitchen & Order Management</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/5 mb-8">
            <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-xs text-orange-300/80 font-quicksand">POS &middot; KOT &middot; Real-time Kitchen</span>
          </div>
        </div>

        {/* Middle: Feature tiles */}
        <div className="relative z-10 grid grid-cols-2 gap-4 my-8">
          {features.map((f, i) => (
            <div
              key={f.label}
              className={`p-5 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm animate-fade-in`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <f.icon className="h-6 w-6 text-orange-400 mb-3" />
              <h3 className="text-sm font-semibold text-white font-heading mb-1">{f.label}</h3>
              <p className="text-xs text-gray-500 font-quicksand leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Bottom: Footer */}
        <div className="relative z-10 flex items-center gap-6 text-xs text-gray-600">
          <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-orange-500/50" /> Secure Login</span>
          <span className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-orange-500/50" /> Encrypted</span>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(249,115,22,0.06) 0%, transparent 70%)',
        }} />

        <div className="w-full max-w-md relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-cuephoria-purple flex items-center justify-center shadow-lg shadow-orange-500/30 animate-neon-pulse">
              <Coffee className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-cuephoria-lightpurple bg-clip-text text-transparent font-heading">
              Cuephoria Cafe
            </h1>
          </div>

          {/* Role Selector */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/5 mb-8">
            {roles.map((r) => (
              <button
                key={r.value}
                onClick={() => setSelectedRole(r.value)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-quicksand font-medium transition-all duration-300 ${
                  selectedRole === r.value
                    ? 'text-white shadow-lg'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
                style={selectedRole === r.value ? {
                  background: 'linear-gradient(135deg, #f97316, #6E59A5)',
                  boxShadow: '0 4px 15px rgba(249,115,22,0.3)',
                } : undefined}
              >
                <r.icon className="h-4 w-4" />
                {r.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-quicksand uppercase tracking-wider">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="pl-10 h-12 bg-white/[0.03] border-white/10 text-white placeholder:text-gray-600 focus:border-orange-500/50 focus:ring-orange-500/20 font-quicksand"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-quicksand uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pl-10 pr-10 h-12 bg-white/[0.03] border-white/10 text-white placeholder:text-gray-600 focus:border-orange-500/50 focus:ring-orange-500/20 font-quicksand"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || authLoading || !username.trim() || !password}
              className="w-full h-12 text-base font-quicksand font-semibold text-white border-0 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, #f97316, #6E59A5)',
                boxShadow: '0 4px 20px rgba(249,115,22,0.3)',
              }}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Security strip */}
          <div className="mt-8 flex items-center justify-center gap-4 text-[10px] text-gray-600 font-quicksand">
            <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Encrypted session</span>
            <span className="w-px h-3 bg-gray-800" />
            <span>Auto-logout on idle</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CafeLogin;
