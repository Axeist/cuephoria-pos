import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { handoffToNativeApp } from "@/utils/nativeOAuth";
import { hapticImpact, isNativePlatform } from "@/utils/capacitor";

/**
 * OAuth bridge: Custom Tab lands here with handoff=1 → deep link back to app.
 * Main WebView lands here after deep link → exchange ticket for session cookies.
 */
const AuthAppComplete: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mt = searchParams.get("mt");
    const handoff = searchParams.get("handoff");

    if (!mt) {
      navigate(isNativePlatform() ? "/app/login" : "/login", { replace: true });
      return;
    }

    if (handoff === "1") {
      handoffToNativeApp(mt);
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/mobile/exchange", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mt }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          redirect?: string;
          error?: string;
        };
        if (res.ok && json.ok && json.redirect) {
          if (isNativePlatform()) await hapticImpact("light");
          navigate(json.redirect, { replace: true });
          return;
        }
        setError(json.error || "Sign-in handoff failed.");
        window.setTimeout(() => {
          navigate("/app/login", { replace: true });
        }, 2500);
      } catch {
        setError("Network error during sign-in.");
        window.setTimeout(() => navigate("/app/login", { replace: true }), 2500);
      }
    })();
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05060b] text-white">
      <div className="text-center px-6">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-fuchsia-400" />
        <p className="mt-4 text-sm text-gray-400">
          {error || "Completing sign-in…"}
        </p>
      </div>
    </div>
  );
};

export default AuthAppComplete;
