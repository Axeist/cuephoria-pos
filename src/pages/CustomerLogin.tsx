import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Phone, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  getCustomerSession,
  setCustomerSession,
  normalizePhoneNumber,
  validatePhoneNumber,
  generateDefaultPassword,
  type CustomerSession
} from '@/utils/customerAuth';

export default function CustomerLogin() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check if already logged in
  useEffect(() => {
    const session = getCustomerSession();
    if (session) {
      navigate('/customer/dashboard');
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone || !password) {
      toast.error('Please enter phone and password');
      return;
    }

    // Validate phone number
    const normalizedPhone = normalizePhoneNumber(phone);
    const validation = validatePhoneNumber(normalizedPhone);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setLoading(true);

    try {
      // Find customer by phone
      const { data: customer, error } = await supabase
        .from('customers')
        .select('id, name, phone, email, password_hash, is_first_login, loyalty_points, is_member')
        .eq('phone', normalizedPhone)
        .single();

      if (error || !customer) {
        toast.error('Customer not found. Please check your phone number or visit us to register.');
        return;
      }

      // Check if password is set
      if (!customer.password_hash) {
        toast.error('Password not set. Please visit the venue to set up your account.');
        return;
      }

      // Verify password (using Supabase RPC function for security)
      // For now, we'll do a simple comparison - in production, use proper server-side verification
      const defaultPassword = generateDefaultPassword(normalizedPhone);
      const { data: verifyResult, error: verifyError } = await supabase.rpc('verify_customer_password', {
        customer_phone: normalizedPhone,
        input_password: password
      });

      // Fallback to simple check if RPC doesn't exist yet
      if (verifyError) {
        // Simple client-side check (insecure - only for demo/initial setup)
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const clientHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        // For MVP, just check if password matches the default format
        if (password !== defaultPassword) {
          toast.error('Incorrect password. Default password is CUE followed by your phone number.');
          return;
        }
      } else if (!verifyResult) {
        toast.error('Incorrect password. Default password is CUE followed by your phone number.');
        return;
      }

      // Update last login time
      await supabase
        .from('customers')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', customer.id);

      // Create session
      const customerSession: CustomerSession = {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        isFirstLogin: customer.is_first_login || false,
        loyaltyPoints: customer.loyalty_points || 0,
        isMember: customer.is_member || false
      };

      setCustomerSession(customerSession);

      toast.success(`Welcome back, ${customer.name}! 👋`);

      // Always redirect to dashboard
      navigate('/customer/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 p-4 relative overflow-hidden">
      {/* Enhanced Background effects */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-purple-500/30 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-pink-500/30 blur-3xl animate-pulse opacity-70" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/2 left-0 w-72 h-72 rounded-full bg-blue-500/20 blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 z-0 opacity-10" style={{
        backgroundImage: 'linear-gradient(rgba(147, 51, 234, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(147, 51, 234, 0.1) 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }}></div>

      {/* Back button */}
      <div className="absolute top-6 left-6 z-20">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-300 hover:text-white hover:bg-purple-600/30 transition-all backdrop-blur-sm border border-purple-500/20"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={18} className="mr-2" />
          Back to Home
        </Button>
      </div>

      <Card className="w-full max-w-md bg-gray-900/98 border-purple-500/40 shadow-2xl shadow-purple-500/30 relative z-10 backdrop-blur-2xl">
        <CardHeader className="text-center pb-6 pt-8 bg-gradient-to-br from-purple-600/20 via-pink-600/10 to-transparent border-b border-purple-500/30 relative overflow-hidden">
          {/* Header glow effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-purple-500/20 to-transparent blur-2xl"></div>
          
          <div className="mb-6 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/40 to-pink-500/30 blur-3xl rounded-full"></div>
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-purple-400/30 to-pink-400/20 blur-2xl rounded-full"></div>
            <img
              src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
              alt="Cuephoria"
              className="h-28 mx-auto relative drop-shadow-[0_0_25px_rgba(168,85,247,0.6)] animate-float"
            />
          </div>
          <CardTitle className="text-3xl sm:text-4xl bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent font-black mb-2 tracking-tight">
            Customer Login
          </CardTitle>
          <p className="text-gray-300 text-sm">
            Welcome back! Sign in to book your gaming session
          </p>
        </CardHeader>

        <CardContent className="pt-6 pb-8 px-6 sm:px-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Phone Number */}
            <div className="space-y-2.5">
              <Label htmlFor="phone" className="text-white flex items-center gap-2 text-sm font-semibold">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Phone size={16} className="text-purple-400" />
                </div>
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Raju"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
                className="bg-gray-800/70 border-purple-500/40 h-14 text-base focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:border-purple-400 transition-all hover:border-purple-400/60"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="space-y-2.5">
              <Label htmlFor="password" className="text-white flex items-center gap-2 text-sm font-semibold">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Lock size={16} className="text-purple-400" />
                </div>
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-800/70 border-purple-500/40 h-14 pr-12 text-base focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:border-purple-400 transition-all hover:border-purple-400/60"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-400 transition-colors p-1 rounded-md hover:bg-purple-500/10"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="flex items-start gap-2 mt-2 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                <span className="text-purple-400 text-lg mt-0.5">💡</span>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Default password: <span className="font-mono text-red-400 font-semibold">CUE</span> followed by your phone number
                </p>
              </div>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 hover:from-purple-700 hover:via-purple-600 hover:to-pink-700 hover:shadow-2xl hover:shadow-purple-500/40 h-14 text-base font-bold mt-8 transition-all duration-300 transform hover:scale-[1.02]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Login to Dashboard'
              )}
            </Button>

            {/* Help Text */}
            <div className="text-center space-y-3 pt-6 border-t border-purple-500/30">
              <p className="text-xs text-gray-400">
                Don't have an account? Visit us at the venue to register!
              </p>
              <p className="text-xs text-gray-300 font-medium">
                Need help? Contact us at{' '}
                <a href="tel:+918637625155" className="text-purple-400 hover:text-pink-400 font-semibold transition-colors underline decoration-purple-400/30 hover:decoration-pink-400">
                  +91 86376 25155
                </a>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
