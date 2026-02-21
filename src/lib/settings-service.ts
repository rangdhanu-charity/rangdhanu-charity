import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const SETTINGS_COLLECTION = "system_settings";
const GENERAL_DOC_ID = "general"; // Single doc for general settings

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

export const SettingsService = {
    async getSettings(): Promise<SystemSettings> {
        try {
            const docRef = doc(db, SETTINGS_COLLECTION, GENERAL_DOC_ID);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data() as SystemSettings;
            } else {
                // Initialize if not exists
                await setDoc(docRef, DEFAULT_SETTINGS);
                return DEFAULT_SETTINGS;
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
            return DEFAULT_SETTINGS;
        }
    },

    async updateSettings(newSettings: Partial<SystemSettings>) {
        try {
            const docRef = doc(db, SETTINGS_COLLECTION, GENERAL_DOC_ID);
            await setDoc(docRef, newSettings, { merge: true });
            return true;
        } catch (error) {
            console.error("Error updating settings:", error);
            throw error;
        }
    },

    async addCollectionYear(year: number) {
        try {
            const settings = await this.getSettings();
            if (!settings.collectionYears.includes(year)) {
                const updatedYears = [...settings.collectionYears, year].sort((a, b) => a - b);

                // Initialize the new year with all 12 months enabled
                const currentMonths = settings.collectionMonths || {};
                const updatedMonths = {
                    ...currentMonths,
                    [year]: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
                };

                await this.updateSettings({
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
    },

    async toggleCollectionMonth(year: number, month: number, isEnabled: boolean) {
        try {
            const settings = await this.getSettings();
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

            await this.updateSettings({ collectionMonths: updatedMonths });
            return activeMonths;
        } catch (error) {
            console.error("Error toggling month:", error);
            throw error;
        }
    },

    async removeCollectionYear(year: number) {
        try {
            const settings = await this.getSettings();
            const updatedYears = settings.collectionYears.filter(y => y !== year);
            await this.updateSettings({ collectionYears: updatedYears });
            return updatedYears;
        } catch (error) {
            console.error("Error removing year:", error);
            throw error;
        }
    }
};
