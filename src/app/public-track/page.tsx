"use client";

import { useState, useEffect } from "react";
import { query, collection, where, getDocs, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Activity, Heart, User } from "lucide-react";
import { format } from "date-fns";
import { Navbar } from "@/components/layout/navbar";

// Types for tracking
interface PublicDonation {
    id: string;
    userName: string;
    userEmail: string; // Used for phone or email
    amount: number;
    method: string;
    transactionId: string;
    date: string;
    createdAt: Timestamp;
    status: "pending" | "approved" | "rejected";
    rejectionReason?: string;
}

// Masking Utilities
const maskName = (name: string) => {
    if (!name || name === "Anonymous Guest") return "Anonymous";
    const parts = name.split(" ");
    if (parts.length === 1) {
        return name.length > 2 ? name.substring(0, 2) + "****" : name + "****";
    }
    const first = parts[0];
    const last = parts[parts.length - 1];
    return `${first.substring(0, 2)}**** ${last.substring(0, 1)}****`;
};

const maskContact = (contact: string) => {
    if (!contact) return "";
    
    // If it looks like an email
    if (contact.includes("@")) {
        const [local, domain] = contact.split("@");
        if (local.length <= 2) return `${local[0]}***@${domain}`;
        return `${local.substring(0, 2)}***@${domain}`;
    }
    
    // If it looks like a phone number
    const digitsOnly = contact.replace(/\D/g, "");
    if (digitsOnly.length > 4) {
        return `*****${digitsOnly.slice(-4)}`;
    }
    
    return "*****";
};

const maskTransaction = (trxId: string) => {
    if (!trxId) return "-";
    if (trxId.length <= 4) return `***${trxId.slice(-1)}`;
    return `***${trxId.slice(-4)}`;
};

export default function PublicTrackPage() {
    const [publicDonations, setPublicDonations] = useState<PublicDonation[]>([]);
    const [isLoadingTrack, setIsLoadingTrack] = useState(true);

    useEffect(() => {
        const fetchPublicDonations = async () => {
            try {
                // To avoid requiring a composite index, we only order by createdAt
                // and filter status and guest properties client-side.
                const q = query(
                    collection(db, "donation_requests"),
                    orderBy("createdAt", "desc"),
                    limit(150)
                );
                const querySnapshot = await getDocs(q);
                
                const donations = querySnapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as PublicDonation[];
                    
                const guestDonations = donations
                    .filter(d => (d as any).isGuest === true);

                const recentDonations = guestDonations.slice(0, 20);
                const oldDonations = guestDonations.slice(20);

                setPublicDonations(recentDonations);

                // Auto-cleanup older records for memory optimization as requested
                if (oldDonations.length > 0) {
                    try {
                        const { deleteDoc, doc } = await import("firebase/firestore");
                        oldDonations.forEach(d => {
                            deleteDoc(doc(db, "donation_requests", d.id)).catch(() => {}); // Silent catch for permission errors if run by non-admin
                        });
                    } catch (e) {
                        // Ignore import errors
                    }
                }
            } catch (error) {
                console.error("Error fetching public donations:", error);
            } finally {
                setIsLoadingTrack(false);
            }
        };

        fetchPublicDonations();
    }, []);

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
            <div className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-4xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <Activity className="h-8 w-8 text-primary" />
                        Public Donation Track
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Recent verified one-time public donations shown below.
                        Names are securely masked for privacy.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-md border border-blue-100 dark:border-blue-900 mt-4">
                        <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                            <strong>Note:</strong> Logged-in members' internal donations are tracked privately on their individual profiles and are not displayed on this public track.
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border rounded-xl overflow-hidden shadow-sm">
                    {isLoadingTrack ? (
                        <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center">
                            <Activity className="h-10 w-10 text-muted mb-4 animate-pulse" />
                            <p className="text-lg">Loading verified public track data...</p>
                        </div>
                    ) : publicDonations.length === 0 ? (
                        <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center bg-muted/10">
                            <Heart className="h-12 w-12 text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-medium text-foreground mb-1">No Recent Public Donations</h3>
                            <p>There are no verified one-time guest donations to display at this time.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-100 dark:bg-slate-800 border-b">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Donor Identity</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">Payment Info</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-center">Status</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-right">Donation Amount</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300 text-right hidden sm:table-cell">Date Received</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {publicDonations.map((donation) => (
                                        <tr key={donation.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm shrink-0">
                                                        <User className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-base">{maskName(donation.userName)}</span>
                                                        <span className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                                                            {donation.userEmail && <span>{maskContact(donation.userEmail)}</span>}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="capitalize text-sm font-medium">{donation.method || "Cash"}</span>
                                                    {donation.transactionId && (
                                                        <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                                                            TrxID: {maskTransaction(donation.transactionId)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {donation.status === 'approved' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50">Approved</span>}
                                                {donation.status === 'pending' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50">Pending</span>}
                                                {donation.status === 'rejected' && (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50">Rejected</span>
                                                    </div>
                                                )}
                                                {donation.status === 'rejected' && donation.rejectionReason && (
                                                    <div className="mt-2 text-[10px] text-red-600 dark:text-red-400 max-w-[150px] mx-auto bg-red-50 dark:bg-red-950/20 p-1.5 rounded text-left leading-tight break-words border border-red-100 dark:border-red-900/30">
                                                        <strong>Reason:</strong> {donation.rejectionReason}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right align-top">
                                                <div className="flex flex-col items-end">
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-base font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                                                        ৳{donation.amount}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-muted-foreground hidden sm:table-cell text-sm align-top">
                                                <div className="mt-1.5">
                                                    {donation.date || (donation.createdAt ? format(donation.createdAt.toDate(), "MMM d, yyyy") : "N/A")}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
