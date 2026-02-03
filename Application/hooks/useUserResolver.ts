import { getUserByAddress } from '@/lib/chamaService';
import { useEffect, useState } from 'react';

// Simple global cache for user resolutions
const resolutionCache: Record<string, string> = {
    // Pre-fill some common ones if needed
};

export function useUserResolver(address?: string) {
    const [resolvedName, setResolvedName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!address) {
            setResolvedName(null);
            return;
        }

        // Check cache first
        if (resolutionCache[address]) {
            setResolvedName(resolutionCache[address]);
            return;
        }

        // If it's a 0x address, try to resolve it
        if (address.startsWith('0x')) {
            const resolve = async () => {
                setIsLoading(true);
                try {
                    const data = await getUserByAddress(address);
                    if (data.success && data.user) {
                        const name = `@${data.user.userName}`;
                        resolutionCache[address] = name;
                        setResolvedName(name);
                    } else {
                        // If not found, show short address
                        const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
                        resolutionCache[address] = shortAddress;
                        setResolvedName(shortAddress);
                    }
                } catch (error) {
                    console.error("Error resolving address:", error);
                    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
                    setResolvedName(shortAddress);
                } finally {
                    setIsLoading(false);
                }
            };
            resolve();
        } else {
            // Not a 0x address, just use it as is
            setResolvedName(address);
        }
    }, [address]);

    return { resolvedName, isLoading };
}
