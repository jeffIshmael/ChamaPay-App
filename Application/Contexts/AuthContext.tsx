import { serverUrl } from '@/constants/serverUrl';
import { chain } from '@/constants/thirdweb';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useActiveWallet, useConnect } from 'thirdweb/react';
import { inAppWallet } from 'thirdweb/wallets';
import { storage } from '../Utils/storage';

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
  // Wallet connection methods
  connectWallet: () => Promise<{ success: boolean; error?: string }>;
  disconnectWallet: () => Promise<void>;
  forceDisconnectWallet: () => Promise<void>;
  // User registration/login methods
  registerUser: (username: string) => Promise<{ success: boolean; error?: string }>;
  loginWithRefreshToken: () => Promise<{ success: boolean; error?: string }>;
  setAuth: (newToken: string, userData: User, newRefreshToken?: string | null) => Promise<void>;
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

  const { connect } = useConnect();
  const activeWallet = useActiveWallet();
  
  const isAuthenticated = !!token && !!user;
  const isWalletConnected = !!activeWallet;

  // Load stored token and user data on app start
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await storage.getToken();
      const storedRefreshToken = await storage.getRefreshToken?.();
      const storedUser = await storage.getUser();
      const storedWalletConnection = await storage.getWalletConnection();
      
      // First, try to restore wallet connection
      if (storedWalletConnection?.connected) {
        try {
          const wallet = inAppWallet({ smartAccount: { chain, sponsorGas: true } });
          const maybeAccount: any = await (wallet as any).autoConnect?.();
          const hasAccount = !!maybeAccount?.address || !!(wallet as any).getAccount?.();
          if (hasAccount) {
            await connect(wallet);
          }
        } catch (error) {
          console.warn('Failed to restore wallet connection:', error);
        }
      }
      
      // Then handle user authentication
      if (storedToken) {
        setToken(storedToken);
        if (storedRefreshToken) setRefreshToken(storedRefreshToken);
        
        if (storedUser) {
          // Set cached user immediately for fast UI, then refresh from server
          setUser(storedUser);
          try {
            await fetchUserData(storedToken);
          } catch {
            // Token might be expired, try refresh token
            if (storedRefreshToken) {
              await loginWithRefreshToken();
            }
          }
        } else {
          // Token exists but no user data, fetch from server
          try {
            await fetchUserData(storedToken);
          } catch {
            // Token might be expired, try refresh token
            if (storedRefreshToken) {
              await loginWithRefreshToken();
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      // Clear invalid data
      await storage.removeToken();
      await storage.removeRefreshToken?.();
      await storage.removeUser();
      await storage.removeWalletConnection();
    } finally {
      setIsLoading(false);
    }
  };

  // Monitor wallet connection changes and store connection data
  useEffect(() => {
    if (activeWallet) {
      storeWalletConnection(activeWallet);
    }
  }, [activeWallet]);

  const fetchUserData = async (authToken: string) => {
    try {
      const response = await fetch(`${serverUrl}/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userData = data.user;
        console.log("the userdata is", userData);
        setUser(userData);
        await storage.setUser(userData);
      } else {
        // Invalid token, clear storage
        await storage.removeToken();
        await storage.removeUser();
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // On error, clear storage
      await storage.removeToken();
      await storage.removeUser();
      setToken(null);
      setUser(null);
    }
  };

  // Connect to in-app wallet
  const connectWallet = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const wallet = inAppWallet({ smartAccount: { chain, sponsorGas: true } });
      await connect(wallet);
      await storeWalletConnection(wallet);
      return { success: true };
    } catch (error) {
      console.error('Wallet connection error:', error);
      return { 
        success: false, 
        error: 'Failed to connect wallet. Please try again.' 
      };
    }
  };

  // Disconnect wallet (only when user is not authenticated)
  const disconnectWallet = async () => {
    try {
      // Only disconnect if user is not authenticated
      if (isAuthenticated) {
        console.warn('Cannot disconnect wallet while user is authenticated');
        return;
      }
      
      if (activeWallet) {
        await activeWallet.disconnect();
      }
      await storage.removeWalletConnection();
    } catch (error) {
      console.error('Wallet disconnection error:', error);
    }
  };

  // Register user with username after wallet connection
  const registerUser = async (username: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!activeWallet) {
        return { success: false, error: 'Wallet not connected' };
      }

      // Get wallet address from the wallet
      const walletAddress = activeWallet.getAccount()?.address;
      if (!walletAddress) {
        return { success: false, error: 'Could not get wallet address' };
      }

      const response = await fetch(`${serverUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username,
          walletAddress 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const { token: newToken, user: userData, refreshToken: newRefreshToken } = data;
        
        // Store token and user data
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
          error: data.error || 'Registration failed. Please try again.' 
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: 'An error occurred. Please try again.' 
      };
    }
  };

  // Login using refresh token
  const loginWithRefreshToken = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const storedRefreshToken = await storage.getRefreshToken?.();
      if (!storedRefreshToken) {
        return { success: false, error: 'No refresh token available' };
      }

      const response = await fetch(`${serverUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      const data = await response.json();

      if (response.ok) {
        const { token: newToken, user: userData, refreshToken: newRefreshToken } = data;
        
        // Store new token and user data
        await storage.setToken(newToken);
        await storage.setUser(userData);
        if (newRefreshToken) await storage.setRefreshToken?.(newRefreshToken);
        
        setToken(newToken);
        setUser(userData);
        if (newRefreshToken) setRefreshToken(newRefreshToken);
        
        return { success: true };
      } else {
        // Refresh token is invalid, clear everything
        await storage.removeToken();
        await storage.removeRefreshToken?.();
        await storage.removeUser();
        setToken(null);
        setRefreshToken(null);
        setUser(null);
        
        return { 
          success: false, 
          error: 'Session expired. Please reconnect your wallet.' 
        };
      }
    } catch (error) {
      console.error('Refresh token error:', error);
      return { 
        success: false, 
        error: 'An error occurred. Please try again.' 
      };
    }
  };

  const logout = async () => {
    try {
      // Clear all auth data but keep wallet connected
      await storage.removeToken();
      await storage.removeRefreshToken?.();
      await storage.removeUser();
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      
      // Note: Wallet stays connected for potential re-authentication
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Force disconnect wallet (for complete logout)
  const forceDisconnectWallet = async () => {
    try {
      if (activeWallet) {
        await activeWallet.disconnect();
      }
      await storage.removeWalletConnection();
    } catch (error) {
      console.error('Force wallet disconnection error:', error);
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
      await fetchUserData(token);
    }
  };

  // Set auth state (used by auth-screen after backend auth)
  const setAuth = async (
    newToken: string,
    userData: User,
    newRefreshToken?: string | null
  ) => {
    await storage.setToken(newToken);
    await storage.setUser(userData);
    if (newRefreshToken) await storage.setRefreshToken?.(newRefreshToken);
    setToken(newToken);
    setUser(userData);
    if (newRefreshToken) setRefreshToken(newRefreshToken);
    // Background refresh to ensure latest user details
    try { await fetchUserData(newToken); } catch {}
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

  // Store wallet connection data when wallet is connected
  const storeWalletConnection = async (wallet: any) => {
    try {
      if (wallet) {
        const walletAddress = wallet.getAccount()?.address;
        const walletData = {
          address: walletAddress,
          connected: true,
          timestamp: Date.now(),
        };
        await storage.setWalletConnection(walletData);
        console.log('Wallet connection stored:', walletData);
      }
    } catch (error) {
      console.error('Error storing wallet connection:', error);
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 