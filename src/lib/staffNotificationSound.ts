import type { StaffNotification } from '@/types/staffNotification.types';
import {
  isBookingStaffNotification,
  isSessionStaffNotification,
  isPlatformStaffNotification,
} from '@/types/staffNotification.types';

type ToneOpts = {
  type?: OscillatorType;
  volume?: number;
  attack?: number;
};

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedCtx || sharedCtx.state === 'closed') {
      sharedCtx = new Ctx();
    }
    if (sharedCtx.state === 'suspended') {
      void sharedCtx.resume();
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

function playNote(
  ctx: AudioContext,
  start: number,
  frequency: number,
  duration: number,
  opts: ToneOpts = {},
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(frequency, start);
  const vol = opts.volume ?? 0.28;
  const attack = opts.attack ?? 0.006;
  gain.gain.setValueAtTime(0.001, start);
  gain.gain.exponentialRampToValueAtTime(vol, start + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.start(start);
  osc.stop(start + duration + 0.04);
}

function playNoiseHit(ctx: AudioContext, start: number, duration: number, volume: number, freq = 4200): void {
  const samples = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, samples, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (samples * 0.12));
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 0.9;
  const gain = ctx.createGain();
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  source.start(start);
  source.stop(start + duration + 0.02);
}

/** Cash-register style ka-ching for online-paid bookings. */
function playPaidBookingSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;

  playNoiseHit(ctx, t, 0.04, 0.22, 2800);
  playNote(ctx, t, 880, 0.07, { type: 'square', volume: 0.14 });
  playNote(ctx, t + 0.05, 1760, 0.09, { type: 'triangle', volume: 0.32 });
  playNote(ctx, t + 0.05, 3520, 0.11, { type: 'sine', volume: 0.18 });
  playNoiseHit(ctx, t + 0.07, 0.14, 0.28, 5200);
  playNote(ctx, t + 0.08, 2637, 0.22, { type: 'triangle', volume: 0.26 });
  playNote(ctx, t + 0.1, 4186, 0.28, { type: 'sine', volume: 0.14 });
}

/** Warm doorbell chime for venue / unpaid bookings. */
function playUnpaidBookingSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;

  playNote(ctx, t, 392, 0.55, { type: 'triangle', volume: 0.22 });
  playNote(ctx, t + 0.14, 523.25, 0.55, { type: 'sine', volume: 0.26 });
  playNote(ctx, t + 0.28, 659.25, 0.7, { type: 'sine', volume: 0.3 });
  playNote(ctx, t + 0.28, 783.99, 0.55, { type: 'triangle', volume: 0.12 });
}

function playSessionEndingSoonSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;

  playNote(ctx, t, 880, 0.45, { type: 'sine', volume: 0.22 });
  playNote(ctx, t + 0.18, 1046.5, 0.55, { type: 'triangle', volume: 0.2 });
}

function playSessionOverdueSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;

  for (let i = 0; i < 3; i++) {
    const offset = i * 0.22;
    playNote(ctx, t + offset, 620, 0.14, { type: 'square', volume: 0.2 });
    playNote(ctx, t + offset + 0.05, 740, 0.16, { type: 'triangle', volume: 0.24 });
  }
}

function playUnsettledCheckoutSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;

  playNote(ctx, t, 740, 0.2, { type: 'triangle', volume: 0.24 });
  playNote(ctx, t + 0.12, 988, 0.28, { type: 'sine', volume: 0.26 });
  playNote(ctx, t + 0.24, 880, 0.35, { type: 'sine', volume: 0.2 });
}

function playPlatformInfoSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;

  playNote(ctx, t, 880, 0.22, { type: 'sine', volume: 0.24 });
  playNote(ctx, t + 0.1, 1174.66, 0.28, { type: 'sine', volume: 0.2 });
}

function playPlatformSuccessSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;

  playNote(ctx, t, 523.25, 0.25, { type: 'sine', volume: 0.22 });
  playNote(ctx, t + 0.1, 659.25, 0.25, { type: 'sine', volume: 0.24 });
  playNote(ctx, t + 0.2, 783.99, 0.35, { type: 'triangle', volume: 0.28 });
}

function playPlatformWarningSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;

  playNote(ctx, t, 740, 0.18, { type: 'triangle', volume: 0.28 });
  playNote(ctx, t + 0.14, 880, 0.18, { type: 'triangle', volume: 0.28 });
  playNote(ctx, t + 0.32, 740, 0.22, { type: 'square', volume: 0.22 });
}

function playPlatformCriticalSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const t = ctx.currentTime;

  for (let i = 0; i < 4; i++) {
    const offset = i * 0.18;
    playNote(ctx, t + offset, 520, 0.1, { type: 'square', volume: 0.26 });
    playNote(ctx, t + offset + 0.08, 880, 0.12, { type: 'square', volume: 0.3 });
  }
}

export function playStaffNotificationSound(notification: StaffNotification): void {
  if (isBookingStaffNotification(notification)) {
    if (notification.isPaid) {
      playPaidBookingSound();
    } else {
      playUnpaidBookingSound();
    }
    return;
  }

  if (isSessionStaffNotification(notification)) {
    switch (notification.alertType) {
      case 'overdue_active':
        playSessionOverdueSound();
        return;
      case 'unsettled_checkout':
        playUnsettledCheckoutSound();
        return;
      case 'ending_soon':
      default:
        playSessionEndingSoonSound();
        return;
    }
  }

  if (isPlatformStaffNotification(notification)) {
    switch (notification.severity) {
      case 'critical':
        playPlatformCriticalSound();
        return;
      case 'warning':
        playPlatformWarningSound();
        return;
      case 'success':
        playPlatformSuccessSound();
        return;
      case 'info':
      default:
        playPlatformInfoSound();
        return;
    }
  }
}
