import { serverUrl } from "@/constants/serverUrl";
import { connectSocket, disconnectSocket } from "@/socket/socket";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { storage } from "../Utils/storage";

export interface User {
  id: number;
  email: string;
  userName: string | null;
  phoneNo: number | null;
  address: string;
  smartAddress: string;
  profileImageUrl: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  registerUser: (userData: {
    email: string;
    userName: string;
    profileImageUrl?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  loginWithRefreshToken: () => Promise<{ success: boolean; error?: string }>;
  setAuth: (
    newToken: string,
    userData: User,
    newRefreshToken?: string | null
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  getToken: () => Promise<string | null>;
  getRefreshToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refs to prevent race conditions
  const isInitialized = useRef(false);
  const isRefreshingToken = useRef(false);

  const isAuthenticated = !!token && !!user;

  // Load stored token and user data on app start (only once)
  useEffect(() => {
    if (!isInitialized.current) {
      console.log("[Auth] Starting initialization...");
      isInitialized.current = true;
      loadStoredAuth();
    }
  }, []);

  const loadStoredAuth = async () => {
    try {
      console.log("[Auth] Loading tokens from storage...");
      const storedToken = await storage.getToken();
      const storedRefreshToken = await storage.getRefreshToken?.();
      const storedUser = await storage.getUser();

      if (storedToken) {
        console.log("[Auth] Token found. Hydrating state.");
        setToken(storedToken);
        if (storedRefreshToken) setRefreshToken(storedRefreshToken);

        if (storedUser) {
          console.log("[Auth] User found in storage.");
          setUser(storedUser);
          // Set loading to false IMMEDIATELY since we have user data
          setIsLoading(false);

          // Background refresh (don't await)
          console.log("[Auth] Background refreshing user data...");
          fetchUserData(storedToken).catch(async (error) => {
            console.log("[Auth] Token expired or fetch failed, trying refresh token...");
            if (storedRefreshToken && !isRefreshingToken.current) {
              await loginWithRefreshToken();
            }
          });
        } else {
          console.log("[Auth] Token exists but no user data. Fetching profile...");
          try {
            await fetchUserData(storedToken);
          } catch (e) {
            console.error("[Auth] Failed to fetch profile with existing token:", e);
            if (storedRefreshToken && !isRefreshingToken.current) {
              await loginWithRefreshToken();
            }
          }
          // Set loading false after fetch attempt
          setIsLoading(false);
        }
      } else {
        console.log("[Auth] No token found in storage.");
        setIsLoading(false);
      }
    } catch (error) {
      console.error("[Auth] Critical error during storage load:", error);
      // Don't await clearAuth - just set loading false to unblock the app
      clearAuth().catch(() => {});
      setIsLoading(false);
    } finally {
      // Safety net: ALWAYS set loading to false after 3 seconds max
      setTimeout(() => {
        if (isLoading) {
          console.warn("[Auth] Safety timeout - forcing isLoading to false");
          setIsLoading(false);
        }
      }, 3000);
    }
  };

  const fetchUserData = async (authToken: string) => {
    try {
      const response = await fetch(`${serverUrl}/user`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userData = data.user;
        setUser(userData);
        await storage.setUser(userData);
      } else if (response.status === 401) {
        // Token expired
        throw new Error("Token expired");
      } else {
        throw new Error("Failed to fetch user data");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      throw error;
    }
  };

  const registerUser = async (userData: {
    email: string;
    userName: string;
    profileImageUrl?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${serverUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        const {
          token: newToken,
          user: newUser,
          refreshToken: newRefreshToken,
        } = data;

        await storage.setToken(newToken);
        await storage.setUser(newUser);
        if (newRefreshToken) await storage.setRefreshToken?.(newRefreshToken);
        await connectSocket(newToken);

        setToken(newToken);
        setUser(newUser);
        if (newRefreshToken) setRefreshToken(newRefreshToken);

        return { success: true };
      } else {
        return {
          success: false,
          error: data.message || "Registration failed. Please try again.",
        };
      }
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        error: "An error occurred. Please try again.",
      };
    }
  };

  const loginWithRefreshToken = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    // Prevent multiple simultaneous refresh attempts
    if (isRefreshingToken.current) {
      return { success: false, error: "Refresh already in progress" };
    }

    isRefreshingToken.current = true;

    try {
      const storedRefreshToken = await storage.getRefreshToken?.();
      if (!storedRefreshToken) {
        return { success: false, error: "No refresh token available" };
      }

      const response = await fetch(`${serverUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      const data = await response.json();

      if (response.ok) {
        const {
          token: newToken,
          user: userData,
          refreshToken: newRefreshToken,
        } = data;

        await storage.setToken(newToken);
        await storage.setUser(userData);
        await connectSocket(newToken);
        if (newRefreshToken) await storage.setRefreshToken?.(newRefreshToken);

        setToken(newToken);
        setUser(userData);
        if (newRefreshToken) setRefreshToken(newRefreshToken);

        return { success: true };
      } else {
        // Refresh token invalid - clear auth
        await clearAuth();
        return {
          success: false,
          error: "Session expired. Please sign in again.",
        };
      }
    } catch (error) {
      console.error("Refresh token error:", error);
      return {
        success: false,
        error: "An error occurred. Please try again.",
      };
    } finally {
      isRefreshingToken.current = false;
    }
  };

  const clearAuth = async () => {
    await storage.removeToken();
    await storage.removeRefreshToken?.();
    await storage.removeUser();
    await disconnectSocket();
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  const logout = async () => {
    try {
      await clearAuth();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      storage.setUser(updatedUser);
    }
  };

  const refreshUser = async () => {
    if (token) {
      try {
        await fetchUserData(token);
      } catch (error) {
        // If fetch fails, try refresh token
        if (refreshToken && !isRefreshingToken.current) {
          await loginWithRefreshToken();
        }
      }
    }
  };

  const setAuth = async (
    newToken: string,
    userData: User,
    newRefreshToken?: string | null
  ) => {
    await storage.setToken(newToken);
    await storage.setUser(userData);
    await connectSocket(newToken);
    if (newRefreshToken) await storage.setRefreshToken?.(newRefreshToken);

    setToken(newToken);
    setUser(userData);
    if (newRefreshToken) setRefreshToken(newRefreshToken);

    // Background refresh
    fetchUserData(newToken).catch(() => {});
  };

  const getToken = async () => {
    return token ?? (await storage.getToken());
  };

  const getRefreshToken = async () => {
    if (storage.getRefreshToken) {
      return refreshToken ?? (await storage.getRefreshToken());
    }
    return null;
  };

  const value: AuthContextType = {
    user,
    token,
    refreshToken,
    isLoading,
    isAuthenticated,
    registerUser,
    loginWithRefreshToken,
    setAuth,
    logout,
    updateUser,
    refreshUser,
    getToken,
    getRefreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};