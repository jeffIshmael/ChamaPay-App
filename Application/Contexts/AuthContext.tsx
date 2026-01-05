import { serverUrl } from "@/constants/serverUrl";
import { chain, client } from "@/constants/thirdweb";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { useActiveWallet, useAutoConnect, useConnect } from "thirdweb/react";
import { inAppWallet } from "thirdweb/wallets";
import { storage } from "../Utils/storage";
import { connectSocket, disconnectSocket } from "@/socket/socket";

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
  isWalletConnected: boolean;
  connectWallet: () => Promise<{ success: boolean; error?: string }>;
  disconnectWallet: () => Promise<void>;
  forceDisconnectWallet: () => Promise<void>;
  registerUser: (
    username: string
  ) => Promise<{ success: boolean; error?: string }>;
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

  const { connect } = useConnect();
  const activeWallet = useActiveWallet();

  // Auto-connect wallet on app start
  const { data: autoConnected, isLoading: isAutoConnecting } = useAutoConnect({
    client,
    wallets: [inAppWallet()],
    onConnect: async (wallet) => {
      console.log("Auto-connected wallet:", wallet);
      await storeWalletConnection(wallet);
    },
    timeout: 10000,
  });

  const isAuthenticated = !!token && !!user;
  const isWalletConnected = !!activeWallet;

  // Load stored token and user data on app start (only once)
  useEffect(() => {
    if (!isInitialized.current && !isAutoConnecting) {
      isInitialized.current = true;
      loadStoredAuth();
    }
  }, [isAutoConnecting]);

  // Update loading state
  useEffect(() => {
    if (!isAutoConnecting && isInitialized.current) {
      setIsLoading(false);
    }
  }, [isAutoConnecting]);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await storage.getToken();
      const storedRefreshToken = await storage.getRefreshToken?.();
      const storedUser = await storage.getUser();

      if (storedToken) {
        setToken(storedToken);
        if (storedRefreshToken) setRefreshToken(storedRefreshToken);

        if (storedUser) {
          setUser(storedUser);
          // Silently refresh user data in background
          fetchUserData(storedToken).catch(async (error) => {
            console.log("Token expired, attempting refresh");
            if (storedRefreshToken && !isRefreshingToken.current) {
              await loginWithRefreshToken();
            }
          });
        } else {
          // Token exists but no user data
          try {
            await fetchUserData(storedToken);
          } catch {
            if (storedRefreshToken && !isRefreshingToken.current) {
              await loginWithRefreshToken();
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading stored auth:", error);
      // Only clear auth data, not wallet connection
      await clearAuthOnly();
    }
  };

  // Monitor wallet connection changes
  useEffect(() => {
    if (activeWallet) {
      storeWalletConnection(activeWallet);
    }
  }, [activeWallet]);

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
        // Token expired - don't clear everything, let refresh token handle it
        throw new Error("Token expired");
      } else {
        throw new Error("Failed to fetch user data");
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      throw error; // Re-throw to let caller handle
    }
  };

  const connectWallet = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    try {
      const wallet = inAppWallet({
        executionMode: {
          mode: "EIP7702",
          sponsorGas: false,
        },
      });
      await connect(wallet);
      await storeWalletConnection(wallet);
      return { success: true };
    } catch (error) {
      console.error("Wallet connection error:", error);
      return {
        success: false,
        error: "Failed to connect wallet. Please try again.",
      };
    }
  };

  const disconnectWallet = async () => {
    try {
      // Only disconnect if user is not authenticated
      if (isAuthenticated) {
        console.warn("Cannot disconnect wallet while user is authenticated");
        return;
      }

      if (activeWallet) {
        await activeWallet.disconnect();
      }
      await storage.removeWalletConnection();
    } catch (error) {
      console.error("Wallet disconnection error:", error);
    }
  };

  const registerUser = async (
    username: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!activeWallet) {
        return { success: false, error: "Wallet not connected" };
      }

      const walletAddress = activeWallet.getAccount()?.address;
      if (!walletAddress) {
        return { success: false, error: "Could not get wallet address" };
      }

      const response = await fetch(`${serverUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          walletAddress,
        }),
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
        if (newRefreshToken) await storage.setRefreshToken?.(newRefreshToken);

        setToken(newToken);
        setUser(userData);
        if (newRefreshToken) setRefreshToken(newRefreshToken);

        return { success: true };
      } else {
        return {
          success: false,
          error: data.error || "Registration failed. Please try again.",
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
        // Refresh token invalid - clear auth but keep wallet
        await clearAuthOnly();
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

  // Helper to clear only auth data, keeping wallet connected
  const clearAuthOnly = async () => {
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
      await clearAuthOnly();
      // Wallet stays connected for re-authentication
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const forceDisconnectWallet = async () => {
    try {
      // First clear auth
      await clearAuthOnly();
      
      // Then disconnect wallet
      if (activeWallet) {
        await activeWallet.disconnect();
      }
      await storage.removeWalletConnection();
    } catch (error) {
      console.error("Force wallet disconnection error:", error);
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

  const storeWalletConnection = async (wallet: any) => {
    try {
      if (wallet) {
        const walletAddress = wallet.getAccount()?.address;
        if (walletAddress) {
          const walletData = {
            address: walletAddress,
            connected: true,
            timestamp: Date.now(),
          };
          await storage.setWalletConnection(walletData);
          console.log("Wallet connection stored:", walletData);
        }
      }
    } catch (error) {
      console.error("Error storing wallet connection:", error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    refreshToken,
    isLoading,
    isAuthenticated,
    isWalletConnected,
    connectWallet,
    disconnectWallet,
    forceDisconnectWallet,
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