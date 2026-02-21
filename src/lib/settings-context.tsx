"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type SystemSettings = {
    collectionYears: number[];
    collectionMonths?: Record<number, number[]>; // Maps year -> array of months (1-12)
    currencySymbol: string;
};

export const DEFAULT_SETTINGS: SystemSettings = {
    collectionYears: [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1],
    collectionMonths: {},
    currencySymbol: "৳"
};

const SETTINGS_COLLECTION = "system_settings";
const GENERAL_DOC_ID = "general";

interface SettingsContextType {
    settings: SystemSettings;
    loading: boolean;
    updateSettings: (newSettings: Partial<SystemSettings>) => Promise<boolean>;
    addCollectionYear: (year: number) => Promise<number[]>;
    removeCollectionYear: (year: number) => Promise<number[]>;
    toggleCollectionMonth: (year: number, month: number, isEnabled: boolean) => Promise<number[]>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const docRef = doc(db, SETTINGS_COLLECTION, GENERAL_DOC_ID);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setSettings(docSnap.data() as SystemSettings);
            } else {
                // Initial setup if missing
                setDoc(docRef, DEFAULT_SETTINGS).catch(console.error);
                setSettings(DEFAULT_SETTINGS);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error listening to settings:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const updateSettings = async (newSettings: Partial<SystemSettings>) => {
        try {
            const docRef = doc(db, SETTINGS_COLLECTION, GENERAL_DOC_ID);
            await setDoc(docRef, newSettings, { merge: true });
            return true;
        } catch (error) {
            console.error("Error updating settings:", error);
            throw error;
        }
    };

    const addCollectionYear = async (year: number) => {
        try {
            if (!settings.collectionYears.includes(year)) {
                const updatedYears = [...settings.collectionYears, year].sort((a, b) => a - b);

                // Initialize the new year with all 12 months enabled
                const currentMonths = settings.collectionMonths || {};
                const updatedMonths = {
                    ...currentMonths,
                    [year]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
                };

                await updateSettings({
                    collectionYears: updatedYears,
                    collectionMonths: updatedMonths
                });
                return updatedYears;
            }
            return settings.collectionYears;
        } catch (error) {
            console.error("Error adding year:", error);
            throw error;
        }
    };

    const toggleCollectionMonth = async (year: number, month: number, isEnabled: boolean) => {
        try {
            const currentMonths = settings.collectionMonths || {};

            // If year isn't in the map yet, assume all 12 are active
            let activeMonths = currentMonths[year] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

            if (isEnabled && !activeMonths.includes(month)) {
                activeMonths = [...activeMonths, month].sort((a, b) => a - b);
            } else if (!isEnabled) {
                activeMonths = activeMonths.filter(m => m !== month);
            }

            const updatedMonths = {
                ...currentMonths,
                [year]: activeMonths
            };

            await updateSettings({ collectionMonths: updatedMonths });
            return activeMonths;
        } catch (error) {
            console.error("Error toggling month:", error);
            throw error;
        }
    };

    const removeCollectionYear = async (year: number) => {
        try {
            const updatedYears = settings.collectionYears.filter(y => y !== year);
            await updateSettings({ collectionYears: updatedYears });
            return updatedYears;
        } catch (error) {
            console.error("Error removing year:", error);
            throw error;
        }
    };

    return (
        <SettingsContext.Provider value={{
            settings,
            loading,
            updateSettings,
            addCollectionYear,
            removeCollectionYear,
            toggleCollectionMonth
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}
