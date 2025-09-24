import { serverUrl } from '@/constants/serverUrl';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { storage } from '../Utils/storage';

export interface User {
  id: number;
  email: string;
  name: string | null;
  phoneNo: number | null;
  address: string;
  role: string | null;
  profile: string | null;
  profileImageUrl: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  setAuth: (newToken: string, userData: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!token && !!user;

  // Load stored token and user data on app start
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await storage.getToken();
      const storedUser = await storage.getUser();
      
      if (storedToken) {
        setToken(storedToken);
        
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
      await storage.removeUser();
    } finally {
      setIsLoading(false);
    }
  };

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
        const { token: newToken, user: userData } = data;
        
        // Store token and user data
        await storage.setToken(newToken);
        await storage.setUser(userData);
        
        setToken(newToken);
        setUser(userData);
        
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
      await storage.removeToken();
      await storage.removeUser();
      setToken(null);
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

  const setAuth = async (newToken: string, userData: User) => {
    await storage.setToken(newToken);
    await storage.setUser(userData);
    setToken(newToken);
    setUser(userData);
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    refreshUser,
    setAuth,
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