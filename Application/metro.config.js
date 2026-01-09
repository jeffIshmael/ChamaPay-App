const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = [
  "react-native",
  "browser",
  "require",
];

// Add crypto polyfills
config.resolver.extraNodeModules = {
  crypto: require.resolve('react-native-quick-crypto'),
  stream: require.resolve('readable-stream'),
  buffer: require.resolve('buffer'),
};

module.exports = withNativeWind(config, { input: "./app/global.css" });