import { useAuth } from '@/Contexts/AuthContext';
import { useRouter, useSegments } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
    AppState,
    PanResponder,
    StyleSheet,
    View
} from 'react-native';

// Inactivity timeout in milliseconds (e.g., 5 minutes)
const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

export const InactivityHandler = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, user } = useAuth(); // Assuming useAuth provides user data too
    const router = useRouter();
    const segments = useSegments();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const appState = useRef(AppState.currentState);
    const lastActiveTime = useRef(Date.now());

    // Reset the inactivity timer
    const resetTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        lastActiveTime.current = Date.now();

        if (isAuthenticated) {
            timerRef.current = setTimeout(() => {
                lockApp();
            }, INACTIVITY_TIMEOUT);
        }
    };

    const lockApp = () => {
        // Don't lock if already on lock screen or auth screens
        const currentRoute = segments[segments.length - 1];
        const publicRoutes = ['new-auth-screen', 'lock-screen', 'wallet-setup', 'auth-screen', 'auth-form-screen', 'verify-email', 'index'];

        if (publicRoutes.includes(currentRoute) || !isAuthenticated) {
            return;
        }

        // Only lock if we have a user (meaning we are logged in)
        if (user) {
            console.log('Locking app due to inactivity');
            router.replace('/lock-screen');
        }
    };

    // PanResponder to detect touches
    const panResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponderCapture: () => {
                resetTimer();
                return false; // Don't capture, just detect
            },
        })
    ).current;

    // Handle App State changes (Background/Foreground)
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                // App has come to the foreground
                const timeElapsed = Date.now() - lastActiveTime.current;
                if (isAuthenticated && timeElapsed > INACTIVITY_TIMEOUT) {
                    lockApp();
                } else {
                    resetTimer();
                }
            } else if (nextAppState === 'background') {
                // App went to background, record time
                lastActiveTime.current = Date.now();
                if (timerRef.current) clearTimeout(timerRef.current);
            }

            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isAuthenticated, segments]);

    // Initial timer set
    useEffect(() => {
        resetTimer();
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        }
    }, [isAuthenticated]);

    return (
        <View style={styles.container} {...panResponder.panHandlers}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
