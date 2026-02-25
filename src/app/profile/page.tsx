"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notification-context";
import { useMessages } from "@/lib/message-context";
import { useRouter, redirect, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Section } from "@/components/layout/section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Camera, User as UserIcon, Mail, Calendar, Heart, Shield, Eye, EyeOff, Bell, ChevronDown, ChevronUp, MessageSquare, TrendingUp, TrendingDown, DollarSign, Users, Search, Medal, Star } from "lucide-react";
import { doc, updateDoc, collection, query, where, orderBy, onSnapshot, Timestamp, getDocs } from "firebase/firestore";
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
import { useFinance, FinanceProvider } from "@/lib/finance-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { ImageCropper } from "@/components/image-cropper";
import { TopContributorBadge, TopContributorNameBadge } from "@/components/ui/top-contributor-badge";

// ─── Member Finance Transparency Tab ─────────────────────────────────────────
function MemberFinanceTab() {
    const { payments, expenses, totalCollection, totalExpenses, currentBalance, loading, topContributors } = useFinance();
    const { settings } = useSettings();
    // Members List States
    const [members, setMembers] = useState<any[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(true);
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [memberSearchQuery, setMemberSearchQuery] = useState("");
    const [isMembersCollapsed, setIsMembersCollapsed] = useState(false);

    // Fetch members (name, photo, roles only)
    useEffect(() => {
        getDocs(collection(db, "users")).then(snap => {
            setMembers(snap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    name: data.name || data.username || "Member",
                    photoURL: data.photoURL || null,
                    roles: data.roles || ["member"]
                };
            }));
            setLoadingMembers(false);
        }).catch(() => setLoadingMembers(false));
    }, []);

    const totalMemberCollection = useMemo(() =>
        payments.filter(p => p.type === 'monthly').reduce((sum, p) => sum + Number(p.amount || 0), 0)
        , [payments]);

    const totalOneTimeCollection = useMemo(() =>
        payments.filter(p => p.type === 'one-time').reduce((sum, p) => sum + Number(p.amount || 0), 0)
        , [payments]);

    // Chart data
    const chartData = useMemo(() => {
        if (selectedYear === 'all') {
            const yearMap = new Map<number, { collection: number; expense: number }>();
            payments.forEach(p => {
                const y = (p.type === 'monthly' && p.year) ? p.year : new Date(p.date).getFullYear();
                if (!yearMap.has(y)) yearMap.set(y, { collection: 0, expense: 0 });
                yearMap.get(y)!.collection += Number(p.amount) || 0;
            });
            expenses.forEach(e => {
                const y = new Date(e.date).getFullYear();
                if (!yearMap.has(y)) yearMap.set(y, { collection: 0, expense: 0 });
                yearMap.get(y)!.expense += Number(e.amount) || 0;
            });
            return Array.from(yearMap.entries()).sort((a, b) => a[0] - b[0]).filter(([y]) => !isNaN(y))
                .map(([year, d]) => ({ name: year.toString(), collection: d.collection, expense: d.expense }));
        } else {
            const yr = parseInt(selectedYear);
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return months.map((month, idx) => {
                const mn = idx + 1;
                const collection = payments.filter(p => {
                    if (p.type === 'monthly' && p.year && p.month) return p.year === yr && p.month === mn;
                    const d = new Date(p.date);
                    return d.getFullYear() === yr && (d.getMonth() + 1) === mn;
                }).reduce((sum, p) => sum + Number(p.amount), 0);
                const expense = expenses.filter(e => {
                    const d = new Date(e.date);
                    return d.getFullYear() === yr && (d.getMonth() + 1) === mn;
                }).reduce((sum, e) => sum + Number(e.amount), 0);
                return { name: month, collection, expense };
            });
        }
    }, [selectedYear, payments, expenses]);

    // Trend data (collection only, same as admin dashboard)
    const trendData = useMemo(() => {
        const yr = parseInt(selectedYear);
        if (selectedYear === 'all') {
            const yearMap = new Map<number, number>();
            payments.forEach(p => {
                const y = (p.type === 'monthly' && p.year) ? p.year : new Date(p.date).getFullYear();
                yearMap.set(y, (yearMap.get(y) || 0) + Number(p.amount));
            });
            return Array.from(yearMap.entries()).sort((a, b) => a[0] - b[0]).filter(([y]) => !isNaN(y))
                .map(([year, collection]) => ({ name: year.toString(), collection }));
        }
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return months.map((month, idx) => {
            const mn = idx + 1;
            const collection = payments.filter(p => {
                if (p.type === 'monthly' && p.year && p.month) return p.year === yr && p.month === mn;
                const d = new Date(p.date);
                return d.getFullYear() === yr && (d.getMonth() + 1) === mn;
            }).reduce((sum, p) => sum + Number(p.amount), 0);
            return { name: month, collection };
        });
    }, [selectedYear, payments]);

    // Sync period indicator with Admin settings
    const timePeriodLabel = useMemo(() => {
        let earliestDate = "N/A";
        if (settings && settings.collectionYears && settings.collectionYears.length > 0) {
            const earliestYear = Math.min(...settings.collectionYears);
            const monthsForYear = settings.collectionMonths?.[earliestYear] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
            const earliestMonth = Math.min(...monthsForYear);
            try {
                const dateObj = new Date(earliestYear, earliestMonth - 1, 1);
                earliestDate = format(dateObj, 'MMM yyyy');
            } catch (e) {
                earliestDate = `${earliestYear}`;
            }
        } else if (payments.length > 0) {
            const earliest = payments.reduce((min, p) => {
                const d = new Date(p.date);
                return d < min ? d : min;
            }, new Date(payments[0].date));
            earliestDate = format(earliest, 'MMM yyyy');
        }
        return `${earliestDate} - Present`;
    }, [settings, payments]);

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return 'destructive';
            case 'moderator': return 'secondary';
            default: return 'outline';
        }
    };

    if (loading) return <div className="py-12 text-center text-muted-foreground">Loading financial data...</div>;

    return (
        <div className="space-y-6">
            {/* Info banner */}
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800 dark:text-blue-300">Transparency Report</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-400">
                    This is a read-only view of the organisation's collective finances. Personal information of other members is not shown.
                </AlertDescription>
            </Alert>

            {/* Financial Overview Header */}
            <div className="flex flex-col mb-2">
                <h3 className="text-lg font-semibold">Financial Overview</h3>
                <p className="text-xs text-muted-foreground">{timePeriodLabel}</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Collection</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">৳{totalCollection.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">All time collected</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Member Contributions</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">৳{totalMemberCollection.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Monthly subscriptions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">One-time Donations</CardTitle>
                        <Heart className="h-4 w-4 text-pink-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-pink-600">৳{totalOneTimeCollection.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Direct contributions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">৳{totalExpenses.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">All recorded spending</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                        <DollarSign className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${currentBalance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>৳{currentBalance.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Available funds</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                        <Users className="h-4 w-4 text-violet-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-violet-600">{loadingMembers ? '...' : members.length}</div>
                        <p className="text-xs text-muted-foreground">Registered members</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts with Year Filter */}
            <div className="pt-4 flex justify-between items-end mb-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Activity Charts</h3>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        {(settings?.collectionYears || []).sort((a: number, b: number) => b - a).map((y: number) => (
                            <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                {/* Collection Trend */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Collection Trend</CardTitle>
                        <CardDescription>{selectedYear === 'all' ? 'Yearly collection over time' : `Monthly collection for ${selectedYear}`}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} key={JSON.stringify(trendData)}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `৳${v}`} />
                                    <Tooltip formatter={(v: any) => [`৳${v}`, 'Collection']} />
                                    <Line type="monotone" dataKey="collection" stroke="#2563eb" strokeWidth={2} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Financial Overview */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Collection vs Expenses</CardTitle>
                        <CardDescription>{selectedYear === 'all' ? 'Yearly overview' : `Monthly overview for ${selectedYear}`}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} key={JSON.stringify(chartData)}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `৳${v}`} />
                                    <Tooltip formatter={(v: any) => `৳${v}`} />
                                    <Legend />
                                    <Bar dataKey="collection" name="Collection" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Expenses List (Read-only) */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Expenses Record</CardTitle>
                    <CardDescription>All recorded expenditures — read only</CardDescription>
                </CardHeader>
                <CardContent>
                    {expenses.length === 0 ? (
                        <p className="text-center text-muted-foreground py-6">No expenses recorded yet.</p>
                    ) : (
                        <div className="max-h-[300px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {[...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                                        <TableRow key={exp.id}>
                                            <TableCell className="text-xs whitespace-nowrap">{format(new Date(exp.date), 'MMM d, yyyy')}</TableCell>
                                            <TableCell className="font-medium text-sm">{exp.title}</TableCell>
                                            <TableCell><Badge variant="outline" className="text-xs">{exp.category}</Badge></TableCell>
                                            <TableCell className="text-right text-red-600 font-semibold">-৳{Number(exp.amount).toLocaleString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Members List (Name, Photo, Role only) */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2">
                                Members
                            </CardTitle>
                            <CardDescription>Organisation members — personal details not shown</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search members..."
                                    className="w-full sm:w-[200px] pl-8 h-9 text-sm"
                                    value={memberSearchQuery}
                                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setIsMembersCollapsed(!isMembersCollapsed)}>
                                {isMembersCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                {!isMembersCollapsed && (
                    <CardContent>
                        {loadingMembers ? (
                            <p className="text-center text-muted-foreground py-4">Loading members...</p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto pr-2">
                                {members.filter(m => m.name.toLowerCase().includes(memberSearchQuery.toLowerCase())).map(m => {
                                    const isTopContributor = topContributors.includes(m.id);
                                    const rank = isTopContributor ? topContributors.indexOf(m.id) + 1 : -1;
                                    return (
                                        <div key={m.id} className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors relative">
                                            <div className="relative">
                                                <Avatar className={`h-12 w-12 ${isTopContributor ? 'ring-2 ring-yellow-400 ring-offset-2 dark:ring-offset-background' : ''}`}>
                                                    <AvatarImage src={m.photoURL || undefined} alt={m.name} />
                                                    <AvatarFallback>{m.name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
                                                </Avatar>
                                                {isTopContributor && (
                                                    <TopContributorBadge rank={rank} className="absolute -bottom-0.5 -right-0.5 translate-x-1/4 translate-y-1/4 h-5 w-5" />
                                                )}
                                            </div>
                                            <span className="text-sm font-medium text-center leading-tight flex items-center justify-center gap-1">
                                                {m.name}
                                            </span>
                                            <div className="flex flex-wrap gap-1 justify-center">
                                                {m.roles.map((r: string) => (
                                                    <Badge key={r} variant={getRoleColor(r) as any} className="text-[10px] px-1.5 py-0 h-4 capitalize">{r}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                                {members.filter(m => m.name.toLowerCase().includes(memberSearchQuery.toLowerCase())).length === 0 && (
                                    <div className="col-span-full text-center py-8 text-muted-foreground">
                                        No members found matching "{memberSearchQuery}"
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>
        </div>
    );
}

// ─── Donation Request Form ─────────────────────────────────────────────────────
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
                                const yearNum = Number(formData.year);
                                const activeMonths = settings.collectionMonths?.[yearNum] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                                const isActive = activeMonths.includes(m);
                                const isSelected = formData.months.includes(m);

                                const isAlreadyPaid = paymentHistory.some(p => p.type === 'monthly' && p.month === m && p.year === yearNum);

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
                                        onClick={() => isActive && toggleMonth(m)}
                                        className={`text-center text-xs py-2 rounded border select-none transition-colors ${baseStyle}`}
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
            {formData.method !== "cash" && (
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
            )}
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
    const { topContributors } = useFinance();
    const router = useRouter();
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications } = useNotifications();
    const { messages, unreadMessageCount, markMessageAsRead, deleteMessage, clearAllMessages } = useMessages();

    // Top Contributor Status for Main Profile Header
    const isTopContributor = user ? topContributors.includes(user.id) : false;
    const rank = user && isTopContributor ? topContributors.indexOf(user.id) + 1 : undefined;

    const [myRequests, setMyRequests] = useState<any[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [isDonateModalOpen, setIsDonateModalOpen] = useState(false);

    // Image Upload & Crop State
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string>("");
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const [isDonationHistoryOpen, setIsDonationHistoryOpen] = useState(true);
    const [isMyRequestsOpen, setIsMyRequestsOpen] = useState(true);
    const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
    const { settings } = useSettings();
    const [activeTab, setActiveTab] = useState("overview");
    const searchParams = useSearchParams();
    const tabsRef = useRef<HTMLDivElement>(null);

    const scrollToTabs = () => {
        setTimeout(() => {
            tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
    };

    // Deep link: handle ?tab=X, ?action=donate, and #hash from mobile menu
    useEffect(() => {
        const tab = searchParams.get("tab");
        const action = searchParams.get("action");
        const hash = typeof window !== "undefined" ? window.location.hash : "";

        if (action === "donate") {
            setActiveTab("overview");
            setIsDonateModalOpen(true);
            scrollToTabs();
        } else if (tab === "finance" || tab === "security" || tab === "overview") {
            setActiveTab(tab);
            scrollToTabs();
        } else if (hash === "#history" || hash === "#requests") {
            // Ensure overview tab is active so the sections are rendered
            setActiveTab("overview");
            // Scroll to the element after a short delay to allow tab to render
            setTimeout(() => {
                const id = hash.replace("#", "");
                const el = document.getElementById(id);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 200);
        }
    }, [searchParams]);

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
        const monthPayments = paymentHistory.filter(p =>
            p.type === 'monthly' &&
            p.month === month &&
            p.year === year
        );

        if (monthPayments.length > 0) {
            const totalAmount = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
            return { status: 'paid', payment: { ...monthPayments[0], amount: totalAmount } };
        }

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

    const handleClearAllHistory = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to clear your entire donation history?")) return;
        try {
            const batch = paymentHistory.filter(p => !p.hiddenFromProfile).map(p =>
                updateDoc(doc(db, "payments", p.id), { hiddenFromProfile: true })
            );
            await Promise.all(batch);
            toast({ title: "Cleared", description: "All history records hidden." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to clear history.", variant: "destructive" });
        }
    };

    const handleClearAllRequests = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to clear all requests?")) return;
        try {
            const batch = myRequests.filter(r => !r.hiddenFromProfile).map(r =>
                updateDoc(doc(db, "donation_requests", r.id), { hiddenFromProfile: true })
            );
            await Promise.all(batch);
            toast({ title: "Cleared", description: "All requests hidden." });
        } catch (error) {
            toast({ title: "Error", description: "Failed to clear requests.", variant: "destructive" });
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
        phone: "",
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
                phone: user.phone || "",
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
            const reader = new FileReader();
            reader.onload = () => {
                setSelectedImage(reader.result as string);
                setIsCropperOpen(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        if (!user) return;
        setIsUploadingImage(true);

        try {
            const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
            if (!apiKey) {
                toast({ title: "Configuration Error", description: "ImgBB API Key is missing. Please add it to your .env.local file.", variant: "destructive" });
                setIsUploadingImage(false);
                return;
            }

            const formData = new FormData();
            formData.append("image", croppedBlob, "profile.webp");

            const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                const downloadURL = data.data.url;
                const res = await updateProfile({ photoURL: downloadURL });

                if (res.success) {
                    toast({ title: "Profile Picture Updated", description: "Your new picture has been saved successfully in low-resolution." });
                    setEditForm(prev => ({ ...prev, photoURL: downloadURL }));
                } else {
                    toast({ title: "Error", description: res.error || "Failed to save picture URL.", variant: "destructive" });
                }
            } else {
                toast({ title: "Image Host Error", description: data.error?.message || "Failed to upload to image server.", variant: "destructive" });
            }
        } catch (error) {
            console.error("Error uploading profile picture:", error);
            toast({ title: "Upload Failed", description: "Could not upload the image to the server.", variant: "destructive" });
        } finally {
            setIsUploadingImage(false);
            setIsCropperOpen(false);
            setSelectedImage("");
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemovePicture = async () => {
        if (!user) return;
        if (!confirm("Are you sure you want to remove your profile picture?")) return;
        setIsUploadingImage(true);
        try {
            const res = await updateProfile({ photoURL: "" });
            if (res.success) {
                toast({ title: "Success", description: "Profile picture removed successfully." });
                setEditForm(prev => ({ ...prev, photoURL: "" }));
            } else {
                toast({ title: "Error", description: res.error || "Failed to remove picture.", variant: "destructive" });
            }
        } finally {
            setIsUploadingImage(false);
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
                <div className={`${activeTab !== "overview" ? "hidden md:flex" : "flex"} flex-col items-center md:items-start gap-4 w-full md:w-auto`}>
                    <div className="relative">
                        <Avatar className={`w-24 h-24 md:w-32 md:h-32 border-4 ${isTopContributor ? 'border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'border-primary shadow-lg'}`}>
                            <AvatarImage src={user.photoURL || "/default-avatar.png"} alt={user.name || "User"} />
                            <AvatarFallback className="text-4xl md:text-5xl font-bold">{user.name ? user.name.charAt(0) : <UserIcon className="h-10 w-10 md:h-16 md:w-16" />}</AvatarFallback>
                        </Avatar>
                        {isTopContributor && <TopContributorBadge rank={rank} className="absolute bottom-1 right-1 translate-x-1/4 translate-y-1/4 h-[34px] w-[34px]" />}
                    </div>

                    <div className="text-center md:text-left w-full">
                        <div className="flex flex-col items-center md:items-start gap-1">
                            <h2 className="text-2xl font-semibold flex items-center justify-center md:justify-start flex-wrap gap-1">
                                {user.name}
                            </h2>
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
                        {user.phone && (
                            <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-1">
                                <span className="h-4 w-4 flex items-center justify-center">📞</span> {user.phone}
                            </p>
                        )}
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

                        {!isEditing && (
                            <div className="flex flex-col gap-2 mt-4">
                                <Button variant="outline" onClick={() => {
                                    setIsEditing(true);
                                    setActiveTab("overview");
                                }} className="w-full">
                                    Edit Profile
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 w-full space-y-6">
                    <Section>
                        <Tabs ref={tabsRef} value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="mb-4 hidden md:inline-flex">
                                <TabsTrigger value="overview">Personal Overview</TabsTrigger>
                                <TabsTrigger value="finance">Organisation Finance</TabsTrigger>
                                <TabsTrigger value="security">Security</TabsTrigger>
                            </TabsList>

                            {/* ── OVERVIEW TAB ── */}
                            <TabsContent value="overview">
                                {/* Edit Profile Form */}
                                {isEditing ? (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Edit Profile</CardTitle>
                                            <CardDescription>Update your personal information</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-col items-center mb-6">
                                                <div className="relative mb-2">
                                                    <Avatar className="w-24 h-24 border-4 border-primary shadow-sm">
                                                        <AvatarImage src={editForm.photoURL || "/default-avatar.png"} alt={editForm.name || "User"} />
                                                        <AvatarFallback className="text-3xl font-bold">{editForm.name ? editForm.name.charAt(0) : <UserIcon className="h-10 w-10" />}</AvatarFallback>
                                                    </Avatar>
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        className="hidden"
                                                        accept="image/jpeg,image/png,image/webp"
                                                        onChange={handleFileChange}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 shadow-md hover:bg-primary/90"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={isUploadingImage}
                                                        title="Update Profile Picture"
                                                    >
                                                        {isUploadingImage ? <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="h-4 w-4" />}
                                                    </Button>
                                                    {editForm.photoURL && (
                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="icon"
                                                            className="absolute top-0 right-0 rounded-full p-1 shadow-md h-7 w-7 hover:bg-destructive/90"
                                                            onClick={handleRemovePicture}
                                                            disabled={isUploadingImage}
                                                            title="Remove Profile Picture"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground">Click the camera icon to update photo</span>
                                            </div>
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
                                                <div className="space-y-2">
                                                    <Label htmlFor="edit-phone">Phone Number</Label>
                                                    <Input
                                                        id="edit-phone"
                                                        value={editForm.phone}
                                                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                    />
                                                </div>
                                                <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                                                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
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

                                        {/* Security moved to its own tab */}
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
                                            <CardContent className="overflow-x-auto md:overflow-visible">
                                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3 mb-6 min-w-max md:min-w-0">
                                                    {(!settings?.collectionYears?.includes(selectedCalendarYear) || activeMonths.length === 0) ? (
                                                        <div className="text-center py-8 text-muted-foreground col-span-full">
                                                            No collections active for this year.
                                                        </div>
                                                    ) : (
                                                        activeMonths.map((month) => {
                                                            const statusData = getMonthlyStatus(month.value, selectedCalendarYear);

                                                            let bgClass = "bg-background border-dashed border-2 opacity-50";
                                                            let textClass = "text-muted-foreground";
                                                            let valueDisplayMobile: string | null = null;
                                                            let valueDisplayDesktop: string | null = null;

                                                            if (statusData.status === 'paid') {
                                                                bgClass = "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 border-2";
                                                                textClass = "text-green-700 dark:text-green-400 font-bold";
                                                                valueDisplayMobile = `৳${statusData.payment?.amount || 0}`;
                                                                valueDisplayDesktop = `৳${statusData.payment?.amount || 0}`;
                                                            } else if (statusData.status === 'due-yellow') {
                                                                bgClass = "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800 border-2";
                                                                textClass = "text-yellow-700 dark:text-yellow-400 font-medium";
                                                                valueDisplayMobile = null;
                                                                valueDisplayDesktop = "Due";
                                                            } else if (statusData.status === 'due-red') {
                                                                bgClass = "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 border-2";
                                                                textClass = "text-red-700 dark:text-red-400 font-medium";
                                                                valueDisplayMobile = null;
                                                                valueDisplayDesktop = "Overdue";
                                                            }

                                                            return (
                                                                <div key={month.value} className={`flex flex-col justify-center items-center p-2 md:p-3 rounded-md md:rounded-lg transition-all ${bgClass}`}>
                                                                    <span className={`text-xs md:text-sm tracking-wide ${statusData.status === 'future' ? textClass : 'text-foreground font-semibold'}`}>{month.label}</span>
                                                                    <div className={`text-[10px] md:text-sm mt-0.5 md:mt-1 ${textClass} w-full text-center`}>
                                                                        <span className="md:hidden">{valueDisplayMobile}</span>
                                                                        <span className="hidden md:inline">{valueDisplayDesktop || "-"}</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>

                                                {/* Setup Legend */}
                                                <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t text-sm">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-500"></div>
                                                        <span className="text-muted-foreground text-xs md:text-sm">Paid</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-yellow-400"></div>
                                                        <span className="text-muted-foreground text-xs md:text-sm">Due <span className="hidden md:inline">(before 10th)</span></span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-red-500"></div>
                                                        <span className="text-muted-foreground text-xs md:text-sm">Overdue</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Donation History */}
                                        <Card id="history" className="md:col-span-2">
                                            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setIsDonationHistoryOpen(!isDonationHistoryOpen)}>
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <CardTitle className="flex items-center gap-2">
                                                            <Heart className="h-5 w-5 text-primary" /> Donation History
                                                        </CardTitle>
                                                        <CardDescription>Your past contributions.</CardDescription>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {paymentHistory.filter(d => !d.hiddenFromProfile).length > 0 && (
                                                            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleClearAllHistory}>
                                                                Clear All
                                                            </Button>
                                                        )}
                                                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                                                            {isDonationHistoryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
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
                                                                        <div className="font-medium text-sm">
                                                                            {donation.type === 'monthly' ? (
                                                                                <span className="flex items-center gap-1.5">
                                                                                    Monthly Subscription: <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-primary/10 text-primary hover:bg-primary/20">{format(new Date(2000, (donation.month || 1) - 1, 1), 'MMM')} {donation.year}</Badge>
                                                                                </span>
                                                                            ) : donation.method === 'bkash' ? 'Bkash Payment' : 'One-time Donation'}
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 border-t border-muted/30 pt-1">
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
                                        <Card id="requests" className="md:col-span-2">
                                            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setIsMyRequestsOpen(!isMyRequestsOpen)}>
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <CardTitle className="flex items-center gap-2">
                                                            <Shield className="h-5 w-5 text-blue-600" /> My Requests
                                                        </CardTitle>
                                                        <CardDescription>Status of your submitted requests.</CardDescription>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {myRequests.filter(r => !r.hiddenFromProfile).length > 0 && (
                                                            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleClearAllRequests}>
                                                                Clear All
                                                            </Button>
                                                        )}
                                                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                                                            {isMyRequestsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
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
                                                                    <TableCell className="capitalize text-xs max-w-[120px]">
                                                                        <div className="flex flex-col gap-1">
                                                                            <span>{req.type}</span>
                                                                            {req.type === 'monthly' && req.months && (
                                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                                    {req.months.map((m: number) => (
                                                                                        <Badge key={m} variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/20">
                                                                                            {format(new Date(2000, m - 1, 1), 'MMM')} {req.year}
                                                                                        </Badge>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </TableCell>
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
                            </TabsContent>

                            {/* ── FINANCE TAB ── */}
                            <TabsContent value="finance">
                                <MemberFinanceTab />
                            </TabsContent>

                            {/* ── SECURITY TAB ── */}
                            <TabsContent value="security">
                                <Card>
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
                                                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowOldPassword(!showOldPassword)}>
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
                                                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowNewPassword(!showNewPassword)}>
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
                            </TabsContent>
                        </Tabs>
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

            {/* Profile Picture Cropper Modal */}
            <ImageCropper
                open={isCropperOpen}
                imageSrc={selectedImage}
                onClose={() => {
                    setIsCropperOpen(false);
                    setSelectedImage("");
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                onCropComplete={handleCropComplete}
                isUploading={isUploadingImage}
            />
        </div >
    );
}

export default function ProfilePage() {
    return (
        <SettingsProvider>
            <FinanceProvider>
                <ProfileContent />
            </FinanceProvider>
        </SettingsProvider>
    );
}
