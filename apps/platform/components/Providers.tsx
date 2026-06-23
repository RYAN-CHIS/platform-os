"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

/**
 * PlatformProvider — wraps Session + Platform context
 *
 * Currently just SessionProvider. Extended later for Platform context.
 */
export default function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
