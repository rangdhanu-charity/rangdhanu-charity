"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { RecycleService } from "@/lib/recycle-service";
import { ActivityLogService } from "@/lib/activity-log-service";
import { toast } from "@/hooks/use-toast";

// Types
export type PaymentType = 'monthly' | 'one-time';

export interface Payment {
    id: string;
    userId?: string; // Optional for non-members
    memberName: string;
    type: PaymentType;
    amount: number;
    date: Date; // Converted from Timestamp
    month?: number; // 1-12
    year?: number;
    notes?: string;
    createdAt: Date;
    method?: string;
    transactionId?: string;
}

export interface Expense {
    id: string;
    title: string;
    category: string;
    amount: number;
    date: Date;
    notes?: string;
    recordedBy: string;
    createdAt: Date;
}

interface MonthlyStat {
    month: string; // "Jan 2024"
    collection: number;
    expense: number;
}

interface FinanceContextType {
    payments: Payment[];
    expenses: Expense[];
    loading: boolean;
    // Actions
    addPayment: (data: Omit<Payment, "id" | "createdAt" | "date"> & { date: Date }) => Promise<{ success: boolean; error?: string }>;
    updatePayment: (id: string, data: Partial<Payment>) => Promise<{ success: boolean; error?: string }>;
    deletePayment: (id: string, name?: string, additionalData?: any) => Promise<{ success: boolean; error?: string }>;
    addExpense: (data: Omit<Expense, "id" | "createdAt" | "date"> & { date: Date }) => Promise<{ success: boolean; error?: string }>;
    deleteExpense: (id: string, name?: string) => Promise<{ success: boolean; error?: string }>;
    // Stats
    totalCollection: number;
    totalExpenses: number;
    currentBalance: number;
    monthlyStats: MonthlyStat[];
    getMemberPayments: (userId: string) => Payment[];
    topContributors: string[];
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch for any logged-in user (members need this for the transparency Finance tab)
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);

        // 1. Listen to Payments
        const qPayments = query(collection(db, "payments"), orderBy("date", "desc"));
        const unsubscribePayments = onSnapshot(qPayments, (snapshot) => {
            const loadedPayments = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
                } as Payment;
            });
            setPayments(loadedPayments);
        }, (error) => {
            console.error("Error fetching payments:", error);
        });

        // 2. Listen to Expenses
        const qExpenses = query(collection(db, "expenses"), orderBy("date", "desc"));
        const unsubscribeExpenses = onSnapshot(qExpenses, (snapshot) => {
            const loadedExpenses = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
                } as Expense;
            });
            setExpenses(loadedExpenses);
            setLoading(false); // Creating assumption both load relatively quickly
        }, (error) => {
            console.error("Error fetching expenses:", error);
            setLoading(false);
        });

        return () => {
            unsubscribePayments();
            unsubscribeExpenses();
        };
    }, [user]);

    // Actions
    const addPayment = async (data: Omit<Payment, "id" | "createdAt" | "date"> & { date: Date }) => {
        try {
            await addDoc(collection(db, "payments"), {
                ...data,
                date: Timestamp.fromDate(data.date),
                createdAt: Timestamp.now()
            });

            if (user) {
                ActivityLogService.logActivity(user.id, user.name || user.username || "Admin", "Add Payment", `Recorded payment of ৳${data.amount} for ${data.memberName}`);
            }

            toast({ title: "Success", description: "Payment recorded successfully." });
            return { success: true };
        } catch (error: any) {
            console.error("Error adding payment:", error);
            toast({ title: "Error", description: "Failed to add payment.", variant: "destructive" });
            return { success: false, error: error.message };
        }
    };

    const updatePayment = async (id: string, data: Partial<Payment>) => {
        try {
            const docRef = doc(db, "payments", id);
            const updateData: any = { ...data };
            if (data.date) updateData.date = Timestamp.fromDate(data.date);
            await updateDoc(docRef, updateData);

            if (user) {
                ActivityLogService.logActivity(user.id, user.name || user.username || "Admin", "Update Payment", `Updated payment ID ${id} (new amount: ৳${data.amount || 'no change'})`);
            }

            toast({ title: "Success", description: "Payment updated." });
            return { success: true };
        } catch (error: any) {
            console.error("Error updating payment:", error);
            toast({ title: "Error", description: "Failed to update payment.", variant: "destructive" });
            return { success: false, error: error.message };
        }
    };

    const deletePayment = async (id: string, name: string = "Payment", additionalData?: any) => {
        try {
            const payment = payments.find(p => p.id === id); // Find payment before soft deleting

            await RecycleService.softDelete("payments", id, "payment", name, user?.username || "admin", additionalData);
            if (user) {
                ActivityLogService.logActivity(user.id, user.name || user.username || "Admin", "Delete Payment", `Removed payment ID ${id} (${name})`);
            }
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    };

    const addExpense = async (data: any) => {
        try {
            await addDoc(collection(db, "expenses"), {
                ...data,
                date: Timestamp.fromDate(data.date),
                createdAt: Timestamp.now(),
                recordedBy: user?.username || "Admin"
            });
            if (user) {
                ActivityLogService.logActivity(user.id, user.name || user.username || "Admin", "Add Expense", `Recorded expense of ৳${data.amount} for ${data.title}`);
            }
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    };

    const deleteExpense = async (id: string, name: string = "Expense") => {
        try {
            await RecycleService.softDelete("expenses", id, "other", name, user?.username || "admin");
            if (user) {
                ActivityLogService.logActivity(user.id, user.name || user.username || "Admin", "Delete Expense", `Removed expense ID ${id} (${name})`);
            }
            // await deleteDoc(doc(db, "expenses", id));
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    };

    // Derived Stats
    const totalCollection = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const currentBalance = totalCollection - totalExpenses;

    const getMemberPayments = (userId: string) => {
        return payments.filter(p => p.userId === userId);
    };

    const topContributors = React.useMemo(() => {
        const contributorMap = new Map<string, number>();
        payments.forEach(p => {
            if (!p.userId || p.userId === "guest") return;
            contributorMap.set(p.userId, (contributorMap.get(p.userId) || 0) + Number(p.amount));
        });
        return Array.from(contributorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([userId]) => userId);
    }, [payments]);

    // Monthly Stats for Chart
    // Aggregate by Month-Year
    const monthlyStats: MonthlyStat[] = [];
    const map = new Map<string, { collection: number; expense: number }>();

    // Process Payments
    payments.forEach(p => {
        const key = `${p.date.toLocaleString('default', { month: 'short' })} ${p.date.getFullYear()}`;
        if (!map.has(key)) map.set(key, { collection: 0, expense: 0 });
        map.get(key)!.collection += Number(p.amount) || 0;
    });

    // Process Expenses
    expenses.forEach(e => {
        const key = `${e.date.toLocaleString('default', { month: 'short' })} ${e.date.getFullYear()}`;
        if (!map.has(key)) map.set(key, { collection: 0, expense: 0 });
        map.get(key)!.expense += Number(e.amount) || 0;
    });

    // Convert map to array and sort (naive sort by creation or just simple iteration if last 12 months needed)
    // For now, let's just return all keys
    map.forEach((val, key) => {
        monthlyStats.push({ month: key, collection: val.collection, expense: val.expense });
    });

    // Sort logic can be improved later to be chronological
    // For now, reverse to show latest first or implement date sorting helper

    return (
        <FinanceContext.Provider value={{
            payments,
            expenses,
            loading,
            addPayment,
            updatePayment,
            deletePayment,
            addExpense,
            deleteExpense,
            totalCollection,
            totalExpenses,
            currentBalance,
            monthlyStats,
            getMemberPayments,
            topContributors
        }}>
            {children}
        </FinanceContext.Provider>
    );
}

export function useFinance() {
    const context = useContext(FinanceContext);
    if (context === undefined) {
        throw new Error("useFinance must be used within a FinanceProvider");
    }
    return context;
}
