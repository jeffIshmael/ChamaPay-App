import React from 'react';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';

export default function LoadingSplashScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/chamapay-logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator 
        size="large" 
        color="#10b981" 
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#d1f6f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 40,
  },
  loader: {
    marginTop: 20,
  },
});