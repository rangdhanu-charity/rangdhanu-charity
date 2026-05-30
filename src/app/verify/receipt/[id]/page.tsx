"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ReceiptService } from "@/lib/receipt-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ShieldCheck, ShieldAlert, Loader2, ArrowLeft, Heart, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ReceiptVerificationPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [payment, setPayment] = useState<any | null>(null);
    const [exists, setExists] = useState(false);

    useEffect(() => {
        if (!id) return;

        const fetchPayment = async () => {
            try {
                const docRef = doc(db, "payments", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setPayment({
                        id: docSnap.id,
                        ...docSnap.data(),
                        date: docSnap.data().date?.toDate 
                            ? docSnap.data().date.toDate() 
                            : new Date(docSnap.data().date)
                    });
                    setExists(true);
                } else {
                    setExists(false);
                }
            } catch (error) {
                console.error("Error verifying receipt:", error);
                setExists(false);
            } finally {
                setLoading(false);
            }
        };

        fetchPayment();
    }, [id]);

    const handleBack = () => {
        router.push("/");
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center py-12 px-4 relative overflow-hidden">
            {/* Background Decorative Blobs */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-400/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-400/10 blur-[120px] pointer-events-none" />

            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center gap-4 text-center"
                    >
                        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                        <p className="text-muted-foreground font-medium animate-pulse">Querying secure records database...</p>
                    </motion.div>
                ) : exists && payment ? (
                    <motion.div
                        key="verified"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="w-full max-w-xl"
                    >
                        <Card className="border-emerald-200/60 dark:border-emerald-800/40 shadow-[0_10px_40px_rgba(16,185,129,0.08)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden relative">
                            {/* Accent indicator */}
                            <div className="absolute top-0 left-0 right-0 h-2 bg-emerald-500" />

                            <CardHeader className="text-center pt-8">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 120, delay: 0.2 }}
                                    className="mx-auto bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-4 shadow-sm border border-emerald-100 dark:border-emerald-900/30"
                                >
                                    <ShieldCheck className="h-10 w-10 animate-bounce" />
                                </motion.div>
                                <CardTitle className="text-2xl font-bold text-emerald-800 dark:text-emerald-400 flex items-center justify-center gap-2">
                                    Authenticity Verified
                                </CardTitle>
                                <CardDescription className="text-emerald-600 dark:text-emerald-500 font-medium">
                                    Official Donation Receipt — Verified Secure Record
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6 px-6 sm:px-8">
                                {/* Large Amount Display */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 p-5 rounded-2xl text-center"
                                >
                                    <span className="text-xs text-emerald-700 dark:text-emerald-500 uppercase tracking-widest font-bold block mb-1">
                                        Donated Amount
                                    </span>
                                    <span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
                                        ৳ {Number(payment.amount).toLocaleString()} BDT
                                    </span>
                                </motion.div>

                                {/* Transaction Parameters */}
                                <div className="space-y-3 pt-2">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Receipt Verification Ledger</h4>
                                    
                                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 text-sm">
                                        <span className="text-muted-foreground font-medium">Receipt Code</span>
                                        <span className="col-span-2 text-foreground font-semibold text-right">
                                            {ReceiptService.getDonationCode(payment.id, payment.date)}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 text-sm">
                                        <span className="text-muted-foreground font-medium">Donor Name</span>
                                        <span className="col-span-2 text-foreground font-semibold text-right">{payment.memberName || "Guest Donor"}</span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 text-sm">
                                        <span className="text-muted-foreground font-medium">Payment Date</span>
                                        <span className="col-span-2 text-foreground font-semibold text-right">
                                            {format(payment.date, "MMMM d, yyyy h:mm a")}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 text-sm">
                                        <span className="text-muted-foreground font-medium">Donation Type</span>
                                        <span className="col-span-2 text-foreground font-semibold text-right capitalize">
                                            {payment.type === "monthly" && payment.month && payment.year ? (
                                                <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                                                    {format(new Date(2000, payment.month - 1, 1), "MMMM")} {payment.year} (Monthly)
                                                </Badge>
                                            ) : (
                                                "One-time Donation"
                                            )}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 text-sm">
                                        <span className="text-muted-foreground font-medium">Method</span>
                                        <span className="col-span-2 text-foreground font-semibold text-right uppercase">{payment.method || "bkash"}</span>
                                    </div>

                                    {payment.transactionId && (
                                        <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 text-sm">
                                            <span className="text-muted-foreground font-medium">Transaction ID</span>
                                            <span className="col-span-2 text-foreground font-mono font-semibold text-right select-all">
                                                {payment.transactionId}
                                            </span>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 text-sm">
                                        <span className="text-muted-foreground font-medium">System Status</span>
                                        <span className="col-span-2 text-right">
                                            <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 border-none font-bold">
                                                RECORDED & APPROVED
                                            </Badge>
                                        </span>
                                    </div>
                                </div>

                                {/* Authenticity Guarantee Note */}
                                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 p-4 text-xs text-muted-foreground space-y-2 mt-4">
                                    <div className="flex gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                        <p>
                                            This page communicates directly with the secure servers of **Rangdhanu Charity Foundation** to verify that this financial transaction represents a valid and officially audited receipt.
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                    <Button variant="outline" onClick={handleBack} className="w-full flex-1">
                                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
                                    </Button>
                                    <Button 
                                        className="w-full flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md shadow-emerald-500/10" 
                                        onClick={() => ReceiptService.exportDonationReceipt(payment)}
                                    >
                                        Download PDF Receipt
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ) : (
                    <motion.div
                        key="unverified"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full max-w-md"
                    >
                        <Card className="border-red-200/60 dark:border-red-800/40 shadow-[0_10px_40px_rgba(239,68,68,0.08)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden relative">
                            <div className="absolute top-0 left-0 right-0 h-2 bg-red-500" />
                            
                            <CardHeader className="text-center pt-8">
                                <div className="mx-auto bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-4 border border-red-100 dark:border-red-900/30">
                                    <ShieldAlert className="h-10 w-10 animate-pulse" />
                                </div>
                                <CardTitle className="text-2xl font-bold text-red-800 dark:text-red-400">
                                    Unverified Receipt
                                </CardTitle>
                                <CardDescription className="text-red-600 dark:text-red-500 font-medium">
                                    Authenticity Check Failed
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-5 text-center px-6 pb-8">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    This receipt code or transaction ID could not be matched with any recorded entry in the Rangdhanu Charity Foundation database.
                                </p>
                                <p className="text-xs text-red-600 dark:text-red-400/80 bg-red-50/50 dark:bg-red-950/10 p-3 rounded-lg border border-red-100/40 dark:border-red-900/20">
                                    **Warning:** Please do not trust receipts that fail database verification. Ensure this is an official QR code printed on authorized slips.
                                </p>
                                <Button variant="outline" onClick={handleBack} className="w-full mt-2">
                                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
