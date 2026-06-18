// Customer Authentication Utilities

export interface CustomerSession {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  isFirstLogin: boolean;
  loyaltyPoints: number;
  isMember: boolean;
}

// Storage keys
const CUSTOMER_STORAGE_KEY = 'cuephoria_customer_session';

/**
 * Store customer session in localStorage
 */
export const setCustomerSession = (customer: CustomerSession): void => {
  localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer));
};

/**
 * Get customer session from localStorage
 */
export const getCustomerSession = (): CustomerSession | null => {
  const stored = localStorage.getItem(CUSTOMER_STORAGE_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored) as CustomerSession;
  } catch (error) {
    console.error('Error parsing customer session:', error);
    return null;
  }
};

/**
 * Clear customer session (logout)
 */
export const clearCustomerSession = (): void => {
  localStorage.removeItem(CUSTOMER_STORAGE_KEY);
};

/**
 * Check if customer is logged in
 */
export const isCustomerLoggedIn = (): boolean => {
  return getCustomerSession() !== null;
};

/**
 * Normalize phone number (remove non-digits)
 */
export const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

/**
 * Validate Indian phone number
 */
export const validatePhoneNumber = (phone: string): { valid: boolean; error?: string } => {
  const normalized = normalizePhoneNumber(phone);
  
  if (normalized.length !== 10) {
    return { valid: false, error: 'Phone number must be exactly 10 digits' };
  }

  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(normalized)) {
    return { valid: false, error: 'Please enter a valid Indian mobile number (starting with 6, 7, 8, or 9)' };
  }

  return { valid: true };
};

/**
 * Generate default password for customer (CUE + phone number)
 */
export const generateDefaultPassword = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  return `CUE${normalized}`;
};

/**
 * Hash password using Web Crypto API (for client-side hashing before sending to server)
 * Note: This is just for basic client-side validation. Server should do proper bcrypt hashing.
 */
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

/**
 * Compare password with hash (simple comparison for client-side)
 * Note: Proper verification should be done on the server side
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  // For now, we'll send the password to server for verification
  // This is a placeholder - actual comparison happens server-side
  return true;
};

/**
 * Format time ago (e.g., "2 hours ago")
 */
export const timeAgo = (date: Date | string): string => {
  const now = new Date();
  const past = new Date(date);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
  return `${Math.floor(seconds / 2592000)} months ago`;
};

/**
 * Format date for display
 */
export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Format time for display
 */
export const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

/**
 * Calculate countdown to a future time
 */
export const getCountdown = (targetTime: Date | string): string => {
  const now = new Date();
  const target = new Date(targetTime);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return 'Now';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

/**
 * Get greeting based on time of day
 */
export const getGreeting = (): string => {
  const hour = new Date().getHours();
  
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
};

/**
 * Get greeting emoji based on time of day
 */
export const getGreetingEmoji = (): string => {
  const hour = new Date().getHours();
  
  if (hour < 12) return '🌅';
  if (hour < 17) return '☀️';
  if (hour < 21) return '🌙';
  return '🌃';
};
