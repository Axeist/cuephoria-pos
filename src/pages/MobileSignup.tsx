import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CUETRONIX_ASSETS } from "@/branding/assets";
import CuephoriaTechAttribution from "@/components/branding/CuephoriaTechAttribution";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import GoogleButton from "@/components/auth/GoogleButton";
import AuthSceneBackground from "@/components/auth/AuthSceneBackground";

const MobileSignup: React.FC = () => {
  const navigate = useNavigate();
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#05060b] text-white"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <AuthSceneBackground />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full overflow-hidden rounded-[24px] border border-white/10 p-6"
          style={{
            background: "linear-gradient(180deg, rgba(15,9,26,0.9) 0%, rgba(10,6,22,0.95) 100%)",
          }}
        >
          <div className="mb-6 flex flex-col items-center text-center">
            <img
              src={CUETRONIX_ASSETS.logoUrl}
              alt={CUETRONIX_ASSETS.logoAlt}
              className="h-10 w-auto max-w-[160px] object-contain"
              draggable={false}
            />
            <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Create workspace</h1>
            <p className="mt-1.5 text-sm text-gray-400">
              14-day free trial · verify with Google
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <Checkbox
              id="mobile-terms"
              checked={acceptedTerms}
              onCheckedChange={(v) => setAcceptedTerms(v === true)}
              className="mt-0.5 border-white/20 data-[state=checked]:bg-violet-600"
            />
            <Label htmlFor="mobile-terms" className="cursor-pointer text-sm leading-snug text-gray-300">
              I agree to Cuetronix&apos;s{" "}
              <Link to="/privacy" className="text-violet-300">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-violet-300">
                Privacy Policy
              </Link>
              .
            </Label>
          </div>

          <div className="mt-6">
            {acceptedTerms ? (
              <GoogleButton intent="signup" />
            ) : (
              <Button
                type="button"
                disabled
                className="h-12 w-full rounded-xl border border-white/10 bg-white/5 text-sm text-zinc-500"
              >
                Accept terms to continue
              </Button>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have access?{" "}
            <button
              type="button"
              onClick={() => navigate("/app/login")}
              className="font-semibold text-violet-300"
            >
              Sign in
            </button>
          </p>

          <div className="mt-6 border-t border-white/[0.06] pt-4">
            <CuephoriaTechAttribution variant="compact" className="text-center" />
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default MobileSignup;
