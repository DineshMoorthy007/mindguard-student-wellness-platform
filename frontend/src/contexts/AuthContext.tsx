import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api, { setAccessToken, getAccessToken } from "../services/api";

export type UserRole = "STUDENT" | "COUNSELOR" | "ADMIN";

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Decode simple base64 JWT payload to get user metadata without full backend querying
function decodeTokenPayload(token: string): any {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const handleSessionExpired = () => {
    setUser(null);
    setAccessToken(null);
    setIsLoading(false);
  };

  // Perform silent refresh on page load to restore session from HttpOnly cookie
  const initSession = async () => {
    try {
      const response = await api.post("/auth/refresh");
      const { access_token } = response.data;
      setAccessToken(access_token);
      
      const payload = decodeTokenPayload(access_token);
      if (payload && payload.sub) {
        setUser({
          id: payload.sub,
          email: payload.email || "", // Fallback or we can query profiles if needed
          role: payload.role as UserRole
        });
      }
    } catch (e) {
      // Session cookie is invalid or not set; ignore and prompt login
      setAccessToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initSession();

    // Listen to session expiry signals dispatched from Axios response interceptor
    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => {
      window.removeEventListener("auth:session-expired", handleSessionExpired);
    };
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", { email, password });
      const { access_token } = response.data;
      setAccessToken(access_token);

      const payload = decodeTokenPayload(access_token);
      if (payload) {
        const loggedUser: User = {
          id: payload.sub,
          email: email,
          role: payload.role as UserRole
        };
        setUser(loggedUser);
        return loggedUser;
      }
      throw new Error("Invalid access token payload.");
    } catch (error) {
      setAccessToken(null);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, role: UserRole) => {
    try {
      await api.post("/auth/register", { email, password, role });
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      // To perform a clean logout, we clear tokens and cookies
      setAccessToken(null);
      setUser(null);
      // Optional: If there's an API route for logout, trigger it
      // For now, removing the access token and deleting local memory clears the session.
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
