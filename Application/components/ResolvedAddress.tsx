import { useUserResolver } from '@/hooks/useUserResolver';
import React from 'react';
import { Text, View } from 'react-native';

interface Props {
    address?: string;
    type?: 'sender' | 'recipient';
    fallback?: string;
    className?: string;
    textClassName?: string;
    showPrefix?: boolean;
}

export const ResolvedAddress: React.FC<Props> = ({
    address,
    type,
    fallback,
    className,
    textClassName = "text-xs text-gray-500 mt-1",
    showPrefix = true
}) => {
    const { resolvedName } = useUserResolver(address);

    const prefix = showPrefix ? (type === 'sender' ? 'From: ' : 'To: ') : '';
    const displayValue = resolvedName || fallback || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Unknown");

    const content = (
        <Text className={textClassName}>
            {prefix}{displayValue}
        </Text>
    );

    if (className) {
        return (
            <View className={className}>
                {content}
            </View>
        );
    }

    return content;
};
