import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  ADMIN_PIN_MAX_LENGTH,
  ADMIN_PIN_MIN_LENGTH,
  useAdminPin,
} from "@/hooks/useAdminPin";

type PinFormValues = { pin: string };

interface PinVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
}

const PinVerificationDialog: React.FC<PinVerificationDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  title = "Enter PIN",
  description = "Enter the PIN to proceed",
}) => {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const { verifyAdminPin, expectedPinLength, loading: pinLoading } = useAdminPin();

  const pinSchema = useMemo(
    () =>
      z.object({
        pin: z
          .string()
          .min(ADMIN_PIN_MIN_LENGTH, {
            message: `PIN must be at least ${ADMIN_PIN_MIN_LENGTH} digits.`,
          })
          .max(ADMIN_PIN_MAX_LENGTH, {
            message: `PIN must be at most ${ADMIN_PIN_MAX_LENGTH} digits.`,
          })
          .regex(/^\d+$/, { message: "PIN must contain only numbers." }),
      }),
    [],
  );

  const form = useForm<PinFormValues>({
    resolver: zodResolver(pinSchema),
    defaultValues: { pin: "" },
  });

  useEffect(() => {
    if (!open) form.reset({ pin: "" });
  }, [open, form]);

  const onSubmit = async (values: PinFormValues) => {
    if (pinLoading) {
      toast({
        title: "Please wait",
        description: "Loading security settings…",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      if (!verifyAdminPin(values.pin)) {
        toast({
          title: "Incorrect PIN",
          description: "The PIN you entered does not match this branch's admin PIN.",
          variant: "destructive",
        });
        return;
      }

      form.reset();
      onOpenChange(false);
      onSuccess();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    form.reset({ pin: "" });
    onOpenChange(false);
  };

  const pinHint =
    expectedPinLength === ADMIN_PIN_MIN_LENGTH
      ? `${ADMIN_PIN_MIN_LENGTH}-digit PIN`
      : `${ADMIN_PIN_MIN_LENGTH}–${ADMIN_PIN_MAX_LENGTH} digit PIN`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[350px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading gradient-text">{title}</DialogTitle>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="pin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PIN</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder={`Enter ${pinHint}`}
                      maxLength={ADMIN_PIN_MAX_LENGTH}
                      disabled={pinLoading || isVerifying}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isVerifying}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-cuephoria-purple to-cuephoria-lightpurple hover:opacity-90"
                disabled={isVerifying || pinLoading}
              >
                {isVerifying ? "Verifying..." : "Verify PIN"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PinVerificationDialog;
