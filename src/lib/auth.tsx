import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({ session: null, user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      try {
        const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
          setSession(next);
          setLoading(false);
          if (event === "SIGNED_IN" || event === "USER_UPDATED") {
            queryClient.invalidateQueries();
          }
          if (event === "SIGNED_OUT") {
            queryClient.clear();
          }
        });
        unsubscribe = () => sub.subscription.unsubscribe();

        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      } catch (error) {
        console.error("Supabase auth initialization failed", error);
      } finally {
        setLoading(false);
      }
    })();

    return () => unsubscribe?.();
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useIsAdmin() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin",
      });
      if (error) return false;
      return !!data;
    },
  });
  return !!data;
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as Profile;
      const { data: created, error: insertError } = await supabase
        .from("profiles")
        .insert({ id: user!.id, username: user!.email?.split("@")[0] ?? null })
        .select("*")
        .single();
      if (insertError) throw insertError;
      return created as Profile;
    },
  });
}
