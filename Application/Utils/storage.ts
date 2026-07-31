import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  HAS_SEEN_ONBOARDING: 'hasSeenOnboarding',
  TOKEN: 'token',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  WALLET_CONNECTION: 'walletConnection',
} as const;

export const storage = {
  // Onboarding
  async getHasSeenOnboarding(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING);
      return value === 'true';
    } catch (error) {
return false;
    }
  },

  async setHasSeenOnboarding(value: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING, value.toString());
    } catch { /* ignored */ }
  },

  // Auth
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    } catch (error) {
return null;
    }
  },

  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
    } catch { /* ignored */ }
  },

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    } catch { /* ignored */ }
  },

  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
return null;
    }
  },

  async setRefreshToken(refreshToken: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    } catch { /* ignored */ }
  },

  async removeRefreshToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch { /* ignored */ }
  },

  // User data
  async getUser(): Promise<any | null> {
    try {
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
return null;
    }
  },

  async setUser(user: any): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch { /* ignored */ }
  },

  async removeUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    } catch { /* ignored */ }
  },

  // Wallet connection
  async getWalletConnection(): Promise<any | null> {
    try {
      const walletData = await AsyncStorage.getItem(STORAGE_KEYS.WALLET_CONNECTION);
      return walletData ? JSON.parse(walletData) : null;
    } catch (error) {
return null;
    }
  },

  async setWalletConnection(walletData: any): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.WALLET_CONNECTION, JSON.stringify(walletData));
    } catch { /* ignored */ }
  },

  async removeWalletConnection(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.WALLET_CONNECTION);
    } catch { /* ignored */ }
  },

  // Clear all data
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
        STORAGE_KEYS.HAS_SEEN_ONBOARDING,
        STORAGE_KEYS.WALLET_CONNECTION,
      ]);
    } catch { /* ignored */ }
  },
}; 