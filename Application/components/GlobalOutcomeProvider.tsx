import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import OutcomeModal from './OutcomeModal';
import { getUnseenOutcomes, markOutcomeSeen } from '../lib/statsService';

export default function GlobalOutcomeProvider({ children }: { children: React.ReactNode }) {
    const [outcomes, setOutcomes] = useState<any[]>([]);
    const [currentOutcome, setCurrentOutcome] = useState<any | null>(null);

    const fetchOutcomes = async () => {
        try {
            const data = await getUnseenOutcomes();
            if (data && data.length > 0) {
                setOutcomes(data);
                // Only set current if we don't already have one showing
                setCurrentOutcome((prev: any) => prev ? prev : data[0]);
            }
        } catch (error) {
            console.error("Failed to fetch outcomes in provider:", error);
        }
    };

    useEffect(() => {
        fetchOutcomes();

        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                fetchOutcomes();
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const handleClose = async () => {
        if (currentOutcome) {
            try {
                await markOutcomeSeen(currentOutcome.id);
            } catch (error) {
                console.error("Failed to mark outcome seen:", error);
            }

            // Remove the first outcome from the list and show the next if any
            const remaining = outcomes.slice(1);
            setOutcomes(remaining);
            if (remaining.length > 0) {
                setCurrentOutcome(remaining[0]);
            } else {
                setCurrentOutcome(null);
            }
        }
    };

    return (
        <>
            {children}
            {currentOutcome && (
                <OutcomeModal
                    visible={!!currentOutcome}
                    type={currentOutcome.disburse ? 'payout' : 'refund'}
                    data={{
                        memberName: currentOutcome.memberName,
                        amount: currentOutcome.amountPaid,
                        cycle: currentOutcome.cycle,
                        round: currentOutcome.round,
                        chamaName: currentOutcome.chamaName,
                    }}
                    onClose={handleClose}
                />
            )}
        </>
    );
}
