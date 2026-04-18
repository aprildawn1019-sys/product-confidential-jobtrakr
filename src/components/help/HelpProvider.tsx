import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import HelpCenter from "./HelpCenter";

interface HelpContextValue {
  open: boolean;
  articleId: string | null;
  routeAtOpen: string | null;
  openHelp: (articleId?: string) => void;
  closeHelp: () => void;
}

const HelpContext = createContext<HelpContextValue | null>(null);

export function HelpProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [articleId, setArticleId] = useState<string | null>(null);
  const [routeAtOpen, setRouteAtOpen] = useState<string | null>(null);
  const location = useLocation();

  const openHelp = useCallback(
    (id?: string) => {
      setArticleId(id ?? null);
      // Only capture the route when no specific article is requested,
      // so we can pre-filter to route-relevant articles.
      setRouteAtOpen(id ? null : location.pathname);
      setOpen(true);
    },
    [location.pathname],
  );

  const closeHelp = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo<HelpContextValue>(
    () => ({ open, articleId, routeAtOpen, openHelp, closeHelp }),
    [open, articleId, routeAtOpen, openHelp, closeHelp],
  );

  return (
    <HelpContext.Provider value={value}>
      {children}
      <HelpCenter
        open={open}
        initialArticleId={articleId}
        initialRoute={routeAtOpen}
        onOpenChange={(next) => setOpen(next)}
      />
    </HelpContext.Provider>
  );
}

export function useHelp(): HelpContextValue {
  const ctx = useContext(HelpContext);
  if (!ctx) {
    return {
      open: false,
      articleId: null,
      routeAtOpen: null,
      openHelp: () => {},
      closeHelp: () => {},
    };
  }
  return ctx;
}
