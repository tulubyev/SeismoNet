import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { InsertUser, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, InsertUser>;
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
  } = useQuery<User | null, Error>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        console.log('Fetching current user data');
        const res = await fetch("/api/user", {
          method: "GET",
          headers: {
            "Accept": "application/json"
          },
          credentials: "include" // Important for cookies
        });
        
        console.log('User data response status:', res.status);
        
        if (res.status === 401) {
          console.log('User not authenticated, returning null');
          return null;
        }
        
        const userData = await res.json();
        console.log('User data fetched successfully:', userData);
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
      console.log('Attempting login with credentials:', { username: credentials.username });
      
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(credentials),
        credentials: "include"
      });
      
      console.log('Login response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Login error:', errorData);
        throw new Error(errorData.error || "Login failed");
      }
      
      const userData = await res.json();
      console.log('Login successful, user data:', userData);
      return userData;
    },
    onSuccess: (loggedInUser: User) => {
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

  // Mutation for registration
  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      console.log('Attempting registration with user data:', { 
        username: userData.username,
        email: userData.email,
        role: userData.role
      });
      
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(userData),
        credentials: "include"
      });
      
      console.log('Registration response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Registration error:', errorData);
        throw new Error(errorData.error || "Registration failed");
      }
      
      const newUserData = await res.json();
      console.log('Registration successful, user data:', newUserData);
      return newUserData;
    },
    onSuccess: (newUser: User) => {
      queryClient.setQueryData(["/api/user"], newUser);
      
      // Refresh user data to ensure everything is in sync
      refetchUser();
      
      toast({
        title: "Registration successful",
        description: `Welcome, ${newUser.fullName}!`,
      });
    },
    onError: (error: Error) => {
      console.error('Registration mutation error:', error);
      
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log('Attempting to logout user');
      
      const res = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Accept": "application/json"
        },
        credentials: "include"
      });
      
      console.log('Logout response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Logout error:', errorData);
        throw new Error(errorData.error || "Logout failed");
      }
    },
    onSuccess: () => {
      console.log('Logout successful, clearing user data');
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

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
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