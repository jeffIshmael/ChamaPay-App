import { Video, ResizeMode } from 'expo-av';
import React, { useRef } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface AuthLoadingViewProps {
  message: string;
}

const AuthLoadingView: React.FC<AuthLoadingViewProps> = ({ message }) => {
  const videoRef = useRef<Video>(null);

  return (
    <View style={styles.container}>
      {/* Background Gradient Effect - Using App's primary theme colors */}
      <View style={styles.gradientBg} />
      
      {/* Decorative circles to match the auth screen style */}
      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />

      <SafeAreaView style={styles.content}>
        <View style={styles.videoLoaderContainer}>
          <Video
            ref={videoRef}
            source={require('@/assets/videos/logo.mp4')}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping
          />
        </View>

        <View style={styles.messageWrapper}>
          <Text style={styles.loadingText}>
            {message || "Processing..."}
          </Text>
          <View style={styles.dotContainer}>
            {/* Animated dots could be added here later if needed */}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    zIndex: 9999,
    elevation: 9999,
  },
  gradientBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#d1f6f1', // downy-100
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circle1: {
    top: -100,
    right: -80,
    width: 300,
    height: 300,
    backgroundColor: '#a3ece4', // downy-200
    opacity: 0.5,
  },
  circle2: {
    bottom: -100,
    left: -80,
    width: 250,
    height: 250,
    backgroundColor: '#66d9d0', // downy-300
    opacity: 0.4,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  videoLoaderContainer: {
    width: width * 0.6,
    height: width * 0.6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  messageWrapper: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1c8584', // downy-600
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  dotContainer: {
    flexDirection: 'row',
    marginTop: 10,
  }
});

export default AuthLoadingView;
