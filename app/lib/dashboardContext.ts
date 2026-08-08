/*
  Context handed down from the dashboard layout route to every tab.

  The layout has already established that a user exists and what their role
  is, so tabs get a non-null `user` and can skip defensive null checks.
*/

import { useOutletContext } from "react-router";
import type { User } from "~/auth";
import type { Role } from "./roles";

export type DashboardContext = {
  user: User;
  role: Role;
  /** Re-reads the profile row after a role or category change. */
  refreshUser: () => Promise<void>;
};

export function useDashboard(): DashboardContext {
  return useOutletContext<DashboardContext>();
}
