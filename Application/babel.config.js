module.exports = function (api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Start with just these essential ones
      "expo-router/babel",
      "react-native-reanimated/plugin", // Keep this last
    ],
  };
};