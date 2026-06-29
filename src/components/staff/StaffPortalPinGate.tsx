import React, { useState } from "react";
import { adminFetch } from "@/services/adminFetch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2 } from "lucide-react";

interface StaffPortalPinGateProps {
  displayName?: string | null;
  onVerified: (profile: Record<string, unknown>, portalSessionToken?: string) => void;
  onCancel?: () => void;
  floorClockIns?: Array<{
    staffId: string;
    staffName: string;
    username: string;
    designation: string | null;
    clockIn: string;
    locationId: string | null;
  }>;
}

const StaffPortalPinGate: React.FC<StaffPortalPinGateProps> = ({
  displayName,
  onVerified,
  onCancel,
  floorClockIns = [],
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pin.trim()) {
      setError("Enter your portal PIN.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await adminFetch("/api/admin/staff-portal", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      const json = await res.json();
      if (!json?.ok) {
        setError(json?.error || "Incorrect PIN.");
        return;
      }
      onVerified(json.profile, json.portalSessionToken as string | undefined);
    } catch {
      setError("Could not verify PIN. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md glass-card border-border/50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-2xl gradient-text">My Portal</CardTitle>
          <CardDescription className="text-muted-foreground">
            {displayName
              ? `Hi ${displayName} — enter your portal PIN, or any on-duty staff can enter theirs on this device.`
              : 'Enter your portal PIN to clock in. Works on a shared floor login — no need to switch accounts.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="portal-pin" className="text-primary">
                Portal PIN
              </Label>
              <Input
                id="portal-pin"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit PIN from your manager"
                className="glass-card border-border/50 border-border/50 text-center text-2xl tracking-[0.3em]"
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                Your manager can see this PIN in Settings → User Management.
              </p>
            </div>

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-gradient border-0"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying…
                </>
              ) : (
                "Enter Portal"
              )}
            </Button>

            {onCancel && (
              <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>
                Back to dashboard
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffPortalPinGate;
