import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { InsertUser, SessionUser } from "@shared/schema";
import { apiJson, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SessionUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SessionUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  customer: SessionUser["customer"] | null;
  customerScope: SessionUser["customerScope"] | null;
  setCustomer: (customerId: number | null) => Promise<void>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Query to fetch current user
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser
  } = useQuery<SessionUser | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/user", {
          method: "GET",
          headers: {
            "Accept": "application/json"
          },
          credentials: "include" // Important for cookies
        });
        
        
        if (res.status === 401) {
          return null;
        }
        
        const userData = await res.json();
        return userData;
      } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation for login
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(credentials),
        credentials: "include"
      });
      
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Login error:', errorData);
        throw new Error(errorData.error || "Login failed");
      }
      
      const userData = await res.json();
      return userData;
    },
    onSuccess: (loggedInUser: SessionUser) => {
      // Drop everything the previous session cached: a role switch must not
      // leave another user's rows visible until the next refetch.
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], loggedInUser);
      
      // Refresh user data to ensure everything is in sync
      refetchUser();
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${loggedInUser.fullName}!`,
      });
    },
    onError: (error: Error) => {
      console.error('Login mutation error:', error);
      
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      
      const res = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Accept": "application/json"
        },
        credentials: "include"
      });
      
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Logout error:', errorData);
        throw new Error(errorData.error || "Logout failed");
      }
    },
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], null);

      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    },
    onError: (error: Error) => {
      console.error('Logout mutation error:', error);
      
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setCustomer = async (customerId: number | null) => {
    const next = await apiJson<SessionUser>("PUT", "/api/session/customer", { customerId });
    // A different customer means different rows behind every cached query key.
    queryClient.clear();
    queryClient.setQueryData(["/api/user"], next);
    refetchUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        customer: user?.customer ?? null,
        customerScope: user?.customerScope ?? null,
        setCustomer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}