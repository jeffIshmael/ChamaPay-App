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
    return "https://chamapay-app.onrender.com";
  }

  // Production fallback
  console.error("❌ EXPO_PUBLIC_SERVER_URL is not set. API calls will fail.");
  return "https://fallback-url-not-set.com";
};

export const serverUrl = getServerUrl();