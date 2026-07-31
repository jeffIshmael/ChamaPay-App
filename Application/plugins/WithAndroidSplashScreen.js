const { withAndroidStyles, withAndroidColors } = require('@expo/config-plugins');

module.exports = function withCustomAndroidSplash(config) {
  // Add custom styles
  config = withAndroidStyles(config, (config) => {
    const styles = config.modResults;
    
    // Find or create AppTheme
    let appTheme = styles.resources.style?.find(
      (style) => style.$.name === 'AppTheme'
    );

    if (!appTheme) {
      if (!styles.resources.style) {
        styles.resources.style = [];
      }
      appTheme = {
        $: { name: 'AppTheme', parent: 'Theme.Expo.Light' },
        item: [],
      };
      styles.resources.style.push(appTheme);
    }

    // Add window background
    const windowBackgroundItem = {
      $: { name: 'android:windowBackground' },
      _: '@color/splashscreen_background',
    };

    if (!appTheme.item) {
      appTheme.item = [];
    }

    // Remove existing if present
    appTheme.item = appTheme.item.filter(
      (item) => item.$.name !== 'android:windowBackground'
    );

    appTheme.item.push(windowBackgroundItem);

    return config;
  });

  // Add custom colors
  config = withAndroidColors(config, (config) => {
    const colors = config.modResults;

    if (!colors.resources.color) {
      colors.resources.color = [];
    }

    // Remove existing splashscreen_background if present
    colors.resources.color = colors.resources.color.filter(
      (color) => color.$.name !== 'splashscreen_background'
    );

    // Add our color
    colors.resources.color.push({
      $: { name: 'splashscreen_background' },
      _: '#d1f6f1',
    });

    return config;
  });

  return config;
};