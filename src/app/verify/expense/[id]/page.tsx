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
import { ShieldCheck, ShieldAlert, Loader2, ArrowLeft, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ExpenseVerificationPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [expense, setExpense] = useState<any | null>(null);
    const [exists, setExists] = useState(false);

    useEffect(() => {
        if (!id) return;

        const fetchExpense = async () => {
            try {
                const docRef = doc(db, "expenses", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setExpense({
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
                console.error("Error verifying expense:", error);
                setExists(false);
            } finally {
                setLoading(false);
            }
        };

        fetchExpense();
    }, [id]);

    const handleBack = () => {
        router.push("/");
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center py-12 px-4 relative overflow-hidden">
            {/* Background Decorative Blobs */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-slate-400/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-red-400/10 blur-[120px] pointer-events-none" />

            <AnimatePresence mode="wait">
                {loading ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex flex-col items-center gap-4 text-center"
                    >
                        <Loader2 className="h-12 w-12 text-slate-700 animate-spin" />
                        <p className="text-muted-foreground font-medium animate-pulse">Querying secure audit ledger...</p>
                    </motion.div>
                ) : exists && expense ? (
                    <motion.div
                        key="verified"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="w-full max-w-xl"
                    >
                        <Card className="border-slate-200/60 dark:border-slate-800/40 shadow-[0_10px_40px_rgba(30,41,59,0.08)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden relative">
                            {/* Crimson red stripe indicating expenditure outflow */}
                            <div className="absolute top-0 left-0 right-0 h-2 bg-red-500" />

                            <CardHeader className="text-center pt-8">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 120, delay: 0.2 }}
                                    className="mx-auto bg-slate-50 dark:bg-slate-950/20 text-slate-800 dark:text-slate-200 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-4 shadow-sm border border-slate-200/60 dark:border-slate-900/30"
                                >
                                    <ShieldCheck className="h-10 w-10 text-slate-700 dark:text-slate-400" />
                                </motion.div>
                                <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2">
                                    Voucher Verified
                                </CardTitle>
                                <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">
                                    Official Expenditure Slip — Transparency Ledger Authenticated
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6 px-6 sm:px-8">
                                {/* Large Amount Display */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 p-5 rounded-2xl text-center"
                                >
                                    <span className="text-xs text-red-600 dark:text-red-400 uppercase tracking-widest font-bold block mb-1">
                                        Disbursed Amount
                                    </span>
                                    <span className="text-3xl font-extrabold text-red-600 dark:text-red-400">
                                        ৳ {Number(expense.amount).toLocaleString()} BDT
                                    </span>
                                </motion.div>

                                {/* Transaction Parameters */}
                                <div className="space-y-3 pt-2">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expenditure Voucher Record</h4>
                                    
                                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 text-sm">
                                        <span className="text-muted-foreground font-medium">Slip Number</span>
                                        <span className="col-span-2 text-foreground font-semibold text-right">
                                            {ReceiptService.getExpenseCode(expense.id, expense.date)}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 text-sm">
                                        <span className="text-muted-foreground font-medium">Expenditure Title</span>
                                        <span className="col-span-2 text-foreground font-semibold text-right">{expense.title || "Untitled Expense"}</span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 text-sm">
                                        <span className="text-muted-foreground font-medium">Disbursement Date</span>
                                        <span className="col-span-2 text-foreground font-semibold text-right">
                                            {format(expense.date, "MMMM d, yyyy h:mm a")}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 text-sm">
                                        <span className="text-muted-foreground font-medium">Category</span>
                                        <span className="col-span-2 text-right">
                                            <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 font-bold border-none">
                                                {expense.category || "Operational"}
                                            </Badge>
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 text-sm">
                                        <span className="text-muted-foreground font-medium">Recorded By</span>
                                        <span className="col-span-2 text-foreground font-semibold text-right">{expense.recordedBy || "Admin"}</span>
                                    </div>

                                    {expense.notes && (
                                        <div className="flex flex-col gap-1 border-b border-slate-100 dark:border-slate-800 pb-2 text-sm">
                                            <span className="text-muted-foreground font-medium">Expense Memo / Notes</span>
                                            <span className="text-foreground text-left bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-xs leading-relaxed">
                                                {expense.notes}
                                            </span>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 text-sm">
                                        <span className="text-muted-foreground font-medium">Ledger Status</span>
                                        <span className="col-span-2 text-right">
                                            <Badge className="bg-slate-700 text-white hover:bg-slate-800 border-none font-bold">
                                                AUDITED & BILLED
                                            </Badge>
                                        </span>
                                    </div>
                                </div>

                                {/* Transparency Guarantee Note */}
                                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 p-4 text-xs text-muted-foreground space-y-2 mt-4">
                                    <div className="flex gap-2">
                                        <Activity className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                        <p>
                                            In accordance with our strict transparency practices, all foundation expenses are published dynamically on our public tracking portal. This voucher represents a fully documented social impact or operational expenditure.
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                    <Button variant="outline" onClick={handleBack} className="w-full flex-1">
                                        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
                                    </Button>
                                    <Button 
                                        className="w-full flex-1 bg-slate-700 hover:bg-slate-800 text-white border-none shadow-md shadow-slate-500/10" 
                                        onClick={() => ReceiptService.exportExpenseSlip(expense)}
                                    >
                                        Download Payment Slip
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
                                    Unverified Voucher
                                </CardTitle>
                                <CardDescription className="text-red-600 dark:text-red-500 font-medium">
                                    Verification Failed
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-5 text-center px-6 pb-8">
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    This expenditure voucher ID could not be matched with any recorded entry in the Rangdhanu Charity Foundation database.
                                </p>
                                <p className="text-xs text-red-600 dark:text-red-400/80 bg-red-50/50 dark:bg-red-950/10 p-3 rounded-lg border border-red-100/40 dark:border-red-900/20">
                                    **Warning:** Please do not trust financial slips that fail database audit verification.
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
