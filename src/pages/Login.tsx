import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { appToast } from '@/lib/appToast';
import { useAuth } from '@/context/AuthContext';

type LoginMetadata = Record<string, unknown>;
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Gamepad2,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import AppLoadingOverlay from '@/components/loading/AppLoadingOverlay';
import GoogleButton from '@/components/auth/GoogleButton';
import AuthSceneBackground from '@/components/auth/AuthSceneBackground';
import { UAParser } from 'ua-parser-js';
import { supabase } from "@/integrations/supabase/client";

interface LocationState {
  from?: string;
}

const FEATURE_PILLS = [
  { icon: Activity, label: 'Live station monitor' },
  { icon: Zap, label: 'Booking engine' },
  { icon: Users, label: 'Staff & payroll' },
  { icon: ShieldCheck, label: 'RLS + 2FA ready' },
];

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginType, setLoginType] = useState<'admin' | 'staff'>('admin');
  const [totpCode, setTotpCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [needsTotp, setNeedsTotp] = useState(false);
  const [cachedMetadata, setCachedMetadata] = useState<LoginMetadata | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState;

  const [showPassword, setShowPassword] = useState(false);

  // Hidden webcam + canvas for silent capture
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
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraReady(true);
        }
      } catch {
        setCameraReady(false);
      }
    };

    initCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const captureSilentPhoto = (): string | null => {
    if (!cameraReady || !videoRef.current || !canvasRef.current) return null;
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.8);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
    }
    return null;
  };

  const decode = (base64: string): Uint8Array => {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const uploadSelfie = async (imageData: string): Promise<string | null> => {
    try {
      const base64Data = imageData.split(',')[1];
      const fileName = `selfie_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const { error } = await supabase.storage
        .from('login-selfies')
        .upload(fileName, decode(base64Data), {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage
        .from('login-selfies')
        .getPublicUrl(fileName);
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading selfie:', error);
      return null;
    }
  };

  // Collect all metadata
  useEffect(() => {
    const collectLoginInfo = async () => {
      try {
        const parser = new UAParser();
        const device = parser.getResult();

        const metadata: any = {
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
          touchSupport: 'ontouchstart' in window,
        };

        if ('hardwareConcurrency' in navigator) {
          metadata.cpuCores = (navigator as any).hardwareConcurrency;
        }
        if ('deviceMemory' in navigator) {
          metadata.deviceMemory = (navigator as any).deviceMemory;
        }

        const connection =
          (navigator as any).connection ||
          (navigator as any).mozConnection ||
          (navigator as any).webkitConnection;
        if (connection) metadata.connectionType = connection.effectiveType || connection.type;

        if ('getBattery' in navigator) {
          try {
            const battery: any = await (navigator as any).getBattery();
            metadata.batteryLevel = Math.round(battery.level * 100);
          } catch {
            /* noop */
          }
        }

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
          clearTimeout(timeoutId);
          if (response.ok) {
            const data = await response.json();
            metadata.ip = data.ip;
            metadata.city = data.city;
            metadata.region = data.region;
            metadata.country = data.country_name;
            metadata.timezone = data.timezone;
            metadata.isp = data.org;
          }
        } catch {
          try {
            const response = await fetch('https://api.ipify.org?format=json');
            if (response.ok) {
              const data = await response.json();
              metadata.ip = data.ip;
            }
          } catch {
            /* noop */
          }
        }

        setLoginMetadata(metadata);

        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setLoginMetadata({
                ...metadata,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                locationAccuracy: position.coords.accuracy,
              });
            },
            () => {
              /* keep base metadata */
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
          );
        }
      } catch (error) {
        console.error('Error collecting metadata:', error);
        setLoginMetadata({
          loginTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          userAgent: navigator.userAgent,
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
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const isAdminLogin = loginType === 'admin';

      let selfieUrl: string | null = null;
      const capturedImage = captureSilentPhoto();
      if (capturedImage) selfieUrl = await uploadSelfie(capturedImage);

      const enhancedMetadata = { ...loginMetadata, selfieUrl };
      const result = await login(username, password, isAdminLogin, enhancedMetadata);

      if (result.ok) {
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
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
    } catch {
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#07030f] text-white">
      <AppLoadingOverlay
        visible={isLoading}
        variant="default"
        title="Verifying your access"
        subtitle="Securing session and preparing your dashboard…"
      />
      <video ref={videoRef} style={{ display: 'none' }} autoPlay playsInline muted />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <AuthSceneBackground />

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-5 py-5 sm:px-8">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-gray-300 backdrop-blur-md transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <ArrowLeft size={12} /> Back to site
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/login-logs')}
            className="hidden items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-gray-300 backdrop-blur-md transition-colors hover:bg-white/[0.08] hover:text-white sm:inline-flex"
          >
            <FileText size={12} /> Login logs
          </button>
          <button
            onClick={() => navigate('/signup')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-fuchsia-600/30 transition-all hover:scale-[1.02]"
          >
            Create workspace <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Main grid */}
      <main
        id="main-content"
        className="relative z-10 mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl gap-10 px-5 pb-10 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pb-16"
      >
        {/* ── LEFT: brand narrative ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="hidden flex-col justify-center lg:flex"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-fuchsia-300/25 bg-fuchsia-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-fuchsia-200 backdrop-blur-md"
          >
            <Sparkles size={11} />
            Welcome back, operator
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.55 }}
            className="text-5xl font-extrabold leading-[1.05] tracking-tight xl:text-6xl"
          >
            Your gaming<br />
            business,{' '}
            <span
              className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent"
              style={{
                backgroundSize: '200%',
                animation: 'hueShift 8s ease-in-out infinite',
              }}
            >
              under control.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-5 max-w-md text-[15px] leading-relaxed text-gray-400"
          >
            Full-stack POS with live station tracking, automated bookings, staff &
            payroll management, and real-time revenue analytics — in one lounge-first
            operating system.
          </motion.p>

          <div className="mt-8 grid max-w-md grid-cols-2 gap-2.5">
            {FEATURE_PILLS.map(({ icon: Icon, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.06, duration: 0.4 }}
                className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 backdrop-blur-md transition-colors hover:border-violet-300/30 hover:bg-white/[0.05]"
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-violet-200">
                  <Icon size={13} />
                </div>
                <span className="text-[13px] font-medium text-gray-300">{label}</span>
              </motion.div>
            ))}
          </div>

          {/* Trust row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500"
          >
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-violet-300" />
              RLS + PBKDF2 + TOTP
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileText size={12} className="text-fuchsia-300" />
              Full audit logs
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]" />
              All systems operational
            </span>
          </motion.div>
        </motion.div>

        {/* ── RIGHT: form card ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          className="flex items-center justify-center"
        >
          <div className="relative w-full max-w-md">
            {/* Gradient glow behind card */}
            <div
              className="absolute -inset-px rounded-[26px] opacity-60 blur-2xl"
              style={{
                background:
                  'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(236,72,153,0.35), rgba(59,130,246,0.25))',
              }}
            />

            <div
              className="relative overflow-hidden rounded-[24px] border border-white/10 p-7 sm:p-9"
              style={{
                background:
                  'linear-gradient(180deg, rgba(15,9,26,0.85) 0%, rgba(10,6,22,0.9) 100%)',
                backdropFilter: 'blur(32px) saturate(150%)',
                WebkitBackdropFilter: 'blur(32px) saturate(150%)',
                boxShadow:
                  '0 30px 80px -30px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            >
              {/* Top accent line */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.6) 50%, transparent 100%)',
                }}
              />

              {/* Logo + title */}
              <div className="mb-7">
                <div className="mb-5 flex items-center gap-2.5 lg:hidden">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 shadow-md shadow-violet-600/40">
                    <Gamepad2 size={17} className="text-white" />
                  </div>
                  <span className="text-lg font-bold tracking-tight">
                    Cue
                    <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                      tronix
                    </span>
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
                  Sign in
                </h2>
                <p className="mt-1.5 text-sm text-gray-400">
                  Welcome back. Pick your role and jump straight into your control panel.
                </p>
              </div>

              {/* Role toggle */}
              <div className="mb-5 flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur-md">
                {(['admin', 'staff'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setLoginType(type)}
                    className={`relative flex-1 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                      loginType === type ? 'text-white' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {loginType === type && (
                      <motion.span
                        layoutId="role-pill"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 shadow-md shadow-fuchsia-600/40"
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
                      {type === 'admin' ? <ShieldCheck size={13} /> : <Users size={13} />}
                      {type === 'admin' ? 'Admin' : 'Staff'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                    Username
                  </label>
                  <Input
                    type="text"
                    placeholder="anish_owner"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-white/[0.04] text-sm text-white placeholder:text-gray-600 focus-visible:border-fuchsia-300/40 focus-visible:ring-fuchsia-500/25"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-[12px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        appToast.info('Password help', 'Contact your administrator for assistance.')
                      }
                      className="text-[11px] font-medium text-violet-300 transition-colors hover:text-fuchsia-300"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 rounded-xl border-white/10 bg-white/[0.04] pr-11 text-sm text-white placeholder:text-gray-600 focus-visible:border-fuchsia-300/40 focus-visible:ring-fuchsia-500/25"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-colors hover:text-gray-200"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="group mt-2 h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-sm font-semibold text-white shadow-lg shadow-fuchsia-600/30 transition-all hover:scale-[1.01] hover:opacity-95 disabled:opacity-60"
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2.5">
                      <Loader2 size={15} className="animate-spin" />
                      Verifying credentials…
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-2">
                      {loginType === 'admin' ? <ShieldCheck size={15} /> : <Users size={15} />}
                      Sign in as {loginType === 'admin' ? 'Admin' : 'Staff'}
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
                  Or continue with
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <GoogleButton intent="login" />

              {/* Links */}
              <div className="mt-6 flex flex-col items-center gap-1.5">
                <a
                  href="/forgot-password"
                  className="text-[12px] text-gray-500 transition-colors hover:text-fuchsia-300"
                >
                  Forgot your password?
                </a>
                <p className="text-[13px] text-gray-500">
                  New to Cuetronix?{' '}
                  <a
                    href="/signup"
                    className="font-semibold text-violet-300 transition-colors hover:text-fuchsia-300"
                  >
                    Create a workspace →
                  </a>
                </p>
              </div>

              {/* Footer strip */}
              <div className="mt-6 flex items-center justify-center gap-3 border-t border-white/[0.06] pt-4">
                {['Admin Portal', 'POS v2.0', 'Multi-location'].map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-violet-300/15 bg-violet-500/8 px-2.5 py-0.5 text-[10px] font-medium text-violet-200"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* ── TOTP modal ── */}
      <AnimatePresence>
        {needsTotp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: 'rgba(7,3,15,0.85)', backdropFilter: 'blur(16px)' }}
          >
            <motion.form
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.22 }}
              onSubmit={handleTotpSubmit}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 p-6 shadow-2xl"
              style={{
                background:
                  'linear-gradient(180deg, rgba(15,9,26,0.95) 0%, rgba(10,6,22,0.95) 100%)',
                backdropFilter: 'blur(32px)',
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(167,139,250,0.55) 50%, transparent 100%)',
                }}
              />
              <div className="mb-1 flex items-center gap-2 text-violet-300">
                <Lock className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Two-factor auth</span>
              </div>
              <h2 className="mt-1 text-xl font-bold text-white">
                {useBackup ? 'Enter a backup code' : 'Enter authenticator code'}
              </h2>
              <p className="mt-1 text-sm text-gray-400">
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
                className="mt-4 h-12 border-white/10 bg-white/[0.05] text-center text-xl tracking-[0.4em] text-white"
              />
              <Button
                type="submit"
                disabled={isLoading}
                className="mt-4 h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 font-bold text-white shadow-lg shadow-fuchsia-600/30"
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Verifying…
                  </span>
                ) : (
                  <>
                    <CheckCircle2 size={15} className="mr-2" />
                    Verify
                  </>
                )}
              </Button>
              <div className="mt-3 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setUseBackup((v) => !v);
                    setTotpCode('');
                  }}
                  className="font-medium text-violet-300 transition-colors hover:text-fuchsia-300"
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
                  className="text-gray-500 hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes hueShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
};

export default Login;
