import React, { useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withSpring, 
    withTiming, 
    withDelay
} from 'react-native-reanimated';
import { X, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useFormattedBalance } from '@/hooks/useFormattedBalance';

const { width, height } = Dimensions.get('window');

type OutcomeType = 'payout' | 'refund';

interface OutcomeModalProps {
    visible: boolean;
    type: OutcomeType;
    data: {
        memberName?: string;
        amount?: string;
        cycle?: string | number;
        round?: string | number;
        chamaName?: string;
    };
    onClose: () => void;
}

const ConfettiParticle = ({ delay, emoji }: { delay: number, emoji: string }) => {
    const y = useSharedValue(-50);
    const x = useSharedValue(Math.random() * width);

    useEffect(() => {
        // Fall once and stop
        y.value = withDelay(
            delay,
            withTiming(height + 100, { duration: 2500 + Math.random() * 1000 })
        );
    }, [delay]);

    const style = useAnimatedStyle(() => {
        return {
            transform: [
                { translateY: y.value },
                { translateX: x.value }
            ]
        };
    });

    return (
        <Animated.View style={[styles.confetti, style]}>
            <Text style={{ fontSize: 24 }}>{emoji}</Text>
        </Animated.View>
    );
};

export default function OutcomeModal({ visible, type, data, onClose }: OutcomeModalProps) {
    const { formatBalance } = useFormattedBalance();
    const scale = useSharedValue(0.8);
    const opacity = useSharedValue(0);

    // Constant array to map over for confetti
    const confettiCount = Array.from({ length: 15 });

    useEffect(() => {
        if (visible) {
            if (type === 'payout') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
            
            scale.value = withSpring(1, { damping: 15, stiffness: 200 });
            opacity.value = withTiming(1, { duration: 200 });
        } else {
            scale.value = withTiming(0.8, { duration: 200 });
            opacity.value = withTiming(0, { duration: 200 });
        }
    }, [visible, type]);

    const modalStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [{ scale: scale.value }]
        };
    });

    const renderConfetti = () => {
        const emojis = ['🎉', '🎊', '✨', '💵', '🥳'];
        return confettiCount.map((_, i) => (
            <ConfettiParticle 
                key={i} 
                delay={Math.random() * 500} 
                emoji={emojis[i % emojis.length]} 
            />
        ));
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View className="flex-1 bg-black/60 items-center justify-center p-6 relative">
                {type === 'payout' && renderConfetti()}
                
                {/* Close Button Top Right of Screen */}
                <TouchableOpacity 
                    onPress={onClose}
                    className="absolute top-12 right-6 z-50 bg-white/20 p-2 rounded-full"
                >
                    <X size={24} color="white" />
                </TouchableOpacity>

                <Animated.View style={[modalStyle, { width: '100%' }]}>
                    <View className="bg-white rounded-[32px] p-6 shadow-2xl items-center relative overflow-hidden">
                        
                        {/* Header Status Badge */}
                        {/* <View className={`px-3 py-1 rounded-full mb-6 ${type === 'payout' ? 'bg-emerald-100' : 'bg-yellow-100'}`}>
                            <Text className={`text-xs font-bold ${type === 'payout' ? 'text-emerald-700' : 'text-yellow-700'}`}>
                                {type === 'payout' ? '🟢 SUCCESS' : '🟡 REFUNDED'}
                            </Text>
                        </View> */}

                        {/* Emoji with Glow */}
                        <View className="relative mb-6 items-center justify-center">
                            <View className={`absolute w-24 h-24 rounded-full opacity-30 ${type === 'payout' ? 'bg-emerald-200' : 'bg-blue-100'}`} />
                            <Text style={{ fontSize: 56 }}>{type === 'payout' ? '🎉' : '⏳'}</Text>
                        </View>

                        {/* Title */}
                        <Text className="text-[28px] font-extrabold mb-8 text-center text-gray-900">
                            {type === 'payout' ? 'Payout Complete' : 'Payout Delayed'}
                        </Text>

                        {/* Amount Hero (Payout only) */}
                        {type === 'payout' && (
                            <View className="bg-emerald-100 px-6 py-3 rounded-full mb-6 shadow-sm border border-emerald-200">
                                <Text className="text-3xl font-black text-emerald-700 tracking-tight">{formatBalance(data.amount)}</Text>
                            </View>
                        )}

                        {/* Main Body */}
                        {type === 'payout' ? (
                            <View className="items-center w-full">
                                <Text className="text-gray-500 mb-1">has been sent to</Text>
                                <Text className="text-xl font-bold text-gray-900 mb-8">{data.memberName}</Text>

                                {/* Summary Card */}
                                <View className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
                                    <View className="flex-row justify-between mb-3 pb-3 border-b border-gray-200">
                                        <Text className="text-gray-500 font-medium">Chama</Text>
                                        <Text className="font-bold text-gray-900">{data.chamaName}</Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-gray-500 font-medium">Round</Text>
                                        <Text className="font-bold text-gray-900">Cycle {data.cycle} • Round {data.round}</Text>
                                    </View>
                                </View>

                                <Text className="text-sm text-gray-500 text-center leading-relaxed px-4">
                                    Everyone completed their contribution, so today's payout was released automatically.{'\n\n'}Thank you for saving together. ❤️
                                </Text>
                            </View>
                        ) : (
                            <View className="items-center w-full">
                                <Text className="text-gray-600 text-center text-base mb-6 px-4">
                                    No payout was made for this round because some members didn't complete their contribution.
                                </Text>

                                {/* Summary Card */}
                                <View className="w-full bg-blue-50 rounded-2xl p-4 border border-blue-100 mb-6">
                                    <View className="flex-row justify-between mb-3 pb-3 border-b border-blue-200/50">
                                        <Text className="text-blue-700 font-medium">Chama</Text>
                                        <Text className="font-bold text-blue-900">{data.chamaName}</Text>
                                    </View>
                                    <View className="flex-row justify-between mb-3 pb-3 border-b border-blue-200/50">
                                        <Text className="text-blue-700 font-medium">Round</Text>
                                        <Text className="font-bold text-blue-900">Cycle {data.cycle} • Round {data.round}</Text>
                                    </View>
                                    <View className="flex-row justify-between">
                                        <Text className="text-blue-700 font-medium">Recipient</Text>
                                        <Text className="font-bold text-blue-900">{data.memberName}</Text>
                                    </View>
                                </View>

                                <View className="w-full bg-gray-50 rounded-2xl p-5 border border-gray-100 mb-6">
                                    <Text className="text-gray-900 font-bold mb-4">Good news</Text>
                                    
                                    <View className="flex-row items-start mb-3">
                                        <CheckCircle2 size={18} color="#059669" className="mr-3 mt-0.5" />
                                        <Text className="text-gray-700 flex-1 leading-tight">Your contribution has already been refunded to your wallet.</Text>
                                    </View>
                                    
                                    <View className="flex-row items-start mb-3">
                                        <CheckCircle2 size={18} color="#059669" className="mr-3 mt-0.5" />
                                        <Text className="text-gray-700 flex-1 leading-tight">No funds were lost.</Text>
                                    </View>

                                    <View className="flex-row items-start">
                                        <CheckCircle2 size={18} color="#059669" className="mr-3 mt-0.5" />
                                        <Text className="text-gray-700 flex-1 leading-tight"><Text className="font-bold">{data.memberName}</Text> will still be the one to receive the payout next time.</Text>
                                    </View>
                                </View>

                                <Text className="text-sm text-gray-500 text-center">
                                    This round will be repeated once everyone contributes.
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity 
                            onPress={onClose}
                            className={`w-full py-4 rounded-2xl mt-8 shadow-sm ${type === 'payout' ? 'bg-emerald-600' : 'bg-gray-900'}`}
                        >
                            <Text className="text-white text-center font-bold text-[17px]">
                                {type === 'payout' ? 'Close' : 'Got it'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    confetti: {
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 10,
    }
});
