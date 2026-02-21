"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { collection, query, getDocs, doc, deleteDoc, writeBatch, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFinance, Payment } from "@/lib/finance-context";
import { useSettings } from "@/lib/settings-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, X, Trash2, Edit, Plus, Menu, Settings2, Calculator, Calendar, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

// Types for our flexible column system
type ColumnConfig = {
    id: string; // "2024-1" for Jan 2024
    year: number;
    month: number; // 1-12
    label: string; // "Jan", "Feb" (Year implied by context now)
};

export default function CollectionsPage() {
    const { payments, addPayment, updatePayment, deletePayment, loading: financeLoading } = useFinance();
    const [activeTab, setActiveTab] = useState<"monthly" | "one-time">("monthly");
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const { toast } = useToast();

    const { settings, addCollectionYear, removeCollectionYear, loading: loadingSettings, toggleCollectionMonth } = useSettings();

    // --- Dynamic Columns State ---
    const allColumns = useMemo(() => {
        const cols: ColumnConfig[] = [];
        settings.collectionYears.forEach(y => {
            // Default to all 12 if collectionMonths is missing for a year
            const activeMonths = settings.collectionMonths?.[y] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
            activeMonths.forEach(month => {
                cols.push({
                    id: `${y}-${month}`,
                    year: y,
                    month: month,
                    label: format(new Date(y, month - 1, 1), "MMM")
                });
            });
        });
        return cols;
    }, [settings.collectionYears, settings.collectionMonths]);

    // Valid Years derived from columns
    const availableYears = useMemo(() => {
        const years = Array.from(new Set(allColumns.map(c => c.year))).sort((a, b) => a - b);
        return years.length > 0 ? years : [new Date().getFullYear()];
    }, [allColumns]);

    // Selected Year View
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // Effect: If selected year is gone, switch to nearest
    useEffect(() => {
        if (!availableYears.includes(selectedYear) && availableYears.length > 0) {
            setSelectedYear(availableYears[availableYears.length - 1]);
        }
    }, [availableYears, selectedYear]);

    // Visible Columns for Current View
    const visibleColumns = useMemo(() => {
        return allColumns
            .filter(c => c.year === selectedYear)
            .sort((a, b) => a.month - b.month);
    }, [allColumns, selectedYear]);


    // --- Inline Editing State ---
    const [editingCell, setEditingCell] = useState<{ userId: string, colId: string } | null>(null);
    const [editValue, setEditValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // --- Dialogs ---

    const [isOneTimeDialogOpen, setIsOneTimeDialogOpen] = useState(false);
    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [isManageViewOpen, setIsManageViewOpen] = useState(false);
    const [isRecordMonthlyOpen, setIsRecordMonthlyOpen] = useState(false);

    // --- Admin Multi-Month Form State ---
    const [multiMonthFormData, setMultiMonthFormData] = useState({
        amount: "",
        year: new Date().getFullYear().toString(),
        months: [] as number[],
        allocations: {} as Record<number, string>,
        method: "bkash",
        transactionId: "",
        notes: "",
        date: format(new Date(), "yyyy-MM-dd"),
    });

    const [selectedMemberSummary, setSelectedMemberSummary] = useState<any>(null);

    // --- One-time Form State ---
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
    const [formData, setFormData] = useState({
        userId: "",
        memberName: "",
        amount: "",
        date: format(new Date(), "yyyy-MM-dd"),
        notes: "",
        type: "one-time" as const,
    });
    const [userSearchTerm, setUserSearchTerm] = useState("");
    const [showUserSuggestions, setShowUserSuggestions] = useState(false);

    // --- One-Time Sort State ---
    type OneTimeSortKey = "createdAt" | "memberName" | "amount";
    const [oneTimeSortKey, setOneTimeSortKey] = useState<OneTimeSortKey>("createdAt");
    const [oneTimeSortAsc, setOneTimeSortAsc] = useState(false);

    const handleOneTimeSort = (key: OneTimeSortKey) => {
        if (key === oneTimeSortKey) {
            setOneTimeSortAsc(prev => !prev);
        } else {
            setOneTimeSortKey(key);
            setOneTimeSortAsc(false); // default to desc for new column
        }
    };

    const SortIcon = ({ col }: { col: OneTimeSortKey }) => {
        if (col !== oneTimeSortKey) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground inline" />;
        return oneTimeSortAsc
            ? <ArrowUp className="ml-1 h-3 w-3 text-primary inline" />
            : <ArrowDown className="ml-1 h-3 w-3 text-primary inline" />;
    };

    // --- Member Sort State (for Matrix table) ---
    const [memberSortAsc, setMemberSortAsc] = useState(false); // default: newest first

    const sortedUsers = useMemo(() => {
        return [...users].sort((a: any, b: any) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return memberSortAsc
                ? dateA.getTime() - dateB.getTime()
                : dateB.getTime() - dateA.getTime();
        });
    }, [users, memberSortAsc]);

    const MatrixMemberSortIcon = () => memberSortAsc
        ? <ArrowUp className="ml-1 h-3 w-3 text-primary inline" />
        : <ArrowDown className="ml-1 h-3 w-3 text-primary inline" />;

    // --- Fetch Users ---
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const q = query(collection(db, "users"));
                const snapshot = await getDocs(q);
                const loadedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setUsers(loadedUsers);
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchUsers();
    }, []);

    const filteredUsers = useMemo(() => {
        return users.filter(usr =>
        (usr.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
            usr.username?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
            usr.email?.toLowerCase().includes(userSearchTerm.toLowerCase()))
        ).sort((a, b) => (a.name || a.username || "").localeCompare(b.name || b.username || ""));
    }, [users, userSearchTerm]);

    useEffect(() => {
        if (editingCell && inputRef.current) inputRef.current.focus();
    }, [editingCell]);

    // --- Helper Functions ---

    const getCellStatus = (userId: string, col: ColumnConfig) => {
        const monthPayments = payments.filter(p =>
            p.userId === userId &&
            p.type === 'monthly' &&
            p.month === col.month &&
            p.year === col.year
        );

        if (monthPayments.length > 0) {
            const totalAmount = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
            return { status: 'paid', payment: { ...monthPayments[0], amount: totalAmount } };
        }

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        const currentDate = new Date().getDate();

        if (col.year > currentYear) return { status: 'future' };
        if (col.year < currentYear) return { status: 'due' }; // Past year due

        if (col.month > currentMonth) return { status: 'future' };
        if (col.month < currentMonth) return { status: 'due-red' };

        return currentDate <= 10 ? { status: 'due-yellow' } : { status: 'due-red' };
    };

    // --- Totals ---

    // Row Total (Total for selected year)
    const getUserRowTotal = (userId: string) => {
        return visibleColumns.reduce((sum, col) => {
            const totalForMonth = payments
                .filter(p =>
                    p.userId === userId &&
                    p.type === 'monthly' &&
                    p.month === col.month &&
                    p.year === col.year
                )
                .reduce((s, p) => s + Number(p.amount), 0);
            return sum + totalForMonth;
        }, 0);
    };

    // Column Total
    const getColumnTotal = (col: ColumnConfig) => {
        return payments
            .filter(p => p.type === 'monthly' && p.month === col.month && p.year === col.year)
            .reduce((sum, p) => sum + Number(p.amount), 0);
    };

    // Grand Total (Visible View)
    const getGrandTotal = () => {
        return visibleColumns.reduce((sum, col) => sum + getColumnTotal(col), 0);
    };

    // --- Handlers ---

    const handleInlineSave = async () => {
        if (!editingCell) return;
        const { userId, colId } = editingCell;
        const col = allColumns.find(c => c.id === colId);
        if (!col) return;

        const monthPayments = payments.filter(p =>
            p.userId === userId &&
            p.type === 'monthly' &&
            p.month === col.month &&
            p.year === col.year
        );

        const { addDoc, collection, Timestamp } = await import("firebase/firestore");

        if (!editValue || editValue.trim() === "" || Number(editValue) === 0) {
            if (monthPayments.length > 0) {
                const memberName = users.find(u => u.id === userId)?.name || "Member";
                for (const p of monthPayments) {
                    await deletePayment(p.id, `Monthly: ${memberName} (${col.label} ${col.year})`);
                }
                await addDoc(collection(db, "notifications"), {
                    userId,
                    title: "Payment Removed",
                    message: `An admin has removed your payment record for ${col.label} ${col.year}.`,
                    type: "warning",
                    read: false,
                    createdAt: Timestamp.now()
                });
                toast({ title: "Moved to Recycle Bin", description: "Payment removed. Undo in Recycle Bin." });
            }
        } else {
            const amount = Number(editValue);
            if (monthPayments.length > 0) {
                const currentTotal = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
                if (currentTotal !== amount) {
                    await updatePayment(monthPayments[0].id, { amount, hiddenFromProfile: false } as any);
                    for (let i = 1; i < monthPayments.length; i++) {
                        await deletePayment(monthPayments[i].id, `Duplicate cleanup`);
                    }
                    await addDoc(collection(db, "notifications"), {
                        userId,
                        title: "Payment Updated",
                        message: `An admin has updated your ${col.label} ${col.year} payment to ৳${amount}.`,
                        type: "info",
                        read: false,
                        createdAt: Timestamp.now()
                    });
                }
            } else {
                const user = users.find(u => u.id === userId);
                await addPayment({
                    userId,
                    memberName: user?.name || user?.username || "Unknown",
                    amount,
                    date: new Date(),
                    type: "monthly",
                    month: col.month,
                    year: col.year,
                    notes: "Inline entry",
                    hiddenFromProfile: false
                } as any);
                await addDoc(collection(db, "notifications"), {
                    userId,
                    title: "Payment Added",
                    message: `An admin has recorded a new payment of ৳${amount} for ${col.label} ${col.year}.`,
                    type: "success",
                    read: false,
                    createdAt: Timestamp.now()
                });
                toast({ title: "Saved", description: "New payment recorded." });
            }
        }
        setEditingCell(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleInlineSave();
        else if (e.key === "Escape") setEditingCell(null);
    };

    // Month toggling removed as per user request.
    // Full year is always shown.
    // --- Member Summary ---
    const handleMemberClick = (user: any) => {
        const userPayments = payments.filter(p => p.userId === user.id);
        const totalPaidAllTime = userPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const oneTimeTotal = userPayments
            .filter(p => p.type === 'one-time')
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        // Monthly logic for Summary metrics
        const paidMonthsCount = new Set(userPayments.filter(p => p.type === 'monthly').map(p => `${p.month}-${p.year}`)).size;
        let totalPassedMonths = 0;
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        if (settings && settings.collectionYears) {
            settings.collectionYears.forEach(year => {
                const activeMonthsInYear = settings.collectionMonths?.[year] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                if (year < currentYear) {
                    totalPassedMonths += activeMonthsInYear.length;
                } else if (year === currentYear) {
                    totalPassedMonths += activeMonthsInYear.filter(m => m <= currentMonth).length;
                }
            });
        }

        const monthsDue = Math.max(0, totalPassedMonths - paidMonthsCount);

        setSelectedMemberSummary({
            ...user,
            totalPaidAllTime,
            oneTimeTotal,
            totalPassedMonths,
            paidMonthsCount,
            monthsDue,
            currentYearPaid: userPayments.filter(p => p.type === 'monthly' && p.year === selectedYear).length
        });

        // Reset multi-month form data for this user
        setMultiMonthFormData({
            amount: "",
            year: (settings.collectionYears && settings.collectionYears.length > 0 ? Math.max(...settings.collectionYears) : new Date().getFullYear()).toString(),
            months: [],
            allocations: {},
            method: "bkash",
            transactionId: "",
            notes: "",
            date: format(new Date(), "yyyy-MM-dd"),
        });
        setIsRecordMonthlyOpen(false);
        setIsSummaryOpen(true);
    };

    // --- Admin Multi-Month Helpers ---
    const multiMonthPaidMonths = useMemo(() => {
        if (!selectedMemberSummary) return [];
        return multiMonthFormData.months.filter(m =>
            payments.some(p =>
                p.userId === selectedMemberSummary.id &&
                p.type === 'monthly' &&
                p.month === m &&
                p.year === Number(multiMonthFormData.year)
            )
        );
    }, [multiMonthFormData.months, multiMonthFormData.year, payments, selectedMemberSummary]);

    const toggleMultiMonth = (month: number) => {
        setMultiMonthFormData(prev => {
            if (prev.months.includes(month)) {
                const newAllocations = { ...prev.allocations };
                delete newAllocations[month];
                return { ...prev, months: prev.months.filter(m => m !== month), allocations: newAllocations };
            } else {
                return { ...prev, months: [...prev.months, month].sort((a, b) => a - b) };
            }
        });
    };

    const handleMultiMonthAllocationChange = (month: number, value: string) => {
        setMultiMonthFormData(prev => ({
            ...prev,
            allocations: { ...prev.allocations, [month]: value }
        }));
    };

    const handleMultiMonthAllocationBlur = () => {
        setMultiMonthFormData(prev => {
            if (prev.months.length < 2) return prev;
            const total = Number(prev.amount) || 0;
            if (total <= 0) return prev;
            const emptyMonths = prev.months.filter(m => !prev.allocations[m]);
            if (emptyMonths.length === 1) {
                const currentSum = prev.months.reduce((sum, m) => sum + (Number(prev.allocations[m]) || 0), 0);
                if (currentSum < total) {
                    return {
                        ...prev,
                        allocations: { ...prev.allocations, [emptyMonths[0]]: (total - currentSum).toString() }
                    };
                }
            }
            return prev;
        });
    };

    const handleAdminRecordMonthlySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMemberSummary) return;

        let totalAmount = Number(multiMonthFormData.amount) || 0;
        const allocatedSum = multiMonthFormData.months.reduce((sum, m) => sum + (Number(multiMonthFormData.allocations[m]) || 0), 0);

        if (multiMonthFormData.months.length === 0) {
            toast({ title: "Error", description: "Please select at least one active month.", variant: "destructive" });
            return;
        }

        let allocationsToSave = { ...multiMonthFormData.allocations };

        // Auto-distribute if total amount provided but not allocated per month
        if (totalAmount > 0 && allocatedSum === 0) {
            const amountPerMonth = totalAmount / multiMonthFormData.months.length;
            multiMonthFormData.months.forEach(m => {
                allocationsToSave[m] = amountPerMonth.toString();
            });
        }

        const finalAllocatedSum = multiMonthFormData.months.reduce((sum, m) => sum + (Number(allocationsToSave[m]) || 0), 0);

        if (finalAllocatedSum === 0) {
            toast({ title: "Error", description: "Please enter the amount for the selected months.", variant: "destructive" });
            return;
        }

        if (totalAmount > 0 && Math.round(finalAllocatedSum) > Math.round(totalAmount)) {
            toast({ title: "Error", description: "Distributed amounts cannot exceed total amount.", variant: "destructive" });
            return;
        }

        try {
            const { addDoc, collection } = await import("firebase/firestore");

            for (const month of multiMonthFormData.months) {
                const monthAmount = Number(allocationsToSave[month]) || 0;
                if (monthAmount <= 0) continue;

                // Check for existing monthly payment for this user, year, and month
                const monthPayments = payments.filter(p =>
                    p.userId === selectedMemberSummary.id &&
                    p.type === 'monthly' &&
                    p.month === month &&
                    p.year === Number(multiMonthFormData.year)
                );

                if (monthPayments.length > 0) {
                    const currentTotal = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
                    await updatePayment(monthPayments[0].id, {
                        amount: currentTotal + monthAmount,
                        hiddenFromProfile: false,
                        notes: monthPayments[0].notes
                            ? `${monthPayments[0].notes} | Admin added directly`
                            : `Admin added directly`
                    } as any);

                    for (let i = 1; i < monthPayments.length; i++) {
                        await deletePayment(monthPayments[i].id, `Duplicate cleanup`);
                    }

                    await addDoc(collection(db, "notifications"), {
                        userId: selectedMemberSummary.id,
                        title: "Payment Updated",
                        message: `An admin has added ৳${monthAmount} to your existing payment for ${format(new Date(2000, month - 1, 1), 'MMM')} ${multiMonthFormData.year}.`,
                        type: "info",
                        read: false,
                        createdAt: Timestamp.now()
                    });
                } else {
                    await addPayment({
                        userId: selectedMemberSummary.id,
                        memberName: selectedMemberSummary.name || selectedMemberSummary.username || "Unknown",
                        amount: monthAmount,
                        date: new Date(),
                        type: "monthly",
                        month: month,
                        year: Number(multiMonthFormData.year),
                        notes: "Admin added directly",
                        hiddenFromProfile: false
                    } as any);

                    await addDoc(collection(db, "notifications"), {
                        userId: selectedMemberSummary.id,
                        title: "Payment Added",
                        message: `An admin has recorded a payment of ৳${monthAmount} for ${format(new Date(2000, month - 1, 1), 'MMM')} ${multiMonthFormData.year}.`,
                        type: "success",
                        read: false,
                        createdAt: Timestamp.now()
                    });
                }
            }

            toast({ title: "Payments Recorded", description: `Successfully recorded payments for ${multiMonthFormData.months.length} months.` });

            setIsRecordMonthlyOpen(false);
            setIsSummaryOpen(false); // Can close everything once done

        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to record payments.", variant: "destructive" });
        }
    };

    // --- One Time ---
    const handleOneTimeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { addDoc, collection } = await import("firebase/firestore");
            const dataToSave = {
                ...formData,
                amount: Number(formData.amount),
                date: new Date(formData.date),
                type: "one-time" as const,
                hiddenFromProfile: false
            };
            if (editingPayment) {
                await updatePayment(editingPayment.id, dataToSave);
                if (dataToSave.userId) {
                    await addDoc(collection(db, "notifications"), {
                        userId: dataToSave.userId,
                        title: "Donation Updated",
                        message: `An admin has updated your one-time donation to ৳${dataToSave.amount}.`,
                        type: "info",
                        read: false,
                        createdAt: Timestamp.now()
                    });
                }
            } else {
                await addPayment(dataToSave);
                if (dataToSave.userId) {
                    await addDoc(collection(db, "notifications"), {
                        userId: dataToSave.userId,
                        title: "Donation Added",
                        message: `An admin has recorded a new one-time donation of ৳${dataToSave.amount}.`,
                        type: "success",
                        read: false,
                        createdAt: Timestamp.now()
                    });
                }
            }
            setIsOneTimeDialogOpen(false);
        } catch (error) { console.error(error); }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight">Collections</h1>

                {/* Tab Switcher */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab("monthly")}
                        className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "monthly"
                            ? "bg-white dark:bg-slate-950 text-primary shadow-sm ring-1 ring-black/5"
                            : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                            }`}
                    >
                        Monthly Matrix
                    </button>
                    <button
                        onClick={() => setActiveTab("one-time")}
                        className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${activeTab === "one-time"
                            ? "bg-white dark:bg-slate-950 text-blue-600 shadow-sm ring-1 ring-black/5"
                            : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                            }`}
                    >
                        One-time Donations
                    </button>
                </div>
            </div>

            {/* --- MONTHLY TAB --- */}
            {activeTab === "monthly" && (
                <Card className="border-t-4 border-t-primary/20">
                    <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-2 gap-4">
                        <div>
                            <CardTitle>Collection Matrix</CardTitle>
                            <CardDescription>
                                Tracking for
                                <span className="inline-flex items-center ml-2 relative top-0.5">
                                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                                        <SelectTrigger className="w-[100px] h-8 font-bold">
                                            <SelectValue placeholder="Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableYears.map(y => (
                                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </span>
                            </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-2">
                                <Button variant="outline" size="sm" onClick={() => setIsManageViewOpen(true)}>
                                    <Settings2 className="h-4 w-4 mr-2" />
                                    Manage Periods
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border overflow-x-auto">
                            <Table className="border-collapse">
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead
                                            className="w-[200px] sticky left-0 bg-background z-20 border-r text-base font-bold cursor-pointer select-none hover:text-primary"
                                            onClick={() => setMemberSortAsc(prev => !prev)}
                                        >
                                            Member <MatrixMemberSortIcon />
                                        </TableHead>
                                        {visibleColumns.map(col => (
                                            <TableHead key={col.id} className="text-center min-w-[80px] border-r">
                                                <div className="flex items-center justify-center gap-1">
                                                    {col.label}
                                                </div>
                                            </TableHead>
                                        ))}
                                        <TableHead className="text-center min-w-[100px] font-bold bg-muted/30">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingUsers ? (
                                        <TableRow><TableCell colSpan={visibleColumns.length + 2} className="text-center h-24">Loading...</TableCell></TableRow>
                                    ) : (
                                        sortedUsers.map(user => {
                                            const rowTotal = getUserRowTotal(user.id);
                                            return (
                                                <TableRow key={user.id} className="hover:bg-muted/50 group">
                                                    <TableCell
                                                        className="font-medium sticky left-0 bg-background z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer hover:text-primary hover:underline"
                                                        onClick={() => handleMemberClick(user)}
                                                    >
                                                        {user.name || user.username}
                                                    </TableCell>
                                                    {visibleColumns.map(col => {
                                                        const status = getCellStatus(user.id, col);
                                                        const isEditing = editingCell?.userId === user.id && editingCell?.colId === col.id;

                                                        let bgClass = "";
                                                        if (!isEditing) {
                                                            if (status.status === 'paid') bgClass = "bg-green-50/50 dark:bg-green-900/10 text-green-700 font-bold";
                                                            else if (status.status === 'due-yellow') bgClass = "bg-yellow-50/50 dark:bg-yellow-900/10";
                                                            else if (status.status === 'due-red' || status.status === 'due') bgClass = "bg-red-50/50 dark:bg-red-900/10";
                                                        }

                                                        return (
                                                            <TableCell
                                                                key={col.id}
                                                                className={`p-0 h-[45px] text-center border-r border-b relative ${bgClass}`}
                                                                onClick={() => !isEditing && (setEditingCell({ userId: user.id, colId: col.id }), setEditValue(status.payment ? status.payment.amount.toString() : ""))}
                                                            >
                                                                {isEditing ? (
                                                                    <Input
                                                                        ref={inputRef}
                                                                        value={editValue}
                                                                        onChange={e => setEditValue(e.target.value)}
                                                                        onBlur={handleInlineSave}
                                                                        onKeyDown={handleKeyDown}
                                                                        className="h-full w-full border-none text-center bg-transparent focus-visible:ring-2 focus-visible:ring-primary px-0 rounded-none"
                                                                        placeholder="-"
                                                                        autoFocus
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-xs sm:text-sm">
                                                                        {status.status === 'paid' ? `৳${status.payment?.amount}` : ''}
                                                                    </div>
                                                                )}
                                                            </TableCell>
                                                        );
                                                    })}
                                                    <TableCell className="text-center font-bold text-muted-foreground border-l bg-muted/10">
                                                        {rowTotal > 0 ? `৳${rowTotal}` : '-'}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                                <TableFooter className="bg-muted/80 font-bold text-foreground">
                                    <TableRow>
                                        <TableCell className="sticky left-0 bg-muted z-20 border-r">Total</TableCell>
                                        {visibleColumns.map(col => (
                                            <TableCell key={col.id} className="text-center border-r">
                                                ৳{getColumnTotal(col)}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-center text-primary text-lg">
                                            ৳{getGrandTotal()}
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* --- ONE-TIME TAB --- */}
            {activeTab === "one-time" && (
                <Card className="border-t-4 border-t-blue-500/20">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>One-time Donations</CardTitle>
                            <CardDescription>Track irregular or special contributions</CardDescription>
                        </div>
                        <Button onClick={() => {
                            setEditingPayment(null);
                            setFormData({ ...formData, userId: "", memberName: "", amount: "" });
                            setIsOneTimeDialogOpen(true);
                        }} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="h-4 w-4 mr-2" /> Record Donation
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead
                                        className="cursor-pointer select-none hover:text-primary"
                                        onClick={() => handleOneTimeSort("createdAt")}
                                    >
                                        Date <SortIcon col="createdAt" />
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer select-none hover:text-primary"
                                        onClick={() => handleOneTimeSort("memberName")}
                                    >
                                        Donor <SortIcon col="memberName" />
                                    </TableHead>
                                    <TableHead
                                        className="cursor-pointer select-none hover:text-primary"
                                        onClick={() => handleOneTimeSort("amount")}
                                    >
                                        Amount <SortIcon col="amount" />
                                    </TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments.filter(p => p.type === 'one-time').length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No records found.</TableCell></TableRow>
                                ) : (
                                    payments.filter(p => p.type === 'one-time')
                                        .sort((a, b) => {
                                            let valA: any;
                                            let valB: any;
                                            if (oneTimeSortKey === "createdAt") {
                                                valA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt || 0).getTime();
                                                valB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt || 0).getTime();
                                            } else if (oneTimeSortKey === "memberName") {
                                                valA = (a.memberName || "").toLowerCase();
                                                valB = (b.memberName || "").toLowerCase();
                                            } else {
                                                valA = Number(a.amount);
                                                valB = Number(b.amount);
                                            }
                                            if (valA < valB) return oneTimeSortAsc ? -1 : 1;
                                            if (valA > valB) return oneTimeSortAsc ? 1 : -1;
                                            return 0;
                                        })
                                        .map(payment => (
                                            <TableRow key={payment.id}>
                                                <TableCell>
                                                    {payment.createdAt
                                                        ? format(new Date(payment.createdAt), "MMM d, yyyy h:mm a")
                                                        : format(new Date(payment.date), "MMM d, yyyy")}
                                                </TableCell>
                                                <TableCell>
                                                    {payment.memberName}
                                                    {payment.userId && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Member</span>}
                                                </TableCell>
                                                <TableCell className="font-medium">৳{payment.amount}</TableCell>
                                                <TableCell className="max-w-[200px] truncate text-muted-foreground">{payment.notes}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => {
                                                        setEditingPayment(payment);
                                                        setFormData({
                                                            userId: payment.userId || "",
                                                            memberName: payment.memberName,
                                                            amount: payment.amount.toString(),
                                                            date: format(new Date(payment.date), "yyyy-MM-dd"),
                                                            notes: payment.notes || "",
                                                            type: "one-time"
                                                        });
                                                        setIsOneTimeDialogOpen(true);
                                                    }}><Edit className="h-4 w-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50" onClick={async () => {
                                                        if (confirm("Delete this donation?")) {
                                                            const { addDoc, collection } = await import("firebase/firestore");
                                                            await deletePayment(payment.id, `One-time: ${payment.memberName}`);
                                                            if (payment.userId) {
                                                                await addDoc(collection(db, "notifications"), {
                                                                    userId: payment.userId,
                                                                    title: "Donation Removed",
                                                                    message: `An admin has removed your one-time donation of ৳${payment.amount}.`,
                                                                    type: "warning",
                                                                    read: false,
                                                                    createdAt: new Date().toISOString()
                                                                });
                                                            }
                                                            toast({ title: "Moved to Recycle Bin", description: "Donation removed. Undo in Recycle Bin." });
                                                        }
                                                    }}><Trash2 className="h-4 w-4" /></Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Month Selection Dialog Removed */}

            {/* --- ONE-TIME DIALOG --- */}
            <Dialog open={isOneTimeDialogOpen} onOpenChange={setIsOneTimeDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingPayment ? "Edit" : "Add"} Donation</DialogTitle></DialogHeader>
                    <form onSubmit={handleOneTimeSubmit} className="space-y-4">
                        {/* Member Search */}
                        <div className="space-y-2 relative">
                            <Label>Donor Name</Label>
                            <div className="relative">
                                <Input
                                    value={userSearchTerm || formData.memberName}
                                    onChange={e => {
                                        setUserSearchTerm(e.target.value);
                                        setFormData({ ...formData, memberName: e.target.value, userId: "" });
                                        setShowUserSuggestions(true);
                                    }}
                                    onFocus={() => setShowUserSuggestions(true)}
                                    placeholder="Search member or type name..."
                                />
                                {showUserSuggestions && userSearchTerm && (
                                    <div className="absolute z-10 w-full bg-popover border rounded-md shadow-md mt-1 max-h-[200px] overflow-y-auto">
                                        {filteredUsers.map(u => (
                                            <div key={u.id} className="px-3 py-2 text-sm cursor-pointer hover:bg-muted" onClick={() => {
                                                setFormData({ ...formData, memberName: u.name || u.username, userId: u.id });
                                                setUserSearchTerm(u.name || u.username);
                                                setShowUserSuggestions(false);
                                            }}>
                                                <div className="font-medium">{u.name || u.username}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {formData.userId && <p className="text-xs text-green-600">✓ Linked to member</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Amount</Label>
                                <Input type="number" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Input value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                        </div>
                        <DialogFooter><Button type="submit">Save Donation</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* --- MEMBER SUMMARY DIALOG --- */}
            <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Member Summary</DialogTitle>
                        <DialogDescription>{selectedMemberSummary?.name || selectedMemberSummary?.username}</DialogDescription>
                    </DialogHeader>
                    {selectedMemberSummary && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-muted/30 rounded-lg">
                                    <div className="text-sm text-muted-foreground underline">Total Paid</div>
                                    <div className="text-2xl font-bold text-primary">৳{selectedMemberSummary.totalPaidAllTime}</div>
                                </div>
                                <div className="text-center p-4 bg-muted/30 rounded-lg">
                                    <div className="text-sm text-muted-foreground underline">One-time</div>
                                    <div className="text-2xl font-bold text-blue-600">৳{selectedMemberSummary.oneTimeTotal}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="p-2 border rounded text-center bg-background">
                                    <div className="text-xs text-muted-foreground">Passed months</div>
                                    <div className="text-lg font-bold">{selectedMemberSummary.totalPassedMonths}</div>
                                </div>
                                <div className="p-2 border rounded text-center bg-green-50/50 dark:bg-green-900/10">
                                    <div className="text-xs text-green-700 dark:text-green-400">Paid months</div>
                                    <div className="text-lg font-bold text-green-700 dark:text-green-400">{selectedMemberSummary.paidMonthsCount}</div>
                                </div>
                                <div className="p-2 border rounded text-center bg-red-50/50 dark:bg-red-900/10">
                                    <div className="text-xs text-red-700 dark:text-red-400">Due months</div>
                                    <div className="text-lg font-bold text-red-700 dark:text-red-400">{selectedMemberSummary.monthsDue}</div>
                                </div>
                            </div>

                            {!isRecordMonthlyOpen ? (
                                <Button className="w-full mt-2" onClick={() => setIsRecordMonthlyOpen(true)}>
                                    <Plus className="h-4 w-4 mr-2" /> Record Monthly Donations
                                </Button>
                            ) : (
                                <Card className="mt-4 border-2 border-primary/20">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg flex justify-between items-center">
                                            <span>Bulk Record Monthly</span>
                                            <Button variant="ghost" size="sm" onClick={() => setIsRecordMonthlyOpen(false)}><X className="h-4 w-4" /></Button>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <form className="space-y-4" onSubmit={handleAdminRecordMonthlySubmit}>

                                            <div className="grid grid-cols-1 gap-4 p-3 bg-muted/20 rounded-md border">
                                                <div>
                                                    <Label className="mb-2 block">Select Months</Label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                                                            const yearNum = Number(multiMonthFormData.year);
                                                            const activeMonths = settings.collectionMonths?.[yearNum] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                                                            const isActive = activeMonths.includes(m);
                                                            const isSelected = multiMonthFormData.months.includes(m);

                                                            const isAlreadyPaid = payments.some(p => p.userId === selectedMemberSummary.id && p.type === 'monthly' && p.month === m && p.year === yearNum);

                                                            const currentYear = new Date().getFullYear();
                                                            const currentMonth = new Date().getMonth() + 1;
                                                            const currentDate = new Date().getDate();

                                                            let status = 'future';
                                                            if (isAlreadyPaid) {
                                                                status = 'paid';
                                                            } else if (yearNum < currentYear) {
                                                                status = 'due-red';
                                                            } else if (yearNum > currentYear) {
                                                                status = 'future';
                                                            } else {
                                                                if (m < currentMonth) status = 'due-red';
                                                                else if (m > currentMonth) status = 'future';
                                                                else status = currentDate <= 10 ? 'due-yellow' : 'due-red';
                                                            }

                                                            let baseStyle = "";
                                                            if (!isActive) {
                                                                baseStyle = "bg-muted/50 text-muted-foreground/50 border-input/50 cursor-not-allowed";
                                                            } else if (isSelected) {
                                                                if (status === 'paid') baseStyle = "bg-green-600 border-green-700 text-white font-bold cursor-pointer shadow-inner ring-2 ring-primary ring-offset-1";
                                                                else if (status === 'due-red') baseStyle = "bg-red-600 border-red-700 text-white font-bold cursor-pointer shadow-inner ring-2 ring-primary ring-offset-1";
                                                                else if (status === 'due-yellow') baseStyle = "bg-yellow-500 border-yellow-600 text-white font-bold cursor-pointer shadow-inner ring-2 ring-primary ring-offset-1";
                                                                else baseStyle = "bg-primary border-primary text-primary-foreground font-bold cursor-pointer shadow-inner";
                                                            } else {
                                                                if (status === 'paid') baseStyle = "bg-green-100 border-green-500 text-green-800 hover:bg-green-200 cursor-pointer";
                                                                else if (status === 'due-red') baseStyle = "bg-red-100 border-red-500 text-red-800 hover:bg-red-200 cursor-pointer";
                                                                else if (status === 'due-yellow') baseStyle = "bg-yellow-100 border-yellow-500 text-yellow-800 hover:bg-yellow-200 cursor-pointer";
                                                                else baseStyle = "bg-background border-input text-muted-foreground hover:bg-muted cursor-pointer";
                                                            }

                                                            return (
                                                                <div
                                                                    key={m}
                                                                    onClick={() => isActive && toggleMultiMonth(m)}
                                                                    className={`text-center text-xs py-1.5 rounded border select-none transition-colors ${baseStyle}`}
                                                                >
                                                                    {format(new Date(2000, m - 1, 1), 'MMM')}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label>Year</Label>
                                                    <select
                                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                                                        value={multiMonthFormData.year}
                                                        onChange={e => setMultiMonthFormData(prev => ({ ...prev, year: e.target.value, months: [] }))}
                                                    >
                                                        {settings.collectionYears.map(y => <option key={y} value={y}>{y}</option>)}
                                                    </select>
                                                </div>

                                                {multiMonthFormData.months.length > 0 && (
                                                    <div className="space-y-2 pt-2 border-t border-muted">
                                                        <Label className="text-xs text-muted-foreground">Amount per month</Label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {multiMonthFormData.months.map(m => (
                                                                <div key={m} className="flex items-center gap-2">
                                                                    <span className="text-xs w-8">{format(new Date(2000, m - 1, 1), 'MMM')}</span>
                                                                    <Input
                                                                        type="number"
                                                                        className="h-7 text-xs"
                                                                        value={multiMonthFormData.allocations[m] || ""}
                                                                        onChange={e => handleMultiMonthAllocationChange(m, e.target.value)}
                                                                        onBlur={handleMultiMonthAllocationBlur}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {multiMonthPaidMonths.length > 0 && (
                                                    <Alert variant="destructive" className="bg-yellow-50 text-yellow-900 border-yellow-200 py-2">
                                                        <AlertTriangle className="h-4 w-4" />
                                                        <AlertDescription className="text-xs ml-2">
                                                            Already paid: {multiMonthPaidMonths.map(m => format(new Date(2000, m - 1, 1), 'MMM')).join(', ')}.
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                            </div>

                                            <div className="flex justify-between items-center py-3 px-4 bg-muted/40 rounded-md border text-sm">
                                                <Label className="font-bold cursor-default">Total Expected Payment</Label>
                                                <span className="text-lg font-bold text-primary">
                                                    ৳{multiMonthFormData.months.reduce((sum, m) => sum + (Number(multiMonthFormData.allocations[m]) || 0), 0)}
                                                </span>
                                            </div>

                                            <Button type="submit" className="w-full h-8 text-sm bg-green-600 hover:bg-green-700">Save Monthly Payments</Button>
                                        </form>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* --- MANAGE PERIODS DIALOG --- */}
            <Dialog open={isManageViewOpen} onOpenChange={setIsManageViewOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Manage Collection Years</DialogTitle>
                        <DialogDescription>Add or remove available years. Note: All months for a year are automatically generated.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="flex items-center space-x-2">
                            <Input
                                type="number"
                                placeholder="Year (e.g. 2026)"
                                className="flex-1"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = parseInt((e.target as HTMLInputElement).value);
                                        if (val) {
                                            addCollectionYear(val).then(() => {
                                                toast({ title: "Year Added", description: `${val} is now available.` });
                                                (e.target as HTMLInputElement).value = '';
                                            }).catch(() => {
                                                toast({ title: "Error", description: "Could not add year.", variant: "destructive" });
                                            });
                                        }
                                    }
                                }}
                                id="new-year-input"
                            />
                            <Button onClick={() => {
                                const input = document.getElementById('new-year-input') as HTMLInputElement;
                                if (input && input.value) {
                                    const val = parseInt(input.value);
                                    if (val) {
                                        addCollectionYear(val).then(() => {
                                            toast({ title: "Year Added", description: `${val} is now available.` });
                                            input.value = '';
                                        }).catch(() => {
                                            toast({ title: "Error", description: "Could not add year.", variant: "destructive" });
                                        });
                                    }
                                }
                            }}>
                                <Plus className="h-4 w-4 mr-2" /> Add
                            </Button>
                        </div>
                        <div className="border rounded-md p-2 max-h-[400px] overflow-y-auto space-y-2">
                            {availableYears.map(year => {
                                const activeMonths = settings.collectionMonths?.[year] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

                                return (
                                    <div key={year} className="border rounded p-2 bg-background hover:border-primary/50 transition-colors group">
                                        <div className="flex items-center justify-between cursor-pointer py-1"
                                            onClick={() => {
                                                const el = document.getElementById(`months-grid-${year}`);
                                                const icon = document.getElementById(`chevron-${year}`);
                                                if (el) {
                                                    el.classList.toggle("hidden");
                                                    if (icon) icon.classList.toggle("rotate-180");
                                                }
                                            }}>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 text-lg font-bold">
                                                    <span>{year}</span>
                                                    <ChevronDown id={`chevron-${year}`} className="h-5 w-5 text-muted-foreground transition-transform duration-200" />
                                                </div>
                                                <span className="text-xs text-muted-foreground">Click to manage active months</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto h-8 w-8 p-0"
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (confirm(`Delete Year ${year} and ALL related data?`)) {
                                                        try {
                                                            const batchId = "batch-" + Date.now();
                                                            const paymentsToDelete = payments.filter(p => p.type === 'monthly' && p.year === year);
                                                            for (const p of paymentsToDelete) {
                                                                await deletePayment(p.id, `Monthly: Year ${year}`, { batchId });
                                                            }
                                                            await removeCollectionYear(year);
                                                            const { RecycleService } = await import("@/lib/recycle-service");
                                                            await RecycleService.logSystemAction(
                                                                `Year ${year} Configuration`,
                                                                `Removed configuration for year ${year} and ${paymentsToDelete.length} payments.`,
                                                                "year_config_removed",
                                                                { batchId, year, count: paymentsToDelete.length, data: { year } }
                                                            );
                                                            toast({ title: "Year Deleted", description: `Year ${year} removed.` });
                                                        } catch (err) {
                                                            toast({ title: "Error", description: "Failed to delete year.", variant: "destructive" });
                                                        }
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {/* Months Grid (Collapsible) */}
                                        <div id={`months-grid-${year}`} className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t hidden">
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                                                const isActive = activeMonths.includes(m);
                                                const monthName = format(new Date(year, m - 1, 1), "MMM");
                                                return (
                                                    <div key={m} className={`flex items-center justify-between p-1.5 rounded border text-sm transition-colors ${isActive ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800 hover:bg-green-100/50' : 'bg-muted opacity-60 hover:opacity-80'}`}>
                                                        <span>{monthName}</span>
                                                        <Checkbox
                                                            checked={isActive}
                                                            onCheckedChange={async (checked) => {
                                                                if (!checked) {
                                                                    if (confirm(`Disable ${monthName} ${year}? This deletes all recorded payments for this matching month.`)) {
                                                                        try {
                                                                            const batchId = "batch-month-" + Date.now();
                                                                            const monthPayments = payments.filter(p => p.type === 'monthly' && p.year === year && p.month === m);

                                                                            for (const p of monthPayments) {
                                                                                await deletePayment(p.id, `Monthly: ${monthName} ${year}`, { batchId });
                                                                            }
                                                                            await toggleCollectionMonth(year, m, false);

                                                                            if (monthPayments.length > 0) {
                                                                                const { RecycleService } = await import("@/lib/recycle-service");
                                                                                await RecycleService.logSystemAction(
                                                                                    `${monthName} ${year} Configuration`,
                                                                                    `Disabled month ${monthName} ${year} and removed ${monthPayments.length} payments.`,
                                                                                    "month_config_removed",
                                                                                    { batchId, year, month: m, count: monthPayments.length, data: { year, month: m } }
                                                                                );
                                                                            }
                                                                            toast({ title: "Month Disabled", description: `${monthName} ${year} is disabled.` });
                                                                        } catch (err) {
                                                                            toast({ title: "Error", description: "Failed to disable month.", variant: "destructive" });
                                                                        }
                                                                    }
                                                                } else {
                                                                    // Enable
                                                                    await toggleCollectionMonth(year, m, true);
                                                                    toast({ title: "Month Enabled", description: `${monthName} ${year} is now available.` });
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
