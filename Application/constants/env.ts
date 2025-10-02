// Centralized environment variables loader for client-safe keys
// Note: Only EXPO_PUBLIC_* env vars are available on the client in Expo

type Env = {
  GOOGLE_ANDROID_CLIENT_ID: string;
  GOOGLE_IOS_CLIENT_ID: string;
  GOOGLE_WEB_CLIENT_ID: string;
};

function getEnv(): Env {
  const android = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';
  const ios = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
  const web = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

  if (__DEV__) {
    const missing: string[] = [];
    if (!android) missing.push('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID');
    if (!ios) missing.push('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
    if (!web) missing.push('EXPO_PUBLIC_GOOGLE_CLIENT_ID');
    if (missing.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(`Missing env vars: ${missing.join(', ')}`);
    }
  }

  return {
    GOOGLE_ANDROID_CLIENT_ID: android,
    GOOGLE_IOS_CLIENT_ID: ios,
    GOOGLE_WEB_CLIENT_ID: web,
  };
}

export const env = getEnv();


