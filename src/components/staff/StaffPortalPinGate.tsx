import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2 } from "lucide-react";

interface StaffPortalPinGateProps {
  displayName?: string | null;
  onVerified: (profile: Record<string, unknown>) => void;
  onCancel?: () => void;
}

const StaffPortalPinGate: React.FC<StaffPortalPinGateProps> = ({
  displayName,
  onVerified,
  onCancel,
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
      const res = await fetch("/api/admin/staff-portal", {
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
      onVerified(json.profile);
    } catch {
      setError("Could not verify PIN. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md bg-cuephoria-dark border-cuephoria-purple/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-cuephoria-purple/20">
            <KeyRound className="h-7 w-7 text-cuephoria-lightpurple" />
          </div>
          <CardTitle className="text-2xl gradient-text">Staff Portal</CardTitle>
          <CardDescription className="text-muted-foreground">
            {displayName
              ? `Hi ${displayName}, enter your portal PIN to continue.`
              : "Enter your portal PIN to open your attendance and requests."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="portal-pin" className="text-cuephoria-lightpurple">
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
                className="bg-cuephoria-darker border-cuephoria-purple/20 text-center text-2xl tracking-[0.3em]"
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
              className="w-full bg-cuephoria-purple hover:bg-cuephoria-lightpurple"
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
