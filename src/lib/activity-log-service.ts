import { collection, addDoc, getDocs, query, orderBy, limit, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ActivityLog {
    id?: string;
    adminId: string;
    adminName: string;
    action: string;
    details: string;
    createdAt: Date;
}

const MAX_LOGS = 100;

export const ActivityLogService = {
    logActivity: async (adminId: string, adminName: string, action: string, details: string) => {
        try {
            const logsRef = collection(db, "activity_logs");

            await addDoc(logsRef, {
                adminId,
                adminName,
                action,
                details,
                createdAt: Timestamp.now()
            });

            // Cleanup old logs if exceeding MAX_LOGS
            // We fetch the most recent MAX_LOGS + 10 (to find the ones to delete if over)
            // Or simpler: fetch all, sort by createdAt desc, and delete anything beyond index MAX_LOGS - 1
            const q = query(logsRef, orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);

            if (snapshot.docs.length > MAX_LOGS) {
                const docsToDelete = snapshot.docs.slice(MAX_LOGS);
                const deletePromises = docsToDelete.map(d => deleteDoc(doc(db, "activity_logs", d.id)));
                await Promise.all(deletePromises);
            }

        } catch (error) {
            console.error("Failed to log activity:", error);
            // We usually don't want activity logging failures to crash the main operation, so we just catch and log.
        }
    }
};
