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
    <div className="min-h-screen flex items-center justify-center bg-cuephoria-dark p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-cuephoria-purple/10 to-transparent blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gradient-to-tr from-cuephoria-blue/10 to-transparent blur-3xl animate-float opacity-70" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Back button */}
      <div className="absolute top-4 left-4 z-20">
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-300 hover:text-white hover:bg-cuephoria-purple/20"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to Home
        </Button>
      </div>

      <Card className="w-full max-w-md bg-cuephoria-darker/95 border-cuephoria-purple/30 shadow-2xl relative z-10 backdrop-blur-xl">
        <CardHeader className="text-center pb-4">
          <div className="mb-4 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-cuephoria-lightpurple/20 to-accent/10 blur-xl rounded-full"></div>
            <img
              src="/lovable-uploads/61f60a38-12c2-4710-b1c8-0000eb74593c.png"
              alt="Cuephoria"
              className="h-24 mx-auto relative drop-shadow-[0_0_15px_rgba(155,135,245,0.3)]"
            />
          </div>
          <CardTitle className="text-2xl sm:text-3xl gradient-text font-bold">Customer Login</CardTitle>
          <p className="text-gray-400 text-sm mt-2">
            Welcome back! Sign in to book your gaming session
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-white flex items-center gap-2 text-sm font-medium">
                <Phone size={16} className="text-cuephoria-lightpurple" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={10}
                className="bg-background/50 border-cuephoria-lightpurple/30 h-12 text-base focus-visible:ring-cuephoria-lightpurple"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white flex items-center gap-2 text-sm font-medium">
                <Lock size={16} className="text-cuephoria-lightpurple" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background/50 border-cuephoria-lightpurple/30 h-12 pr-12 text-base focus-visible:ring-cuephoria-lightpurple"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                <span className="text-cuephoria-lightpurple">💡</span>
                Default password: <span className="font-mono text-cuephoria-orange">CUE</span> followed by your phone number
              </p>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:shadow-xl hover:shadow-cuephoria-purple/30 h-12 text-base font-semibold mt-6 transition-all duration-300"
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
            <div className="text-center space-y-2 pt-4 border-t border-gray-800">
              <p className="text-xs text-gray-500">
                Don't have an account? Visit us at the venue to register!
              </p>
              <p className="text-xs text-gray-500">
                Need help? Contact us at{' '}
                <a href="tel:+918637625155" className="text-cuephoria-lightpurple hover:text-cuephoria-orange">
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
