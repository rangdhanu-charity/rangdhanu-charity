"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, Timestamp } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";

export type Notification = {
    id: string;
    userId: string;
    message: string;
    read: boolean;
    createdAt: Date;
    type?: 'info' | 'success' | 'warning' | 'error';
    link?: string;
};

type NotificationContextType = {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    sendNotification: (userId: string, message: string, type?: Notification['type'], link?: string) => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    clearAllNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        const q = query(
            collection(db, "notifications"),
            where("userId", "==", user.id)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs
                .map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                        rawCreatedAt: data.createdAt // Keep raw for precise sorting if needed, but Date object is fine
                    };
                })
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .map(({ rawCreatedAt, ...item }) => item as Notification);

            setNotifications(items);
        });

        return () => unsubscribe();
    }, [user]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = async (id: string) => {
        await updateDoc(doc(db, "notifications", id), { read: true });
    };

    const markAllAsRead = async () => {
        const unread = notifications.filter(n => !n.read);
        const promises = unread.map(n => updateDoc(doc(db, "notifications", n.id), { read: true }));
        await Promise.all(promises);
    };

    const deleteNotification = async (id: string) => {
        const { deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "notifications", id));
    };

    const clearAllNotifications = async () => {
        const { deleteDoc } = await import("firebase/firestore");
        const promises = notifications.map(n => deleteDoc(doc(db, "notifications", n.id)));
        await Promise.all(promises);
    };

    const sendNotification = async (userId: string, message: string, type: Notification['type'] = 'info', link?: string) => {
        const notificationData: any = {
            userId,
            message,
            type,
            read: false,
            createdAt: Timestamp.now()
        };
        if (link) notificationData.link = link;

        await addDoc(collection(db, "notifications"), notificationData);
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, sendNotification, deleteNotification, clearAllNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
}

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return context;
};
