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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  setAuth: (newToken: string, userData: User, newRefreshToken?: string | null) => Promise<void>;
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

  const isAuthenticated = !!token && !!user;
  const { connect } = useConnect();
  const activeWallet = useActiveWallet();

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
      
      if (storedToken) {
        setToken(storedToken);
        if (storedRefreshToken) setRefreshToken(storedRefreshToken);
        
        if (storedUser) {
          setUser(storedUser);
        } else {
          // Token exists but no user data, fetch from server
          await fetchUserData(storedToken);
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

  // Ensure thirdweb in-app wallet is connected when app has an authenticated user
  useEffect(() => {
    const ensureWalletConnected = async () => {
      try {
        if (isAuthenticated && !activeWallet) {
          // Check if we have a stored wallet connection
          const storedWalletConnection = await storage.getWalletConnection();
          
          if (storedWalletConnection) {
            // Try to restore the existing wallet connection
            try {
              const wallet = inAppWallet({
                smartAccount: { chain, sponsorGas: true },
              });
              await connect(wallet);
              console.log('Wallet connection restored from storage');
            } catch (restoreError) {
              console.log('Failed to restore wallet, creating new connection:', restoreError);
              // If restoration fails, create a new wallet connection
              const wallet = inAppWallet({
                smartAccount: { chain, sponsorGas: true },
              });
              await connect(wallet);
            }
          } else {
            // No stored connection, create new wallet
            const wallet = inAppWallet({
              smartAccount: { chain, sponsorGas: true },
            });
            await connect(wallet);
          }
        }
      } catch (e) {
        console.error('Wallet connection error:', e);
        // Clear invalid wallet connection data
        await storage.removeWalletConnection();
      }
    };
    ensureWalletConnected();
  }, [isAuthenticated, connect, activeWallet]);

  // Monitor wallet connection changes and store connection data
  useEffect(() => {
    if (activeWallet && isAuthenticated) {
      storeWalletConnection(activeWallet);
    }
  }, [activeWallet, isAuthenticated]);

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

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${serverUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
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
          error: data.error || 'Login failed. Please try again.' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'An error occurred. Please try again.' 
      };
    }
  };

  const logout = async () => {
    try {
      // Disconnect thirdweb in-app wallet session if present
      try { await activeWallet?.disconnect(); } catch {}
      await storage.removeToken();
      await storage.removeRefreshToken?.();
      await storage.removeUser();
      await storage.removeWalletConnection();
      setToken(null);
      setRefreshToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
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

  const setAuth = async (newToken: string, userData: User, newRefreshToken?: string | null) => {
    await storage.setToken(newToken);
    await storage.setUser(userData);
    if (newRefreshToken) await storage.setRefreshToken?.(newRefreshToken);
    setToken(newToken);
    setUser(userData);
    if (newRefreshToken) setRefreshToken(newRefreshToken);
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
        const walletData = {
          address: wallet.account?.address,
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
    login,
    logout,
    updateUser,
    refreshUser,
    setAuth,
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