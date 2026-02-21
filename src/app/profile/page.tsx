"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notification-context";
import { useMessages } from "@/lib/message-context";
import { useRouter, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Section } from "@/components/layout/section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Camera, Save, User as UserIcon, Mail, Calendar, Heart, Shield, Eye, EyeOff, LayoutDashboard, Bell, Check, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { doc, updateDoc, collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { format } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { useSettings, SettingsProvider } from "@/lib/settings-context";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

function DonationRequestForm({ user, paymentHistory, onSuccess }: { user: any, paymentHistory: any[], onSuccess: () => void }) {
    const { toast } = useToast();
    const { settings } = useSettings();
    const [formData, setFormData] = useState({
        amount: "",
        type: "monthly",
        method: "bkash",
        transactionId: "",
        userDate: "",
        notes: "",
        months: [new Date().getMonth() + 1], // Default to current month
        year: new Date().getFullYear().toString(),
        allocations: {} as Record<number, string> // month -> amount
    });

    // Sync selected months with active months from settings
    useEffect(() => {
        if (!settings || formData.type !== 'monthly') return;

        const activeMonths = settings.collectionMonths?.[Number(formData.year)] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

        setFormData(prev => {
            const validMonths = prev.months.filter(m => activeMonths.includes(m));

            // If nothing changed, return previous state to avoid infinite loop
            if (validMonths.length === prev.months.length) return prev;

            // Clean up allocations for removed months
            const newAllocations = { ...prev.allocations };
            prev.months.forEach(m => {
                if (!validMonths.includes(m)) {
                    delete newAllocations[m];
                }
            });

            return {
                ...prev,
                months: validMonths,
                allocations: newAllocations
            };
        });
    }, [settings, formData.year, formData.type]);

    const paidMonths = useMemo(() => {
        if (formData.type !== 'monthly') return [];
        return formData.months.filter(m =>
            paymentHistory.some(p =>
                p.type === 'monthly' &&
                p.month === m &&
                p.year === Number(formData.year)
            )
        );
    }, [formData.type, formData.months, formData.year, paymentHistory]);

    const toggleMonth = (month: number) => {
        setFormData(prev => {
            const currentMonths = prev.months;
            if (currentMonths.includes(month)) {
                // Prevent deselecting if it's the only one? No, allow.
                const newAllocations = { ...prev.allocations };
                delete newAllocations[month];
                return { ...prev, months: currentMonths.filter(m => m !== month), allocations: newAllocations };
            } else {
                return { ...prev, months: [...currentMonths, month].sort((a, b) => a - b) };
            }
        });
    };

    const handleAllocationChange = (month: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            allocations: {
                ...prev.allocations,
                [month]: value
            }
        }));
    };

    const handleAllocationBlur = () => {
        setFormData(prev => {
            if (prev.type !== 'monthly' || prev.months.length < 2) return prev;

            const total = Number(prev.amount) || 0;
            if (total <= 0) return prev;

            const emptyMonths = prev.months.filter(m => !prev.allocations[m]);

            // Auto fill only if exactly one month is empty
            if (emptyMonths.length === 1) {
                const currentSum = prev.months.reduce((sum, m) => sum + (Number(prev.allocations[m]) || 0), 0);
                if (currentSum < total) {
                    return {
                        ...prev,
                        allocations: {
                            ...prev.allocations,
                            [emptyMonths[0]]: (total - currentSum).toString()
                        }
                    };
                }
            }
            return prev;
        });
    };

    const totalAmount = Number(formData.amount) || 0;
    const allocatedSum = formData.months.reduce((sum, m) => sum + (Number(formData.allocations[m]) || 0), 0);
    const isOverAllocated = formData.months.length > 1 && totalAmount > 0 && allocatedSum > totalAmount;
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { addDoc, collection, Timestamp } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");

            if (formData.type === 'monthly') {
                if (formData.months.length === 0) {
                    toast({ title: "Error", description: "Please select at least one active month.", variant: "destructive" });
                    return;
                }
                const activeMonths = settings.collectionMonths?.[Number(formData.year)] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                if (formData.months.some(m => !activeMonths.includes(m))) {
                    toast({ title: "Error", description: "One or more selected months are inactive or have been removed.", variant: "destructive" });
                    return;
                }
            }

            if (isOverAllocated) {
                toast({ title: "Consistency Error", description: "Distributed amounts cannot exceed total amount.", variant: "destructive" });
                return;
            }

            const userTimestamp = formData.userDate ? Timestamp.fromDate(new Date(formData.userDate)) : Timestamp.now();

            let allocationsToSave = {};
            if (formData.type === 'monthly') {
                if (formData.months.length === 1) {
                    // Auto-allocate 100% to the single month behind the scenes
                    allocationsToSave = { [formData.months[0]]: formData.amount };
                } else if (formData.months.length > 1) {
                    allocationsToSave = formData.allocations;
                }
            }

            await addDoc(collection(db, "donation_requests"), {
                userId: user.id,
                userName: user.name || user.username,
                userEmail: user.email,
                amount: Number(formData.amount),
                type: formData.type,
                method: formData.method,
                transactionId: formData.transactionId,
                userDate: userTimestamp,
                notes: formData.notes,
                status: "pending",
                createdAt: Timestamp.now(),
                // Add specific months/year if monthly
                ...(formData.type === 'monthly' && {
                    months: formData.months,
                    year: Number(formData.year),
                    allocations: allocationsToSave
                })
            });

            toast({
                title: "Request Submitted",
                description: "Your donation request has been sent for approval."
            });
            setFormData(prev => ({
                ...prev,
                amount: "",
                transactionId: "",
                notes: "",
                months: [new Date().getMonth() + 1],
                allocations: {}
            }));
            onSuccess();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to submit request.", variant: "destructive" });
        }
    };

    return (
        <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="amount">Total Amount (BDT)</Label>
                    <Input
                        id="amount"
                        type="number"
                        placeholder="500"
                        min="10"
                        required
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    />
                    {formData.type === 'monthly' && formData.months.length > 0 && formData.amount ? (
                        <div className="text-xs text-muted-foreground mt-1">
                            ~{(Number(formData.amount) / formData.months.length).toFixed(0)} BDT per month
                        </div>
                    ) : null}
                </div>
                <div>
                    <Label htmlFor="type">Type</Label>
                    <select
                        id="type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                    >
                        <option value="monthly">Monthly Subscription</option>
                        <option value="one-time">One-time Donation</option>
                    </select>
                </div>
            </div>

            {formData.type === 'monthly' && (
                <div className="grid grid-cols-1 gap-4 p-4 bg-muted/20 rounded-md border border-muted">
                    <div>
                        <Label className="mb-2 block">Select Months</Label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {/* Always map over 1-12 to keep grid intact, but disable inactive ones */}
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                                const activeMonths = settings.collectionMonths?.[Number(formData.year)] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                                const isActive = activeMonths.includes(m);
                                const isSelected = formData.months.includes(m);
                                const isAlreadyPaid = paidMonths.includes(m);

                                return (
                                    <div
                                        key={m}
                                        onClick={() => isActive && toggleMonth(m)}
                                        className={`
                                            text-center text-xs py-2 rounded border select-none transition-colors
                                            ${!isActive
                                                ? "bg-muted/50 text-muted-foreground/50 border-input/50 cursor-not-allowed"
                                                : isSelected
                                                    ? isAlreadyPaid
                                                        ? "bg-yellow-500 text-white border-yellow-600 font-medium cursor-pointer"
                                                        : "bg-primary text-primary-foreground border-primary font-medium cursor-pointer"
                                                    : isAlreadyPaid
                                                        ? "bg-yellow-100/50 hover:bg-yellow-100 border-yellow-200 text-yellow-800 cursor-pointer"
                                                        : "bg-background hover:bg-muted border-input text-muted-foreground hover:text-foreground cursor-pointer"}
                                        `}
                                    >
                                        {format(new Date(2000, m - 1, 1), 'MMM')}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="year">Year</Label>
                        <select
                            id="year"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={formData.year}
                            onChange={e => {
                                const newYear = e.target.value;
                                setFormData({ ...formData, year: newYear, months: [] });
                            }}
                        >
                            {settings.collectionYears.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                    {/* Monthly Allocations (Optional) - Only show if more than 1 month selected */}
                    {formData.months.length > 1 && formData.amount && (
                        <div className="col-span-1 space-y-2 pt-2 border-t border-muted">
                            <Label className="text-xs text-muted-foreground">Optional: Distribute Amount per Month</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {formData.months.map(m => (
                                    <div key={m} className="flex items-center gap-2">
                                        <span className="text-xs w-12">{format(new Date(2000, m - 1, 1), 'MMM')}</span>
                                        <Input
                                            type="number"
                                            className="h-8 text-xs"
                                            placeholder="Amount"
                                            value={formData.allocations[m] || ""}
                                            onChange={e => handleAllocationChange(m, e.target.value)}
                                            onBlur={handleAllocationBlur}
                                        />
                                    </div>
                                ))}
                            </div>
                            {isOverAllocated && (
                                <Alert variant="destructive" className="mt-2 py-2 bg-red-50 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertDescription className="text-xs">
                                        Total allocated (৳{allocatedSum}) exceeds the donation amount (৳{totalAmount}).
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}
                    {paidMonths.length > 0 && (
                        <div className="col-span-1">
                            <Alert variant="destructive" className="bg-yellow-50 text-yellow-900 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-200 dark:border-yellow-800">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Already Paid</AlertTitle>
                                <AlertDescription>
                                    Already paid for: {paidMonths.map(m => format(new Date(2000, m - 1, 1), 'MMM')).join(', ')}.
                                    Proceeding will add extra payments.
                                </AlertDescription>
                            </Alert>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="method">Payment Method</Label>
                    <select
                        id="method"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={formData.method}
                        onChange={e => setFormData({ ...formData, method: e.target.value })}
                    >
                        <option value="bkash">Bkash</option>
                        <option value="nagad">Nagad</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="cash">Cash</option>
                    </select>
                </div>
                <div>
                    <Label htmlFor="userDate">Date of Payment</Label>
                    <Input
                        id="userDate"
                        type="date"
                        required
                        value={formData.userDate}
                        onChange={e => setFormData({ ...formData, userDate: e.target.value })}
                    />
                </div>
            </div>
            <div>
                <Label htmlFor="transactionId">Transaction ID / Last 4 digits</Label>
                <Input
                    id="transactionId"
                    placeholder="e.g. 8JSH... or 1234"
                    required
                    value={formData.transactionId}
                    onChange={e => setFormData({ ...formData, transactionId: e.target.value })}
                />
            </div>
            <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                    id="notes"
                    placeholder="Additional details..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Submit Request</Button>
        </form>
    );
}

function ProfileContent() {
    const { user, isLoading: loading, changePassword, updateProfile } = useAuth();
    const router = useRouter();
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = useNotifications();
    const { messages, unreadMessageCount, markMessageAsRead, deleteMessage, clearAllMessages } = useMessages();

    const [myRequests, setMyRequests] = useState<any[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);

    const [isDonationHistoryOpen, setIsDonationHistoryOpen] = useState(true);
    const [isMyRequestsOpen, setIsMyRequestsOpen] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
    const { settings } = useSettings();

    // Calendar Matrix Logic
    const availableYears = useMemo(() => {
        if (!settings || !settings.collectionYears || settings.collectionYears.length === 0) {
            return [new Date().getFullYear()];
        }
        return [...settings.collectionYears].sort((a, b) => b - a); // Newest first
    }, [settings]);

    const [selectedCalendarYear, setSelectedCalendarYear] = useState(new Date().getFullYear());

    const activeMonths = useMemo(() => {
        if (!settings) return [];
        const months = settings.collectionMonths?.[selectedCalendarYear] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        return months.map(m => ({
            value: m,
            label: format(new Date(selectedCalendarYear, m - 1, 1), "MMM")
        })).sort((a, b) => a.value - b.value);
    }, [settings, selectedCalendarYear]);

    const getMonthlyStatus = (month: number, year: number) => {
        const payment = paymentHistory.find(p =>
            !p.hiddenFromProfile &&
            p.type === 'monthly' &&
            p.month === month &&
            p.year === year
        );

        if (payment) return { status: 'paid', payment };

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const currentDate = new Date().getDate();

        if (year > currentYear) return { status: 'future' };
        if (year < currentYear) return { status: 'due-red' };

        if (month > currentMonth) return { status: 'future' };
        if (month < currentMonth) return { status: 'due-red' };

        return currentDate <= 10 ? { status: 'due-yellow' } : { status: 'due-red' };
    };

    const handleHidePayment = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await updateDoc(doc(db, "payments", id), { hiddenFromProfile: true });
            toast({ title: "Deleted", description: "Record deleted from your profile." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete record.", variant: "destructive" });
        }
    };

    const handleHideRequest = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await updateDoc(doc(db, "donation_requests", id), { hiddenFromProfile: true });
            toast({ title: "Deleted", description: "Request deleted from your profile." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete request.", variant: "destructive" });
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin': return 'destructive';
            case 'moderator': return 'secondary';
            case 'volunteer': return 'default';
            default: return 'outline';
        }
    };

    const renderMarkdown = (text: string) => {
        if (!text) return null;

        // Split text by markdown tokens and URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;

        // First handle basic markdown tokens
        const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\n- .*)/g);

        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={index}>{part.slice(1, -1)}</em>;
            }
            if (part.startsWith('\n- ')) {
                return <li key={index} className="ml-4">{part.substring(3)}</li>;
            }

            // If it's normal text, look for URLs
            if (urlRegex.test(part)) {
                const subParts = part.split(urlRegex);
                return (
                    <span key={index}>
                        {subParts.map((subPart, subIndex) => {
                            if (subPart.match(urlRegex)) {
                                return (
                                    <a
                                        key={subIndex}
                                        href={subPart}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 underline break-all"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {subPart}
                                    </a>
                                );
                            }
                            return <span key={subIndex}>{subPart}</span>;
                        })}
                    </span>
                );
            }

            return <span key={index}>{part}</span>;
        });
    };

    // Fetch My Requests
    useEffect(() => {
        if (user) {
            const q = query(
                collection(db, "donation_requests"),
                where("userId", "==", user.id)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const reqs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    rawDate: doc.data().createdAt
                }))
                    .sort((a, b) => {
                        const dateA = a.rawDate?.toDate ? a.rawDate.toDate() : new Date(a.rawDate || 0);
                        const dateB = b.rawDate?.toDate ? b.rawDate.toDate() : new Date(b.rawDate || 0);
                        return dateB.getTime() - dateA.getTime();
                    });
                setMyRequests(reqs);
                setLoadingRequests(false);
            });
            return () => unsubscribe();
        }
    }, [user]);

    // Financial State
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            redirect("/login");
        }
    }, [user, loading]);

    // Fetch Payments
    useEffect(() => {
        if (user) {
            const q = query(
                collection(db, "payments"),
                where("userId", "==", user.id)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const payments = snapshot.docs
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        rawDate: doc.data().date, // Keep raw for display
                        rawCreatedAt: doc.data().createdAt // For sorting
                    }))
                    .sort((a, b) => {
                        const dateA = a.rawCreatedAt?.toDate ? a.rawCreatedAt.toDate() : (a.rawDate?.toDate ? a.rawDate.toDate() : new Date(a.rawDate || 0));
                        const dateB = b.rawCreatedAt?.toDate ? b.rawCreatedAt.toDate() : (b.rawDate?.toDate ? b.rawDate.toDate() : new Date(b.rawDate || 0));
                        return dateB.getTime() - dateA.getTime();
                    })
                    .map(item => ({
                        ...item,
                        date: item.rawDate?.toDate ? format(item.rawDate.toDate(), "yyyy-MM-dd") : item.rawDate
                    }));

                setPaymentHistory(payments);
                setLoadingPayments(false);
            });

            return () => unsubscribe();
        }
    }, [user]);

    const [newPassword, setNewPassword] = useState("");
    const [oldPassword, setOldPassword] = useState("");
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        name: "",
        username: "",
        email: "",
        photoURL: ""
    });
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setEditForm({
                name: user.name || "",
                username: user.username || "",
                email: user.email || "",
                photoURL: user.photoURL || ""
            });
        }
    }, [user]);


    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        const success = await changePassword(newPassword, oldPassword);
        if (success) {
            toast({ title: "Success", description: "Password updated successfully!" });
            setNewPassword("");
            setOldPassword("");
        } else {
            toast({ title: "Error", description: "Failed to update password. Check your old password.", variant: "destructive" });
        }
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await updateProfile(editForm);
        if (res.success) {
            toast({ title: "Success", description: "Profile updated successfully!" });
            setIsEditing(false);
        } else {
            toast({ title: "Error", description: res.error || "Failed to update profile", variant: "destructive" });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 200 * 1024) { // 200KB limit
                toast({ title: "Error", description: "Image size too large. Please use an image under 200KB.", variant: "destructive" });
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setEditForm(prev => ({ ...prev, photoURL: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSwitchToAdmin = () => {
        router.push("/admin");
    };

    if (loading) return <div className="p-8 text-center">Loading profile...</div>;
    if (!user) return null;

    return (
        <div className="container mx-auto py-8 px-4">
            {/* Header with Notification Bell & Messages */}
            <div className="flex justify-end gap-3 mb-4">

                {/* Messages Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="relative">
                            <MessageSquare className="h-5 w-5" />
                            {unreadMessageCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                                    {unreadMessageCount}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-96">
                        <DropdownMenuLabel className="flex justify-between items-center">
                            Messages
                            {unreadMessageCount > 0 && (
                                <div className="space-x-2">
                                    <Button variant="ghost" size="sm" className="text-xs h-6 px-2 text-destructive hover:bg-destructive/10" onClick={clearAllMessages}>
                                        Clear all
                                    </Button>
                                </div>
                            )}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="max-h-[400px] overflow-y-auto">
                            {messages.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    No messages
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div key={msg.id} className={`relative group p-4 border-b last:border-0 transition-colors ${!msg.read ? 'bg-blue-50/30' : 'hover:bg-muted/50'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-semibold flex items-center gap-2">
                                                {msg.senderName}
                                                {!msg.read && <div className="h-2 w-2 rounded-full bg-blue-600 inline-block" />}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">
                                                    {format(msg.createdAt, "MMM d, h:mm a")}
                                                </span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground shrink-0 hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id); }}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        {msg.subject && <div className="text-sm font-semibold mb-2">{msg.subject}</div>}
                                        <div
                                            className={`text-sm text-foreground whitespace-pre-wrap line-clamp-3 cursor-pointer`}
                                            onClick={() => {
                                                if (!msg.read) markMessageAsRead(msg.id);
                                                setSelectedMessage(msg);
                                            }}
                                            title="Click to view full message"
                                        >
                                            <ul className="list-disc list-inside space-y-1">
                                                {renderMarkdown(msg.content)}
                                            </ul>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Notifications Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="relative">
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">
                                    {unreadCount}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                        <DropdownMenuLabel className="flex justify-between items-center">
                            Notifications
                            {unreadCount > 0 && (
                                <div className="space-x-2">
                                    <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={markAllAsRead}>
                                        Mark read
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-xs h-6 px-2 text-destructive hover:bg-destructive/10" onClick={clearAllNotifications}>
                                        Clear all
                                    </Button>
                                </div>
                            )}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <div className="max-h-[300px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    No notifications
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <DropdownMenuItem key={notification.id} className="cursor-pointer flex flex-col items-start gap-1 p-3" onClick={() => markAsRead(notification.id)}>
                                        <div className="flex justify-between w-full">
                                            <div className="flex-1">
                                                <span className={`font-medium text-sm ${!notification.read ? "text-primary" : ""}`}>
                                                    {notification.message}
                                                </span>
                                                {!notification.read && <div className="h-2 w-2 rounded-full bg-primary inline-block ml-2 align-middle" />}
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {format(notification.createdAt, "MMM d, h:mm a")}
                                        </span>
                                    </DropdownMenuItem>
                                ))
                            )}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                {/* Left Sidebar: Avatar & Basic Info */}
                <div className="flex flex-col items-center md:items-start gap-4 w-full md:w-auto">
                    <div className="relative group">
                        <Avatar className="w-32 h-32 border-4 border-primary shadow-lg">
                            <AvatarImage src={user.photoURL || "/default-avatar.png"} alt={user.name || "User"} />
                            <AvatarFallback className="text-5xl font-bold">{user.name ? user.name.charAt(0) : <UserIcon className="h-16 w-16" />}</AvatarFallback>
                        </Avatar>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Camera className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="text-center md:text-left">
                        <div className="flex flex-col items-center md:items-start gap-1">
                            <h2 className="text-2xl font-semibold">{user.name}</h2>
                            <div className="flex flex-wrap gap-1 justify-center md:justify-start">
                                {user.roles?.map((role: string) => (
                                    <Badge key={role} variant={getRoleBadgeColor(role) as any} className="capitalize">
                                        {role}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-1">
                            <Mail className="h-4 w-4" /> {user.email}
                        </p>
                        {user.username && (
                            <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-1">
                                <UserIcon className="h-4 w-4" /> @{user.username}
                            </p>
                        )}
                        {user.createdAt && (
                            <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-1">
                                <Calendar className="h-4 w-4" /> Joined {user.createdAt?.toDate ? format(user.createdAt.toDate(), "PPP") : new Date(user.createdAt).toLocaleDateString()}
                            </p>
                        )}

                        <div className="flex flex-col gap-2 mt-4">

                            <Button variant="outline" onClick={() => setIsEditing(!isEditing)} className="w-full">
                                {isEditing ? "Cancel Edit" : "Edit Profile"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 w-full space-y-6">
                    <Section>
                        {/* Edit Profile Form */}
                        {isEditing ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Edit Profile</CardTitle>
                                    <CardDescription>Update your personal information</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleProfileUpdate} className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="edit-name">Name</Label>
                                            <Input
                                                id="edit-name"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit-username">Username</Label>
                                            <Input
                                                id="edit-username"
                                                value={editForm.username}
                                                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit-email">Email</Label>
                                            <Input
                                                id="edit-email"
                                                value={editForm.email}
                                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="md:col-span-2 flex justify-end">
                                            <Button type="submit">Save Changes</Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2">
                                {/* Financial Summary */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Financial Summary</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {(() => {
                                            // Financial logic
                                            const totalContributed = paymentHistory.reduce((sum, item) => sum + Number(item.amount), 0);
                                            const paidMonthsCount = new Set(paymentHistory.filter(p => p.type === 'monthly').map(p => `${p.month}-${p.year}`)).size;

                                            // Passed months calculation
                                            let totalPassedMonths = 0;
                                            const currentMonth = new Date().getMonth() + 1;
                                            const currentYear = new Date().getFullYear();

                                            if (settings && settings.collectionYears) {
                                                settings.collectionYears.forEach(year => {
                                                    const activeMonths = settings.collectionMonths?.[year] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                                                    if (year < currentYear) {
                                                        totalPassedMonths += activeMonths.length;
                                                    } else if (year === currentYear) {
                                                        totalPassedMonths += activeMonths.filter(m => m <= currentMonth).length;
                                                    }
                                                });
                                            }

                                            const monthsDue = Math.max(0, totalPassedMonths - paidMonthsCount);

                                            // Period label calculation based on actual admin settings
                                            let periodLabel = "Lifetime";
                                            if (settings && settings.collectionYears && settings.collectionYears.length > 0) {
                                                const earliestYear = Math.min(...settings.collectionYears);
                                                const monthsForYear = settings.collectionMonths?.[earliestYear] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                                                const earliestMonth = Math.min(...monthsForYear);

                                                try {
                                                    const dateObj = new Date(earliestYear, earliestMonth - 1, 1);
                                                    const d1 = dateObj.toLocaleDateString('default', { month: 'short', year: 'numeric' });
                                                    periodLabel = `From ${d1} - Present`;
                                                } catch (e) {
                                                    periodLabel = `From ${earliestYear} - Present`;
                                                }
                                            } else if (paymentHistory.length > 0) {
                                                // Fallback if settings are somehow unavailable
                                                const earliestDate = paymentHistory[paymentHistory.length - 1].date;
                                                const latestDate = paymentHistory[0].date;

                                                try {
                                                    const d1 = new Date(earliestDate).toLocaleDateString('default', { month: 'short', year: 'numeric' });
                                                    const d2 = new Date(latestDate).toLocaleDateString('default', { month: 'short', year: 'numeric' });
                                                    periodLabel = `From ${d1} - ${d2}`;
                                                } catch (e) { }
                                            }

                                            return (
                                                <>
                                                    <div className="flex justify-between items-center pb-2 border-b">
                                                        <div>
                                                            <span className="text-sm text-muted-foreground block">Total Contributed</span>
                                                            <span className="text-[10px] text-muted-foreground">{periodLabel}</span>
                                                        </div>
                                                        <span className="font-bold text-green-600">
                                                            ৳ {loadingPayments ? "..." : totalContributed.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center pb-2 border-b">
                                                        <span className="text-sm text-muted-foreground">Total Passed Months</span>
                                                        <span className="font-medium">
                                                            {loadingPayments ? "..." : totalPassedMonths}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center pb-2 border-b">
                                                        <span className="text-sm text-muted-foreground">Months Paid</span>
                                                        <span className="font-medium text-blue-600">
                                                            {loadingPayments ? "..." : paidMonthsCount}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center pb-2 border-b">
                                                        <span className="text-sm text-muted-foreground">Months Due</span>
                                                        <span className="font-medium text-red-600">
                                                            {loadingPayments ? "..." : monthsDue}
                                                        </span>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                        <div className="pt-2">
                                            <Dialog open={isDonateModalOpen} onOpenChange={setIsDonateModalOpen}>
                                                <DialogTrigger asChild>
                                                    <Button className="w-full bg-gradient-to-r from-blue-600 to-pink-500 hover:opacity-90">
                                                        <Heart className="mr-2 h-4 w-4" /> Donate Now
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                                    <DialogHeader>
                                                        <DialogTitle className="flex items-center text-blue-700">
                                                            <Heart className="mr-2 h-5 w-5 fill-pink-500 text-pink-500" />
                                                            Make a Donation Request
                                                        </DialogTitle>
                                                        <DialogDescription>
                                                            Submit a request to donate. Admin will verify and approve.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <DonationRequestForm user={user} paymentHistory={paymentHistory} onSuccess={() => setIsDonateModalOpen(false)} />
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Security / Change Password */}
                                <Card className="md:col-span-2">
                                    <CardHeader>
                                        <CardTitle>Security</CardTitle>
                                        <CardDescription>Update your password.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleChangePassword} className="space-y-4">
                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="old-password">Current Password</Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="old-password"
                                                            type={showOldPassword ? "text" : "password"}
                                                            value={oldPassword}
                                                            onChange={(e) => setOldPassword(e.target.value)}
                                                            placeholder="Enter current password"
                                                            required
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                            onClick={() => setShowOldPassword(!showOldPassword)}
                                                        >
                                                            {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="new-password">New Password</Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="new-password"
                                                            type={showNewPassword ? "text" : "password"}
                                                            value={newPassword}
                                                            onChange={(e) => setNewPassword(e.target.value)}
                                                            placeholder="Enter new password"
                                                            required
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                                        >
                                                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex justify-end">
                                                <Button type="submit">Update Password</Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>

                                {/* Annual Collection Calendar */}
                                <Card className="md:col-span-2 border-t-4 border-t-primary/20">
                                    <CardHeader>
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                            <div>
                                                <CardTitle className="flex items-center gap-2">
                                                    <Calendar className="h-5 w-5 text-primary" /> Annual Collection Calendar
                                                </CardTitle>
                                                <CardDescription>Visual summary of your monthly subscriptions.</CardDescription>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">Year:</span>
                                                <Select
                                                    value={selectedCalendarYear.toString()}
                                                    onValueChange={(v) => setSelectedCalendarYear(Number(v))}
                                                >
                                                    <SelectTrigger className="w-[100px] h-9 font-bold bg-background">
                                                        <SelectValue placeholder="Year" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableYears.map(y => (
                                                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                                            {(!settings?.collectionYears?.includes(selectedCalendarYear) || activeMonths.length === 0) ? (
                                                <div className="text-center py-8 text-muted-foreground col-span-full">
                                                    No collections active for this year.
                                                </div>
                                            ) : (
                                                activeMonths.map((month) => {
                                                    const statusData = getMonthlyStatus(month.value, selectedCalendarYear);

                                                    let bgClass = "bg-background border-dashed border-2 opacity-50";
                                                    let textClass = "text-muted-foreground";
                                                    let valueDisplay = null;

                                                    if (statusData.status === 'paid') {
                                                        bgClass = "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 border-2";
                                                        textClass = "text-green-700 dark:text-green-400 font-bold";
                                                        valueDisplay = `৳${statusData.payment?.amount || 0}`;
                                                    } else if (statusData.status === 'due-yellow') {
                                                        bgClass = "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800 border-2";
                                                        textClass = "text-yellow-700 dark:text-yellow-400 font-medium";
                                                        valueDisplay = "Due";
                                                    } else if (statusData.status === 'due-red') {
                                                        bgClass = "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 border-2";
                                                        textClass = "text-red-700 dark:text-red-400 font-medium";
                                                        valueDisplay = "Overdue";
                                                    }

                                                    return (
                                                        <div key={month.value} className={`flex flex-col justify-center items-center p-3 rounded-lg transition-all ${bgClass}`}>
                                                            <span className={`text-sm tracking-wide ${statusData.status === 'future' ? textClass : 'text-foreground font-semibold'}`}>{month.label}</span>
                                                            <span className={`text-sm mt-1 ${textClass}`}>
                                                                {valueDisplay || "-"}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>

                                        {/* Setup Legend */}
                                        <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t text-sm">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                <span className="text-muted-foreground">Paid</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                                <span className="text-muted-foreground">Due (before 10th)</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                                <span className="text-muted-foreground">Overdue</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Donation History */}
                                <Card className="md:col-span-2">
                                    <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setIsDonationHistoryOpen(!isDonationHistoryOpen)}>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <CardTitle className="flex items-center gap-2">
                                                    <Heart className="h-5 w-5 text-primary" /> Donation History
                                                </CardTitle>
                                                <CardDescription>Your past contributions.</CardDescription>
                                            </div>
                                            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                                                {isDonationHistoryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    {isDonationHistoryOpen && <CardContent>
                                        <div className="space-y-4">
                                            {loadingPayments ? (
                                                <div className="text-center py-4 text-muted-foreground">Loading history...</div>
                                            ) : paymentHistory.filter(d => !d.hiddenFromProfile).length === 0 ? (
                                                <div className="text-center py-4 text-muted-foreground">No donations to show.</div>
                                            ) : (
                                                paymentHistory.filter(d => !d.hiddenFromProfile).map((donation) => {
                                                    return (
                                                        <div key={donation.id} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
                                                            <div>
                                                                <p className="font-medium">{donation.method === 'bkash' ? 'Bkash Payment' : donation.type === 'monthly' ? 'Monthly Subscription' : 'One-time Donation'}</p>
                                                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                                    <Calendar className="h-3 w-3" />
                                                                    {(() => {
                                                                        try {
                                                                            if (donation.createdAt) {
                                                                                const dateObj = donation.createdAt?.toDate ? donation.createdAt.toDate() : new Date(donation.createdAt);
                                                                                return isNaN(dateObj.getTime()) ? donation.date : format(dateObj, "MMM d, yyyy h:mm a");
                                                                            } else {
                                                                                const dateObj = donation.rawDate?.toDate ? donation.rawDate.toDate() : new Date(donation.date);
                                                                                return isNaN(dateObj.getTime()) ? donation.date : format(dateObj, "MMM d, yyyy h:mm a");
                                                                            }
                                                                        } catch (e) {
                                                                            return donation.date || "Invalid Date";
                                                                        }
                                                                    })()}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <span className="font-bold text-primary">৳ {donation.amount}</span>
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={(e) => handleHidePayment(donation.id, e)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </CardContent>}
                                </Card>

                                {/* My Requests History */}
                                <Card className="md:col-span-2">
                                    <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setIsMyRequestsOpen(!isMyRequestsOpen)}>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <CardTitle className="flex items-center gap-2">
                                                    <Shield className="h-5 w-5 text-blue-600" /> My Requests
                                                </CardTitle>
                                                <CardDescription>Status of your submitted requests.</CardDescription>
                                            </div>
                                            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                                                {isMyRequestsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    {isMyRequestsOpen && <CardContent>
                                        {loadingRequests ? (
                                            <div className="text-center py-4 text-muted-foreground">Loading requests...</div>
                                        ) : myRequests.filter(r => !r.hiddenFromProfile).length === 0 ? (
                                            <div className="text-center py-4 text-muted-foreground">No active requests.</div>
                                        ) : (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Date</TableHead>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Amount</TableHead>
                                                        <TableHead>Status</TableHead>
                                                        <TableHead>Notes</TableHead>
                                                        <TableHead className="text-right"></TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {myRequests.filter((r: any) => !r.hiddenFromProfile).map((req: any) => (
                                                        <TableRow key={req.id}>
                                                            <TableCell className="text-xs">
                                                                {(() => {
                                                                    try {
                                                                        if (req.createdAt?.toDate) return format(req.createdAt.toDate(), "MMM d, yyyy h:mm a");
                                                                        if (req.rawDate?.toDate) return format(req.rawDate.toDate(), "MMM d, yyyy h:mm a");
                                                                        const dateObj = new Date(req.createdAt || req.rawDate || req.date);
                                                                        return isNaN(dateObj.getTime()) ? "-" : format(dateObj, "MMM d, yyyy h:mm a");
                                                                    } catch (e) {
                                                                        return "-";
                                                                    }
                                                                })()}
                                                            </TableCell>
                                                            <TableCell className="capitalize text-xs">{req.type}</TableCell>
                                                            <TableCell className="font-medium">৳{req.amount}</TableCell>
                                                            <TableCell>
                                                                <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'} className="capitalize">
                                                                    {req.status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={req.notes}>
                                                                {req.notes || "-"}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={(e) => handleHideRequest(req.id, e)}>
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        )}
                                    </CardContent>}
                                </Card>
                            </div>
                        )}
                    </Section>
                </div>
            </div>

            <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{selectedMessage?.subject || "Message"}</DialogTitle>
                        <DialogDescription>
                            From {selectedMessage?.senderName} on {selectedMessage?.createdAt ? format(selectedMessage.createdAt, "PPP 'at' p") : ""}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 text-sm whitespace-pre-wrap max-h-[60vh] overflow-y-auto w-full break-words">
                        <ul className="list-disc list-inside space-y-1">
                            {selectedMessage && renderMarkdown(selectedMessage.content)}
                        </ul>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <SettingsProvider>
            <ProfileContent />
        </SettingsProvider>
    );
}
