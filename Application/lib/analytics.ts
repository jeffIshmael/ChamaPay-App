import analytics from '@react-native-firebase/analytics';

/**
 * Log a custom event
 * @param eventName Name of the event (e.g., 'wallet_connected')
 * @param params Optional parameters for the event
 */
export const logEvent = async (eventName: string, params?: Record<string, any>) => {
  try {
    await analytics().logEvent(eventName, params);
  } catch (error) {
    console.warn('Failed to log event', error);
  }
};

/**
 * Log a screen view
 * @param screenName Name of the screen
 * @param screenClass Class of the screen (optional)
 */
export const logScreenView = async (screenName: string, screenClass?: string) => {
  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  } catch (error) {
    console.warn('Failed to log screen view', error);
  }
};

/**
 * Set user properties
 * @param properties Object containing user properties
 */
export const setUserProperties = async (properties: Record<string, string | null>) => {
  try {
    await analytics().setUserProperties(properties);
  } catch (error) {
    console.warn('Failed to set user properties', error);
  }
};

/**
 * Log app open event
 */
export const logAppOpen = async () => {
  try {
    await analytics().logAppOpen();
  } catch (error) {
    console.warn('Failed to log app open', error);
  }
};
