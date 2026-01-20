// Server URL configuration
// Set EXPO_PUBLIC_SERVER_URL in your .env file or environment
// For production, use your Render server URL
// For development, you can use ngrok or localhost

const getServerUrl = (): string => {
  // Use environment variable if set, otherwise fallback to development URL
  const envUrl = process.env.EXPO_PUBLIC_SERVER_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  // Fallback to ngrok for development (if no env var is set)
  if (__DEV__) {
    return "";
  }
  
  // Production fallback (should never reach here if env var is set)
  throw new Error("EXPO_PUBLIC_SERVER_URL must be set in production");
};

export const serverUrl = getServerUrl();