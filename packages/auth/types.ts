import type { SystemDomain, UserRole } from "@yunwu/db";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  systems: SystemDomain[];
  permissions: string[];
}

export interface AuthPermission {
  code: string;
  system: SystemDomain;
}
