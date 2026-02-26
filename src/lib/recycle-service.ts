import { db } from "@/lib/firebase";
import { collection, doc, getDoc, setDoc, deleteDoc, addDoc, serverTimestamp, query, where, getDocs, writeBatch } from "firebase/firestore";

export type RecycleItem = {
    id: string; // The ID in the recycle_bin collection
    originalId: string;
    originalCollection: string;
    data: any;
    deletedAt: any; // Firestore Timestamp
    deletedBy: string; // "admin" or user ID
    type: "payment" | "user" | "project" | "other" | "year_config_removed" | "month_config_removed";
    name: string; // For display
};

const BIN_COLLECTION = "recycle_bin";
const RETENTION_DAYS = 7;

export const RecycleService = {
    async softDelete(originalCollection: string, docId: string, type: RecycleItem["type"], name: string, deletedBy: string = "admin", additionalData?: any) {
        try {
            // 1. Get original data
            const docRef = doc(db, originalCollection, docId);
            const docSnap = await getDoc(docRef);

            // If doc doesn't exist, we can't "soft delete" it in the traditional sense.
            // But we can log it if we have data provided? No, softDelete implies dragging existing data to bin.
            if (!docSnap.exists()) {
                console.warn(`Soft delete failed: Document ${docId} in ${originalCollection} not found.`);
                return false;
            }
            const data = docSnap.data();

            // 2. Add to Recycle Bin
            await addDoc(collection(db, BIN_COLLECTION), {
                originalId: docId,
                originalCollection,
                data,
                deletedAt: serverTimestamp(),
                deletedBy,
                type,
                name,
                ...additionalData // e.g., batchId
            });

            // 3. Delete from original collection
            await deleteDoc(docRef);
            return true;
        } catch (error) {
            console.error("Soft delete failed:", error);
            throw error;
        }
    },

    // New method for logging system actions (like deleting a year config) where no physical doc exists to restore easily
    async logSystemAction(name: string, description: string, type: RecycleItem["type"] = "other", additionalData?: any) {
        try {
            await addDoc(collection(db, BIN_COLLECTION), {
                originalId: "system-action-" + Date.now(),
                originalCollection: "system_logs",
                data: { description },
                deletedAt: serverTimestamp(),
                deletedBy: "admin",
                type,
                name,
                ...additionalData
            });
            return true;
        } catch (error) {
            console.error("Log system action failed:", error);
            return false;
        }
    },

    async restore(recycleId: string) {
        try {
            const binRef = doc(db, BIN_COLLECTION, recycleId);
            const binSnap = await getDoc(binRef); // Renamed to binSnap to avoid conflict

            if (!binSnap.exists()) throw new Error("Recycle item not found");
            const item = binSnap.data() as RecycleItem & { batchId?: string };

            if (item.type === 'year_config_removed') {
                // SPECIAL HANDLER FOR YEAR CONFIG
                // 1. Restore the Year Setting
                const year = item.data.year;
                if (year) {
                    const { SettingsService } = await import("@/lib/settings-service");
                    await SettingsService.addCollectionYear(year);
                }

                // 2. Restore Linked Payments (Batch Restore)
                if (item.batchId) {
                    const qBatch = query(collection(db, BIN_COLLECTION), where("batchId", "==", item.batchId));
                    const batchSnap = await getDocs(qBatch);

                    const batchPromises = batchSnap.docs.map(async (d) => {
                        if (d.id === recycleId) return; // Skip self (already handled)
                        const batchItem = d.data() as RecycleItem;
                        // Recursively restore or manually restore
                        await setDoc(doc(db, batchItem.originalCollection, batchItem.originalId), batchItem.data);
                        await deleteDoc(d.ref);
                    });
                    await Promise.all(batchPromises);
                }
            } else if (item.type === 'month_config_removed') {
                // SPECIAL HANDLER FOR MONTH CONFIG
                const year = item.data.year;
                const month = item.data.month;
                if (year && month) {
                    const { SettingsService } = await import("@/lib/settings-service");
                    await SettingsService.toggleCollectionMonth(year, month, true);
                }

                // Restore Linked Payments (Batch Restore)
                if (item.batchId) {
                    const qBatch = query(collection(db, BIN_COLLECTION), where("batchId", "==", item.batchId));
                    const batchSnap = await getDocs(qBatch);

                    const batchPromises = batchSnap.docs.map(async (d) => {
                        if (d.id === recycleId) return; // Skip self (already handled)
                        const batchItem = d.data() as RecycleItem;
                        await setDoc(doc(db, batchItem.originalCollection, batchItem.originalId), batchItem.data);
                        await deleteDoc(d.ref);
                    });
                    await Promise.all(batchPromises);
                }
            } else if (item.type === 'user') {
                // SPECIAL HANDLER FOR USER
                // 1. Restore User Profile
                await setDoc(doc(db, item.originalCollection, item.originalId), item.data);

                if (item.batchId) {
                    // 2. Restore Linked Payments from Recycle Bin
                    const qBatch = query(collection(db, BIN_COLLECTION), where("batchId", "==", item.batchId));
                    const batchSnap = await getDocs(qBatch);

                    const batchPromises = batchSnap.docs.map(async (d) => {
                        if (d.id === recycleId) return; // Skip self
                        const batchItem = d.data() as RecycleItem;
                        await setDoc(doc(db, batchItem.originalCollection, batchItem.originalId), batchItem.data);
                        await deleteDoc(d.ref);
                    });
                    await Promise.all(batchPromises);

                    // 3. Destroy specifically grouped "One-Time Donation" if they were Soft-Deleted (Preserved)
                    // The Preserve function creates a new payment with `linkedBatchId: batchId` attached.
                    const qGroupedPayment = query(collection(db, "payments"), where("linkedBatchId", "==", item.batchId));
                    const groupedSnap = await getDocs(qGroupedPayment);

                    const destroyPromises = groupedSnap.docs.map(async (d) => {
                        await deleteDoc(d.ref); // Permanently delete the aggregated record
                    });
                    await Promise.all(destroyPromises);
                }
            } else {
                // STANDARD RESTORE
                // Restore to original
                await setDoc(doc(db, item.originalCollection, item.originalId), item.data);

                // If this item is part of a batch but NOT the leader (e.g. restoring a single payment from a deleted year?)
                // Usually we just restore the single item.
            }

            // Remove from bin
            await deleteDoc(binRef);
            return true;
        } catch (error) {
            console.error("Restore failed:", error);
            throw error;
        }
    },

    async permanentDelete(recycleId: string) {
        try {
            await deleteDoc(doc(db, BIN_COLLECTION, recycleId));
            return true;
        } catch (error) {
            console.error("Permanent delete failed:", error);
            throw error;
        }
    },

    async cleanupOldItems() {
        // This should theoretically be a backend function, but for this client-side app, 
        // we can run it when an admin visits the recycle bin.
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

            const q = query(collection(db, BIN_COLLECTION), where("deletedAt", "<=", cutoffDate));
            const snapshot = await getDocs(q);

            if (snapshot.empty) return;

            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            console.log(`Cleaned up ${snapshot.size} old recycle bin items.`);
        } catch (error) {
            console.error("Cleanup failed:", error);
        }
    }
};
