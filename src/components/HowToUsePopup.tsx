
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { BookOpen, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HowToUsePopupProps {
  open: boolean;
  onClose: () => void;
  onDismiss: () => void;
}

const howToSteps = [
  {
    icon: <BookOpen className="h-6 w-6 text-cuephoria-lightpurple" />,
    label: "Welcome",
    content: "This is the Cuephoria Management App for staff. Here’s a quick guide to get you started!"
  },
  {
    icon: <CheckCircle className="h-6 w-6 text-cuephoria-lightpurple" />,
    label: "POS",
    content: "Go to the POS page to record sales and process transactions for food, drinks, and games. Only staff and admins have access."
  },
  {
    icon: <CheckCircle className="h-6 w-6 text-cuephoria-lightpurple" />,
    label: "Stations",
    content: "Manage gaming stations/tables, start and end game sessions, and track their status in real time."
  },
  {
    icon: <CheckCircle className="h-6 w-6 text-cuephoria-lightpurple" />,
    label: "Products",
    content: "View, add, and update product details and keep an eye on stock levels."
  },
  {
    icon: <CheckCircle className="h-6 w-6 text-cuephoria-lightpurple" />,
    label: "Reports",
    content: "Check daily, weekly, and custom sales/expense reports to stay updated on business trends."
  },
  {
    icon: <CheckCircle className="h-6 w-6 text-cuephoria-lightpurple" />,
    label: "Logout Safely",
    content: "Always use the logout button when leaving the system. You’ll be logged out after 5 hours of inactivity."
  },
];

const HowToUsePopup: React.FC<HowToUsePopupProps> = ({ open, onClose, onDismiss }) => {
  const [step, setStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const atLastStep = step === howToSteps.length - 1;

  const handleNext = () => {
    if (!atLastStep) setStep(step + 1);
    else if (dontShowAgain) onDismiss();
    else onClose();
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleFinalAction = () => {
    if (dontShowAgain) onDismiss();
    else onClose();
  };

  return (
    <Dialog open={open} onOpenChange={open ? onClose : () => {}}>
      <DialogContent className="max-w-lg bg-cuephoria-dark text-white">
        <DialogHeader>
          <DialogTitle className="text-cuephoria-lightpurple flex items-center gap-2">
            <BookOpen className="h-6 w-6" /> Quick Tutorial
          </DialogTitle>
          <DialogDescription>
            {howToSteps[step].icon}
            <span className="ml-2 font-semibold">{howToSteps[step].label}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="text-base mt-3 min-h-[64px]">{howToSteps[step].content}</div>
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={step === 0}
            className="opacity-70"
          >
            Back
          </Button>
          <div className="flex gap-2 items-center">
            {atLastStep && (
              <label className="flex items-center gap-2 select-none cursor-pointer text-sm">
                <input
                  type="checkbox"
                  className="rounded border-cuephoria-lightpurple accent-cuephoria-lightpurple"
                  checked={dontShowAgain}
                  onChange={() => setDontShowAgain(!dontShowAgain)}
                />
                Don't show again
              </label>
            )}
            <Button
              onClick={atLastStep ? handleFinalAction : handleNext}
              className="bg-cuephoria-lightpurple"
            >
              {atLastStep ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
        {atLastStep && (
          <div className="mt-4 text-xs text-cuephoria-lightpurple">
            You can always access this guide from the sidebar menu.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default HowToUsePopup;
