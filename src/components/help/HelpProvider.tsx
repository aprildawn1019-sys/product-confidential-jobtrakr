import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import HelpCenter from "./HelpCenter";

interface HelpContextValue {
  open: boolean;
  articleId: string | null;
  openHelp: (articleId?: string) => void;
  closeHelp: () => void;
}

const HelpContext = createContext<HelpContextValue | null>(null);

export function HelpProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [articleId, setArticleId] = useState<string | null>(null);

  const openHelp = useCallback((id?: string) => {
    setArticleId(id ?? null);
    setOpen(true);
  }, []);

  const closeHelp = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo<HelpContextValue>(
    () => ({ open, articleId, openHelp, closeHelp }),
    [open, articleId, openHelp, closeHelp],
  );

  return (
    <HelpContext.Provider value={value}>
      {children}
      <HelpCenter
        open={open}
        initialArticleId={articleId}
        onOpenChange={(next) => setOpen(next)}
      />
    </HelpContext.Provider>
  );
}

export function useHelp(): HelpContextValue {
  const ctx = useContext(HelpContext);
  if (!ctx) {
    // Soft fallback so individual pages don't crash if rendered outside the provider (e.g. tests).
    return {
      open: false,
      articleId: null,
      openHelp: () => {},
      closeHelp: () => {},
    };
  }
  return ctx;
}
