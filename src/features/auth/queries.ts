import { useMutation, useQuery } from "@tanstack/react-query";

import {
  getMyProfile,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  type SignInWithPasswordInput,
  type SignUpWithPasswordInput,
} from "./api";

export const authKeys = {
  profile: (userId: string) => ["profile", { userId }] as const,
};

export function useMyProfileQuery(userId?: string) {
  return useQuery({
    queryKey: userId ? authKeys.profile(userId) : ["profile", { userId: null }] as const,
    queryFn: () => getMyProfile(userId!),
    enabled: !!userId,
  });
}

export function useSignInWithPasswordMutation() {
  return useMutation({
    mutationFn: (input: SignInWithPasswordInput) => signInWithPassword(input),
  });
}

export function useSignUpWithPasswordMutation() {
  return useMutation({
    mutationFn: (input: SignUpWithPasswordInput) => signUpWithPassword(input),
  });
}

export function useSignOutMutation() {
  return useMutation({
    mutationFn: () => signOut(),
  });
}

