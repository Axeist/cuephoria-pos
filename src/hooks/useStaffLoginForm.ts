import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { appToast } from "@/lib/appToast";
import { useAuth } from "@/context/AuthContext";
import { hideKeyboard, hapticImpact, isNativePlatform } from "@/utils/capacitor";
import { consumeOauthSearchParams, toastTenantWorkspaceSummary } from "@/lib/authLoginUtils";

export interface TotpPhase {
  isAdminLogin: boolean;
  oauthGoogle?: boolean;
}

export interface UseStaffLoginFormOptions {
  dest?: string;
  pathname: string;
  search: string;
}

export function useStaffLoginForm({ dest = "/dashboard", pathname, search }: UseStaffLoginFormOptions) {
  const navigate = useNavigate();
  const { login, completeOAuthTotp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [totpPhase, setTotpPhase] = useState<TotpPhase | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [manualLoginOpen, setManualLoginOpen] = useState(false);
  const [verificationHint, setVerificationHint] = useState<string | null>(null);

  useEffect(() => {
    if (totpPhase) setManualLoginOpen(true);
  }, [totpPhase]);

  useEffect(() => {
    consumeOauthSearchParams(search, pathname, () => {
      setTotpPhase({ isAdminLogin: true, oauthGoogle: true });
      setManualLoginOpen(true);
    });
  }, [search, pathname]);

  const toggleManualLogin = useCallback(() => {
    if (manualLoginOpen) {
      if (totpPhase) {
        setTotpPhase(null);
        setTotpCode("");
      }
      setManualLoginOpen(false);
      return;
    }
    setManualLoginOpen(true);
  }, [manualLoginOpen, totpPhase]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const trimmed = email.trim();
    if (!totpPhase?.oauthGoogle && (!trimmed || !password)) {
      appToast.error("Enter your email and password.");
      return;
    }

    if (isNativePlatform()) await hideKeyboard();

    setSubmitting(true);
    setVerificationHint(null);
    try {
      if (totpPhase) {
        const tc = totpCode.trim().replace(/\s+/g, "");
        const normalized = tc.replace(/-/g, "");
        const useBackup =
          normalized.length >= 8 && /^[A-Z0-9]+$/i.test(normalized) && !/^\d{6}$/.test(normalized);
        const second = useBackup ? { backupCode: normalized.toUpperCase() } : { totpCode: tc };
        const r = totpPhase.oauthGoogle
          ? await completeOAuthTotp(second)
          : await login(trimmed, password, totpPhase.isAdminLogin, {}, second);
        if (r.ok) {
          toastTenantWorkspaceSummary(r);
          if (isNativePlatform()) await hapticImpact("light");
          setTotpPhase(null);
          setTotpCode("");
          navigate(dest, { replace: true });
          return;
        }
        if (r.requireTotp) {
          appToast.error(r.error || "Invalid 2FA code. Try again.");
          return;
        }
        if (r.emailVerificationRequired) {
          appToast.error(r.error || "Verify your email before signing in.");
          return;
        }
        appToast.error(r.error || "Sign-in failed.");
        return;
      }

      const tryAdmin = await login(trimmed, password, true);
      if (tryAdmin.ok) {
        toastTenantWorkspaceSummary(tryAdmin);
        if (isNativePlatform()) await hapticImpact("light");
        navigate(dest, { replace: true });
        return;
      }
      if (tryAdmin.requireTotp) {
        setTotpPhase({ isAdminLogin: true });
        setTotpCode("");
        return;
      }
      if (tryAdmin.emailVerificationRequired) {
        const msg =
          tryAdmin.error ||
          (tryAdmin.emailSent
            ? "Check your inbox (and spam) for a verification link, then sign in again."
            : "Your email must be verified before you can sign in.");
        setVerificationHint(msg);
        setManualLoginOpen(true);
        appToast.error(msg);
        return;
      }

      const tryStaff = await login(trimmed, password, false);
      if (tryStaff.ok) {
        toastTenantWorkspaceSummary(tryStaff);
        if (isNativePlatform()) await hapticImpact("light");
        navigate(dest, { replace: true });
        return;
      }
      if (tryStaff.requireTotp) {
        setTotpPhase({ isAdminLogin: false });
        setTotpCode("");
        return;
      }
      if (tryStaff.emailVerificationRequired) {
        const msg =
          tryStaff.error ||
          (tryStaff.emailSent
            ? "Check your inbox (and spam) for a verification link, then sign in again."
            : "Your email must be verified before you can sign in.");
        setVerificationHint(msg);
        setManualLoginOpen(true);
        appToast.error(msg);
        return;
      }

      appToast.error(tryStaff.error || tryAdmin.error || "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    submitting,
    totpPhase,
    setTotpPhase,
    totpCode,
    setTotpCode,
    manualLoginOpen,
    verificationHint,
    setVerificationHint,
    toggleManualLogin,
    handlePasswordLogin,
  };
}
