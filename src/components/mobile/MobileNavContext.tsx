import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type MobileNavContextValue = {
  sheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  setSheetOpen: (open: boolean) => void;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const openSheet = useCallback(() => setSheetOpen(true), []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const value = useMemo(
    () => ({
      sheetOpen,
      openSheet,
      closeSheet,
      setSheetOpen,
    }),
    [sheetOpen, openSheet, closeSheet],
  );

  return (
    <MobileNavContext.Provider value={value}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) {
    throw new Error("useMobileNav must be used within MobileNavProvider");
  }
  return ctx;
}
