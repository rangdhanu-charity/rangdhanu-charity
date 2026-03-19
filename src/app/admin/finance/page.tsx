"use client";

import { useState, useEffect } from "react";

import { useFinance, Expense } from "@/lib/finance-context";
import { useSettings } from "@/lib/settings-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2, Edit, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";


import { ScrollArea } from "@/components/ui/scroll-area";

export default function FinancePage() {
    const {
        expenses,
        addExpense,
        deleteExpense,
        totalCollection,
        totalExpenses,
        currentBalance,
        payments // Need payments for collection graph
    } = useFinance();
    const { settings } = useSettings();

    const [selectedYear, setSelectedYear] = useState<number | "all">(new Date().getFullYear());
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [totalMembersCount, setTotalMembersCount] = useState<number | null>(null);

    // Detail Modal State
    const [financeModal, setFinanceModal] = useState<string | null>(null);

    useEffect(() => {
        const fetchMembersCount = async () => {
            try {
                const snap = await getDocs(query(collection(db, "users")));
                setTotalMembersCount(snap.size);
            } catch (e) {
                console.error("Failed to fetch members count", e);
            }
        };
        fetchMembersCount();
    }, []);


    const [formData, setFormData] = useState({
        title: "",
        category: "Operational",
        amount: "",
        date: format(new Date(), "yyyy-MM-dd"),
        notes: ""
    });

    const filteredExpenses = (selectedYear === "all"
        ? expenses
        : expenses.filter(e => new Date(e.date).getFullYear() === selectedYear))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate Chart Data
    let chartData = [];

    if (selectedYear === "all") {
        // Group by Year
        const yearMap = new Map<number, { collection: number; expense: number }>();

        // Process Payments (Collection)
        payments.forEach(p => {
            let y;
            if (p.type === 'monthly' && p.year) {
                y = p.year;
            } else {
                y = new Date(p.date).getFullYear();
            }
            if (!yearMap.has(y)) yearMap.set(y, { collection: 0, expense: 0 });
            yearMap.get(y)!.collection += Number(p.amount) || 0;
        });

        // Process Expenses
        expenses.forEach(e => {
            const y = new Date(e.date).getFullYear();
            if (!yearMap.has(y)) yearMap.set(y, { collection: 0, expense: 0 });
            yearMap.get(y)!.expense += Number(e.amount) || 0;
        });

        chartData = Array.from(yearMap.entries())
            .sort((a, b) => a[0] - b[0])
            .filter(([year]) => !isNaN(year))
            .map(([year, data]) => ({
                name: year.toString(),
                collection: data.collection,
                expense: data.expense
            }));

    } else {
        // Group by Month for Selected Year
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        chartData = months.map((month, index) => {
            const monthNum = index + 1;
            const collection = payments
                .filter(p => {
                    // Priority: Collection Period
                    if (p.type === 'monthly' && p.year && p.month) {
                        return p.year === selectedYear && p.month === monthNum;
                    }
                    // Fallback: Transaction Date
                    const d = new Date(p.date);
                    return d.getFullYear() === selectedYear && (d.getMonth() + 1) === monthNum;
                })
                .reduce((sum, p) => sum + Number(p.amount), 0);  // collection per month

            const expense = expenses
                .filter(e => {
                    const d = new Date(e.date);
                    return d.getFullYear() === selectedYear && (d.getMonth() + 1) === monthNum;
                })
                .reduce((sum, e) => sum + Number(e.amount), 0);

            return { name: month, collection, expense };
        });
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const expenseData = {
                ...formData,
                amount: Number(formData.amount),
                date: new Date(formData.date),
                recordedBy: "Admin"
            };

            if (editingExpense) {
                // Workaround: Delete and Add (since update not in context yet - safe enough for now)
                await deleteExpense(editingExpense.id);
                await addExpense(expenseData);
            } else {
                await addExpense(expenseData);
            }

            setIsDialogOpen(false);
            setFormData({
                title: "",
                category: "Operational",
                amount: "",
                date: format(new Date(), "yyyy-MM-dd"),
                notes: ""
            });
            setEditingExpense(null);
        } catch (error) {
            console.error("Error saving expense:", error);
        }
    };

    const handleEdit = (expense: Expense) => {
        setEditingExpense(expense);
        setFormData({
            title: expense.title,
            category: expense.category,
            amount: expense.amount.toString(),
            date: format(new Date(expense.date), "yyyy-MM-dd"),
            notes: expense.notes || ""
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this expense?")) {
            await deleteExpense(id);
        }
    };

    const renderPaymentList = () => {
        const sortedList = [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
                const totalGroupedAmount = paymentsGroup.reduce((sum: number, sp: any) => sum + (Number(sp.amount) || 0), 0);

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
                    amount: totalGroupedAmount,
                    isGrouped: true,
                    groupedText: formattedMonths,
                });
            } else {
                groupedList.push(paymentsGroup[0]);
            }
        });

        // Re-sort the final list by date descending using the first item's date of each group
        const finalSortedList = groupedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return (
            <div className="space-y-4">
                <div>
                    <p className="font-semibold mb-1">Total: ৳{totalCollection.toLocaleString()}</p>
                </div>
                <ScrollArea className="h-[400px] rounded-md border">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {finalSortedList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No collections recorded.</TableCell>
                                </TableRow>
                            ) : (
                                finalSortedList.map((p, i) => (
                                    <TableRow key={p.id || i}>
                                        <TableCell>{format(new Date(p.date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell>{p.memberName || "Guest / Direct"}</TableCell>
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

    const renderExpenseList = () => {
        const sortedList = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return (
            <div className="space-y-4">
                <div>
                    <p className="font-semibold mb-1">Total: ৳{totalExpenses.toLocaleString()}</p>
                </div>
                <ScrollArea className="h-[400px] rounded-md border">
                    <Table>
                        <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No expenses recorded.</TableCell>
                                </TableRow>
                            ) : (
                                sortedList.map((e, i) => (
                                    <TableRow key={e.id || i}>
                                        <TableCell>{format(new Date(e.date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell>{e.title}</TableCell>
                                        <TableCell>{e.category}</TableCell>
                                        <TableCell className="text-right font-medium text-red-600">৳{e.amount?.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </div>
        )
    }

    const renderBalanceSummary = () => {
        return (
            <div className="space-y-4">
                <div>
                    <p className="font-semibold mb-1 text-lg">Final Balance: ৳{currentBalance.toLocaleString()}</p>
                </div>
                <div className="rounded-md border p-4">
                    <div className="flex justify-between items-center py-2 border-b">
                        <span className="font-medium text-muted-foreground">Total Inflow (Collections)</span>
                        <span className="font-bold text-green-600 text-lg">৳{totalCollection.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                        <span className="font-medium text-muted-foreground">Total Outflow (Expenses)</span>
                        <span className="font-bold text-red-600 text-lg">৳{totalExpenses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 pt-4">
                        <span className="font-bold text-lg">Current Available Balance</span>
                        <span className="font-bold text-blue-600 text-2xl">৳{currentBalance.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
                <div className="flex gap-2">
                    <Select
                        value={selectedYear.toString()}
                        onValueChange={(v) => setSelectedYear(v === "all" ? "all" : Number(v))}
                    >
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Time</SelectItem>
                            {settings.collectionYears.sort((a, b) => b - a).map(year => (
                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={() => {
                        setEditingExpense(null);
                        setFormData({
                            title: "",
                            category: "Operational",
                            amount: "",
                            date: format(new Date(), "yyyy-MM-dd"),
                            notes: ""
                        });
                        setIsDialogOpen(true);
                    }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Record Expense
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setFinanceModal("total-collection")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Collection</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">৳{totalCollection.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">All time collected</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setFinanceModal("total-expenses")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">৳{totalExpenses.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">All time spending</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setFinanceModal("current-balance")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">৳{currentBalance.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">Available funds</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                        <UserCheck className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">
                            {totalMembersCount === null ? "..." : totalMembersCount}
                        </div>
                        <p className="text-xs text-muted-foreground">Registered members</p>
                    </CardContent>
                </Card>
            </div>


            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Chart Section */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Financial Overview ({selectedYear === "all" ? "All Time" : selectedYear})</CardTitle>
                        <CardDescription>{selectedYear === "all" ? "Yearly Collection vs Expenses" : "Monthly Collection vs Expenses"}</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} key={JSON.stringify(chartData)}>
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
                                    <Tooltip formatter={(value: any) => `৳${value}`} />
                                    <Legend />
                                    <Bar dataKey="collection" name="Collection" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Expenses List */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Expenses ({selectedYear === "all" ? "All Time" : selectedYear})</CardTitle>
                        <CardDescription>Transactions list</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-[300px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="w-[80px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredExpenses.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground">No expenses found.</TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredExpenses.map(expense => (
                                            <TableRow key={expense.id}>
                                                <TableCell className="font-medium">
                                                    {expense.createdAt
                                                        ? format(new Date(expense.createdAt), "MMM d, yyyy h:mm a")
                                                        : format(new Date(expense.date), "MMM d, yyyy h:mm a")}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span>{expense.title}</span>
                                                        <span className="text-xs text-muted-foreground">{expense.category}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right text-red-600 font-medium">-{expense.amount}</TableCell>
                                                <TableCell>
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(expense)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(expense.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingExpense ? "Edit Expense" : "Record Expense"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                placeholder="Expense description"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select
                                value={formData.category}
                                onValueChange={v => setFormData({ ...formData, category: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Operational">Operational</SelectItem>
                                    <SelectItem value="Event">Event</SelectItem>
                                    <SelectItem value="Charity">Charity Distribution</SelectItem>
                                    <SelectItem value="Marketing">Marketing</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Amount (৳)</Label>
                            <Input
                                type="number"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Input
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                        <DialogFooter>
                            {editingExpense && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={async () => {
                                        if (confirm("Delete this expense?")) {
                                            await deleteExpense(editingExpense.id);
                                            setIsDialogOpen(false);
                                        }
                                    }}
                                >
                                    Delete
                                </Button>
                            )}
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* DETAIL MODALS UI */}
            <Dialog open={!!financeModal} onOpenChange={(open) => !open && setFinanceModal(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>
                            {financeModal === "total-collection" && "Total Collections Breakdown"}
                            {financeModal === "total-expenses" && "Total Expenses Breakdown"}
                            {financeModal === "current-balance" && "Balance Summary"}
                        </DialogTitle>
                        <DialogDescription>
                            {financeModal === "total-collection" && "Complete list of all recorded contributions."}
                            {financeModal === "total-expenses" && "Complete list of all recorded expenses."}
                            {financeModal === "current-balance" && "Overview of total inflows vs total outflows."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                        {financeModal === "total-collection" && renderPaymentList()}
                        {financeModal === "total-expenses" && renderExpenseList()}
                        {financeModal === "current-balance" && renderBalanceSummary()}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

