"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useData } from "@/lib/data-context";
import { useFinance } from "@/lib/finance-context";
import { useSettings } from "@/lib/settings-context";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FolderOpen, DollarSign, Users, TrendingUp, CreditCard, AlertCircle, Heart, UserCheck } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

export default function AdminDashboard() {
    const { projects } = useData();
    const { payments, totalCollection } = useFinance();
    const { settings } = useSettings();
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    // Detail Modal State
    const [detailModal, setDetailModal] = useState<string | null>(null);

    // Trend View State: "all" or specific year string "2024"
    const [trendView, setTrendView] = useState<string>(new Date().getFullYear().toString());
    const [lastUpdate, setLastUpdate] = useState(Date.now());

    // Force update when payments change
    useEffect(() => {
        setLastUpdate(Date.now());
    }, [payments]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const q = query(collection(db, "users"));
                const snapshot = await getDocs(q);
                setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchUsers();
    }, []);

    // Financial calculations
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const currentMonthPayments = payments.filter(p => {
        const d = new Date(p.date);
        return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
    });

    const currentMonthCollection = currentMonthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const monthlyPayments = payments.filter(p => p.type === 'monthly');
    const totalMemberCollection = monthlyPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const oneTimePayments = payments.filter(p => p.type === 'one-time');
    const totalOneTimeCollection = oneTimePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Date range calculation for lifetime based on actual admin settings
    let earliestDate = "N/A";
    let latestDate = "Present";

    if (settings && settings.collectionYears && settings.collectionYears.length > 0) {
        // Find earliest year in settings
        const earliestYear = Math.min(...settings.collectionYears);

        // Find earliest month in the earliest year
        const monthsForYear = settings.collectionMonths?.[earliestYear] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        const earliestMonth = Math.min(...monthsForYear);

        // Convert to Date for formatting
        try {
            const dateObj = new Date(earliestYear, earliestMonth - 1, 1);
            earliestDate = dateObj.toLocaleDateString('default', { month: 'short', year: 'numeric' });
        } catch (e) {
            // fallback
            earliestDate = `${earliestYear}`;
        }
    } else if (payments.length > 0) {
        // Fallback to payments if no settings available
        const earliestP = payments[payments.length - 1];
        try {
            earliestDate = earliestP.date.toLocaleDateString('default', { month: 'short', year: 'numeric' });
        } catch (e) { }
    }

    // Paid/Due Members Logic
    const paidMembers = users.filter(user => {
        return payments.some(p =>
            p.userId === user.id &&
            p.type === 'monthly' &&
            p.month === currentMonth &&
            p.year === currentYear
        );
    });
    const paidMembersCount = paidMembers.length;

    const dueMembers = users.filter(user => !paidMembers.some(pm => pm.id === user.id));
    const dueMembersCount = dueMembers.length;

    // Top Contributors Logic
    const topContributors = useMemo(() => {
        const contributorMap = new Map<string, number>();
        payments.forEach(p => {
            const name = p.memberName || "Anonymous";
            contributorMap.set(name, (contributorMap.get(name) || 0) + Number(p.amount));
        });

        return Array.from(contributorMap.entries())
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
    }, [payments]);



    // Chart Data Logic
    const chartData = useMemo(() => {
        if (trendView === 'all') {
            // All Time (Yearly)
            const yearMap = new Map<number, number>();
            payments.forEach(p => {
                let y;
                if (p.type === 'monthly' && p.year) {
                    y = p.year;
                } else {
                    y = new Date(p.date).getFullYear();
                }
                yearMap.set(y, (yearMap.get(y) || 0) + Number(p.amount));
            });
            return Array.from(yearMap.entries())
                .sort((a, b) => a[0] - b[0])
                // Filter out NaN years if data is corrupted
                .filter(([year]) => !isNaN(year))
                .map(([year, collection]) => ({ name: year.toString(), collection }));
        } else {
            // Specific Year (Monthly)
            const selectedYear = parseInt(trendView);
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return months.map((month, index) => {
                const monthNum = index + 1;
                const collection = payments
                    .filter(p => {
                        // Priority: Collection Period (Year/Month) for monthly payments
                        if (p.type === 'monthly' && p.year && p.month) {
                            return p.year === selectedYear && p.month === monthNum;
                        }
                        // Fallback: Transaction Date
                        const d = new Date(p.date);
                        return d.getFullYear() === selectedYear && (d.getMonth() + 1) === monthNum;
                    })
                    .reduce((sum, p) => sum + Number(p.amount), 0);
                return { name: month, collection };
            });
        }
    }, [trendView, payments]);

    const renderPaymentList = (list: any[], title: string, description: string) => {
        const sortedList = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Group monthly payments by member and date
        const groupedMap = new Map();
        const groupedList: any[] = [];

        for (const p of sortedList) {
            if (p.type === 'monthly' && p.memberName) {
                const dateKey = format(new Date(p.date), 'yyyy-MM-dd');
                const groupKey = `${p.memberName}-${dateKey}-monthly`;

                if (!groupedMap.has(groupKey)) {
                    groupedMap.set(groupKey, []);
                }
                groupedMap.get(groupKey).push(p);
            } else {
                groupedList.push(p);
            }
        }

        groupedMap.forEach((paymentsGroup) => {
            if (paymentsGroup.length > 1) {
                const totalAmount = paymentsGroup.reduce((sum: number, sp: any) => sum + (Number(sp.amount) || 0), 0);

                // Sort by year and month strictly
                const sortedGroup = [...paymentsGroup].sort((a: any, b: any) => {
                    if (a.year !== b.year) return (a.year || 0) - (b.year || 0);
                    return (a.month || 0) - (b.month || 0);
                });

                let formattedMonths = '';
                if (sortedGroup.length > 2) {
                    const first = sortedGroup[0];
                    const last = sortedGroup[sortedGroup.length - 1];
                    formattedMonths = `${format(new Date(first.year || 0, (first.month || 1) - 1), 'MMM yyyy')} to ${format(new Date(last.year || 0, (last.month || 1) - 1), 'MMM yyyy')}`;
                } else {
                    formattedMonths = sortedGroup.map((sp: any) =>
                        `${format(new Date(sp.year || 0, (sp.month || 1) - 1), 'MMM yyyy')}`
                    ).join(', ');
                }

                groupedList.push({
                    ...sortedGroup[0],
                    amount: totalAmount,
                    isGrouped: true,
                    groupedText: formattedMonths,
                });
            } else {
                groupedList.push(paymentsGroup[0]);
            }
        });

        // Re-sort the final list by date descending using the first item's date of each group
        const finalSortedList = groupedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const total = finalSortedList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        return (
            <div className="space-y-4">
                <div>
                    <p className="font-semibold mb-1">Total: ৳{total.toLocaleString()}</p>
                </div>
                <ScrollArea className="h-[400px] rounded-md border">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Member</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {finalSortedList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No records found.</TableCell>
                                </TableRow>
                            ) : (
                                finalSortedList.map((p, i) => (
                                    <TableRow key={p.id || i}>
                                        <TableCell>{format(new Date(p.date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell>{p.memberName || "N/A"}</TableCell>
                                        <TableCell className="capitalize">
                                            {p.isGrouped ? (
                                                <span className="font-medium">{p.groupedText} <span className="text-muted-foreground font-normal">(Monthly)</span></span>
                                            ) : p.type === 'monthly' && p.month && p.year ? (
                                                `${format(new Date(p.year, p.month - 1), 'MMMM yyyy')} (Monthly)`
                                            ) : (
                                                p.type
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-green-600">৳{p.amount?.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        )
    };

    const renderMemberList = (list: any[], title: string, description: string) => {
        return (
            <div className="space-y-4">
                <ScrollArea className="h-[400px] rounded-md border">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Joined</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {list.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No members found.</TableCell>
                                </TableRow>
                            ) : (
                                list.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{user.phone || "-"}</TableCell>
                                        <TableCell>{user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : "N/A"}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">Financial Overview & Analytics</p>
            </div>

            {/* Financial Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setDetailModal("total-collection")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Collection</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">৳{totalCollection.toLocaleString()}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            {earliestDate} - Present
                        </p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setDetailModal("member-collection")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Member Collection</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">৳{totalMemberCollection.toLocaleString()}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Monthly subscriptions overall</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setDetailModal("one-time-collection")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">One-time Donations</CardTitle>
                        <Heart className="h-4 w-4 text-pink-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-pink-600">৳{totalOneTimeCollection.toLocaleString()}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Direct single contributions</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setDetailModal("this-month")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Month</CardTitle>
                        <TrendingUp className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-600">৳{currentMonthCollection.toLocaleString()}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Current month collection</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setDetailModal("paid-members")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Paid Members</CardTitle>
                        <CreditCard className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loadingUsers ? "..." : paidMembersCount}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">For current month</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setDetailModal("due-members")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Due Members</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{loadingUsers ? "..." : dueMembersCount}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Pending payments</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setDetailModal("total-members")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                        <UserCheck className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{loadingUsers ? "..." : users.length}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Registered members</p>
                    </CardContent>
                </Card>

            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Monthly Trend Chart */}
                <Card className="md:col-span-2 lg:col-span-4">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Collection Trend</CardTitle>
                            <CardDescription>
                                {trendView === 'all' ? "Yearly collection over time" : `Monthly collection for ${trendView}`}
                            </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Select value={trendView} onValueChange={setTrendView}>
                                <SelectTrigger className="w-[120px] h-8">
                                    <SelectValue placeholder="Select View" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Time</SelectItem>
                                    {/* Use settings.collectionYears to ensure sync with Collections tab */}
                                    {settings.collectionYears.sort((a, b) => b - a).map(year => (
                                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} key={`${JSON.stringify(chartData)}-${lastUpdate}`}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `৳${value}`}
                                    />
                                    <Tooltip formatter={(value: any) => [`৳${value}`, "Collection"]} />
                                    <Line type="monotone" dataKey="collection" stroke="#2563eb" strokeWidth={2} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Contributors */}
                <Card className="md:col-span-2 lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Top Contributors</CardTitle>
                        <CardDescription>Highest financial contributions</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topContributors} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 5 }} key={`${JSON.stringify(topContributors)}-${lastUpdate}`}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis
                                        type="number"
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `৳${value}`}
                                        tick={{ fontSize: 10 }}
                                    />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 11 }}
                                        width={80}
                                    />
                                    <Tooltip
                                        formatter={(value: any) => [`৳${value}`, "Contributed"]}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={!!detailModal} onOpenChange={(open) => !open && setDetailModal(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            {detailModal === "total-collection" && "Total Collection Details"}
                            {detailModal === "member-collection" && "Member Collection Details"}
                            {detailModal === "one-time-collection" && "One-time Donations Details"}
                            {detailModal === "this-month" && "This Month's Collections"}
                            {detailModal === "paid-members" && "Paid Members This Month"}
                            {detailModal === "due-members" && "Due Members This Month"}
                            {detailModal === "total-members" && "Total Registered Members"}
                        </DialogTitle>
                        <DialogDescription>
                            {detailModal === "total-collection" && "Complete breakdown of all financial collections."}
                            {detailModal === "member-collection" && "Breakdown of regular monthly member contributions."}
                            {detailModal === "one-time-collection" && "Breakdown of all direct single donations."}
                            {detailModal === "this-month" && `All collections gathered in ${format(new Date(), 'MMMM yyyy')}.`}
                            {detailModal === "paid-members" && "Members who have successfully paid for the current month."}
                            {detailModal === "due-members" && "Members with pending payments for the current month."}
                            {detailModal === "total-members" && "List of all active user accounts."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                        {detailModal === "total-collection" && renderPaymentList(payments, "Total Collection", "")}
                        {detailModal === "member-collection" && renderPaymentList(monthlyPayments, "Member Collection", "")}
                        {detailModal === "one-time-collection" && renderPaymentList(oneTimePayments, "One-time Donations", "")}
                        {detailModal === "this-month" && renderPaymentList(currentMonthPayments, "This Month's Collections", "")}
                        {detailModal === "paid-members" && renderMemberList(paidMembers, "Paid Members This Month", "")}
                        {detailModal === "due-members" && renderMemberList(dueMembers, "Due Members This Month", "")}
                        {detailModal === "total-members" && renderMemberList(users, "Total Registered Members", "")}
                    </div>
                </DialogContent>
            </Dialog>

        </div >
    );
}

