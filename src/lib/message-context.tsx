"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";

export type Message = {
    id: string;
    userId: string;
    senderId: string;
    senderName: string;
    subject?: string;
    content: string;
    link?: string;
    read: boolean;
    createdAt: Date;
};

type MessageContextType = {
    messages: Message[];
    unreadMessageCount: number;
    markMessageAsRead: (id: string) => Promise<void>;
    deleteMessage: (id: string) => Promise<void>;
    clearAllMessages: () => Promise<void>;
};

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function MessageProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);

    useEffect(() => {
        if (!user) {
            setMessages([]);
            return;
        }

        const q = query(
            collection(db, "messages"),
            where("userId", "==", user.id)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs
                .map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
                    };
                })
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) as Message[];

            setMessages(items);
        });

        return () => unsubscribe();
    }, [user]);

    const unreadMessageCount = messages.filter(m => !m.read).length;

    const markMessageAsRead = async (id: string) => {
        await updateDoc(doc(db, "messages", id), { read: true });
    };

    const deleteMessage = async (id: string) => {
        await deleteDoc(doc(db, "messages", id));
    };

    const clearAllMessages = async () => {
        const promises = messages.map(m => deleteDoc(doc(db, "messages", m.id)));
        await Promise.all(promises);
    };

    return (
        <MessageContext.Provider value={{ messages, unreadMessageCount, markMessageAsRead, deleteMessage, clearAllMessages }}>
            {children}
        </MessageContext.Provider>
    );
}

export const useMessages = () => {
    const context = useContext(MessageContext);
    if (context === undefined) {
        throw new Error("useMessages must be used within a MessageProvider");
    }
    return context;
};
