import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
  scope?: "customer" | "owner";
};

export function useAuth(options?: UseAuthOptions) {
  // Unauthenticated protected routes redirect to the first-party DJDC login page.
  const { redirectOnUnauthenticated = false, redirectPath, scope = "customer" } = options ?? {};
  const utils = trpc.useUtils();

  const customerMeQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: scope === "customer",
  });
  const ownerMeQuery = trpc.auth.ownerMe.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    enabled: scope === "owner",
  });
  const meQuery = scope === "owner" ? ownerMeQuery : customerMeQuery;

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });
  const ownerLogoutMutation = trpc.auth.ownerLogout.useMutation({
    onSuccess: () => {
      utils.auth.ownerMe.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      if (scope === "owner") await ownerLogoutMutation.mutateAsync(); else await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      // Clear the Preview auto-login token mirrored into sessionStorage, so
      // header-based sessions (Safari ITP / WebView) are logged out too. The
      // backend cookie is cleared by the logout mutation.
      try {
        sessionStorage.removeItem("manus-cookie");
      } catch {}
      if (scope === "owner") {
        utils.auth.ownerMe.setData(undefined, null);
        await utils.auth.ownerMe.invalidate();
      } else {
        utils.auth.me.setData(undefined, null);
        await utils.auth.me.invalidate();
      }
    }
  }, [logoutMutation, ownerLogoutMutation, scope, utils]);

  const state = useMemo(() => {
    localStorage.setItem(
      scope === "owner" ? "djdc-owner-user-info" : "manus-runtime-user-info",
      JSON.stringify(meQuery.data)
    );
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending || ownerLogoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? ownerLogoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error, logoutMutation.isPending, ownerLogoutMutation.error, ownerLogoutMutation.isPending, scope,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending || ownerLogoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    if (redirectPath) {
      window.location.href = redirectPath;
    } else {
      window.location.href = scope === "owner" ? "/owner/login" : "/login";
    }
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending, ownerLogoutMutation.isPending, scope,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
