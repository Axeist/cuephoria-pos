import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type CafeMobileNavContextValue = {
  sheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  setSheetOpen: (open: boolean) => void;
};

const CafeMobileNavContext = createContext<CafeMobileNavContextValue | null>(null);

export function CafeMobileNavProvider({ children }: { children: React.ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const openSheet = useCallback(() => setSheetOpen(true), []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const value = useMemo(
    () => ({ sheetOpen, openSheet, closeSheet, setSheetOpen }),
    [sheetOpen, openSheet, closeSheet],
  );

  return (
    <CafeMobileNavContext.Provider value={value}>
      {children}
    </CafeMobileNavContext.Provider>
  );
}

export function useCafeMobileNav() {
  const ctx = useContext(CafeMobileNavContext);
  if (!ctx) {
    throw new Error("useCafeMobileNav must be used within CafeMobileNavProvider");
  }
  return ctx;
}
