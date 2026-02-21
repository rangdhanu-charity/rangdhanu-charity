"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFinance } from "@/lib/finance-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function ReportsPage() {
    const { payments } = useFinance();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [view, setView] = useState<"summary" | "paid" | "due">("summary");

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const q = query(collection(db, "users"));
                const snapshot = await getDocs(q);
                setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Process Data
    const userReports = users.map(user => {
        const userPayments = payments.filter(p => p.userId === user.id);

        const totalPaid = userPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const monthlyPayments = userPayments.filter(p => p.type === 'monthly' && p.year === currentYear);
        const oneTimePayments = userPayments.filter(p => p.type === 'one-time');

        const monthsPaidCount = monthlyPayments.length;

        // Simple logic for checking current month status
        // We assume they pay for months sequentially or at least checking if CURRENT month is paid
        const isPaidCurrentMonth = monthlyPayments.some(p => p.month === currentMonth);

        // Due Check: If it's past the 10th and not paid, or just not paid yet?
        // Requirement: "Paid members, Due members will be calculated"

        return {
            ...user,
            totalPaid,
            oneTimeTotal: oneTimePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
            monthsPaidCount,
            monthsDueCount: currentMonth - monthsPaidCount, // Rough estimate of due months YTD
            isPaidCurrentMonth
        };
    });

    const paidMembers = userReports.filter(u => u.isPaidCurrentMonth);
    const dueMembers = userReports.filter(u => !u.isPaidCurrentMonth);

    const filteredReports = userReports.filter(u =>
    (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const displayedUsers = filteredReports.filter(u => {
        if (view === 'paid') return u.isPaidCurrentMonth;
        if (view === 'due') return !u.isPaidCurrentMonth;
        return true;
    });

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setView("paid")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Paid Members (Current Month)</CardTitle>
                        <div className="h-4 w-4 rounded-full bg-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{paidMembers.length}</div>
                        <p className="text-xs text-muted-foreground">Click to view list</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setView("due")}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Due Members (Current Month)</CardTitle>
                        <div className="h-4 w-4 rounded-full bg-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dueMembers.length}</div>
                        <p className="text-xs text-muted-foreground">Click to view list</p>
                    </CardContent>
                </Card>
            </div>

            <div className="flex space-x-2 bg-muted p-1 rounded-lg w-fit">
                {["summary", "paid", "due"].map((v) => (
                    <button
                        key={v}
                        onClick={() => setView(v as any)}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${view === v ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground/80"
                            }`}
                    >
                        {v === 'summary' ? 'All Members' : v + ' List'}
                    </button>
                ))}
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Member Contributions</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-right">Total Paid (৳)</TableHead>
                                    <TableHead className="text-right">One-time (৳)</TableHead>
                                    <TableHead className="text-center">Months Paid</TableHead>
                                    <TableHead className="text-center">Status (Current Month)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
                                    </TableRow>
                                ) : displayedUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No members found.</TableCell>
                                    </TableRow>
                                ) : (
                                    displayedUsers.map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">
                                                <div>{user.name || user.username}</div>
                                                <div className="text-xs text-muted-foreground">{user.email}</div>
                                            </TableCell>
                                            <TableCell className="text-right">৳{user.totalPaid}</TableCell>
                                            <TableCell className="text-right">৳{user.oneTimeTotal}</TableCell>
                                            <TableCell className="text-center">{user.monthsPaidCount}</TableCell>
                                            <TableCell className="text-center">
                                                {user.isPaidCurrentMonth ? (
                                                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                                        Paid
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                                                        Due
                                                    </span>
                                                )}
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
    );
}
