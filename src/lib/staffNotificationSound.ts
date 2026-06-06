import type { StaffNotification } from '@/types/staffNotification.types';
import { isBookingStaffNotification, isSessionStaffNotification, isPlatformStaffNotification } from '@/types/staffNotification.types';

function playTone(frequency: number, durationMs = 320, volume = 0.28): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    const end = audioContext.currentTime + durationMs / 1000;
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, end);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(end);
  } catch {
    /* ignore */
  }
}

export function playStaffNotificationSound(notification: StaffNotification): void {
  if (isPlatformStaffNotification(notification)) {
    playTone(880, 220, 0.32);
    window.setTimeout(() => playTone(1040, 260, 0.28), 160);
    window.setTimeout(() => playTone(760, 200, 0.22), 340);
    return;
  }

  if (isBookingStaffNotification(notification)) {
    playTone(notification.isPaid ? 1000 : 640, 300, 0.3);
    return;
  }

  if (isSessionStaffNotification(notification)) {
    if (notification.alertType === 'overdue_active') {
      playTone(520, 280, 0.32);
      window.setTimeout(() => playTone(680, 240, 0.26), 180);
      return;
    }
    playTone(760, 340, 0.28);
  }
}
