import { createContext, useContext } from 'react';

// Minimal navigation: three tabs plus a stack of pushed screens rendered on top.
// Keeps the dependency list small (no react-navigation) and the APK lean.
export const NavContext = createContext(null);

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used inside NavContext');
  return ctx;
}
