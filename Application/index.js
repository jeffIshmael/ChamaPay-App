import { Platform } from "react-native";
import "react-native-get-random-values";

// Install crypto polyfill FIRST
import { install } from 'react-native-quick-crypto';
install();

// Add polyfills for Node.js modules
if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}

if (typeof global.process === 'undefined') {
  global.process = require('process');
}

// Add crypto to global if not present
if (typeof global.crypto === 'undefined') {
  const { crypto } = require('react-native-quick-crypto');
  global.crypto = crypto;
}

if (Platform.OS !== "web") {
  import("@thirdweb-dev/react-native-adapter");
}
import "react-native-reanimated";
import "expo-router/entry";