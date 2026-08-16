"use client";

import { useAuthContext, type Profile } from "@/providers/AuthProvider";

export type { Profile };

export function useAuth() {
  return useAuthContext();
}
