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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-4 relative overflow-hidden">
      {/* Background effects - Matching dashboard theme */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-purple-500/20 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-pink-500/20 blur-3xl animate-pulse opacity-70" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* Back button */}
      <div className="absolute top-4 left-4 z-20">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-300 hover:text-white hover:bg-purple-600/30 transition-all"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Home
        </Button>
      </div>

      <Card className="w-full max-w-md bg-gray-900/95 border-purple-500/30 shadow-2xl shadow-purple-500/20 relative z-10 backdrop-blur-xl">
        <CardHeader className="text-center pb-4 bg-gradient-to-br from-purple-600/10 to-pink-600/10 border-b border-purple-500/20">
          <div className="mb-4 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-pink-500/20 blur-2xl rounded-full"></div>
            <img
              src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
              alt="Cuephoria"
              className="h-24 mx-auto relative drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]"
            />
          </div>
          <CardTitle className="text-2xl sm:text-3xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-bold">Customer Login</CardTitle>
          <p className="text-gray-300 text-sm mt-2">
            Welcome back! Sign in to book your gaming session
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-white flex items-center gap-2 text-sm font-medium">
                <Phone size={16} className="text-purple-400" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
                className="bg-gray-800/50 border-purple-500/30 h-12 text-base focus-visible:ring-purple-500 focus-visible:border-purple-400"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white flex items-center gap-2 text-sm font-medium">
                <Lock size={16} className="text-purple-400" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-800/50 border-purple-500/30 h-12 pr-12 text-base focus-visible:ring-purple-500 focus-visible:border-purple-400"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-400 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                <span className="text-purple-400">💡</span>
                Default password: <span className="font-mono text-red-400">CUE</span> followed by your phone number
              </p>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 hover:shadow-xl hover:shadow-purple-500/30 h-12 text-base font-semibold mt-6 transition-all duration-300"
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
            <div className="text-center space-y-2 pt-4 border-t border-purple-500/20">
              <p className="text-xs text-gray-400">
                Don't have an account? Visit us at the venue to register!
              </p>
              <p className="text-xs text-gray-400">
                Need help? Contact us at{' '}
                <a href="tel:+918637625155" className="text-purple-400 hover:text-pink-400 font-medium">
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
