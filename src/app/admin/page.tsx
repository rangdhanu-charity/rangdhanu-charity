"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useData } from "@/lib/data-context";
import { useFinance } from "@/lib/finance-context";
import { useSettings } from "@/lib/settings-context";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FolderOpen, DollarSign, Users, TrendingUp, CreditCard, AlertCircle, Heart } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
    const { projects } = useData();
    const { payments, totalCollection } = useFinance();
    const { settings } = useSettings();
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

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

    const currentMonthCollection = payments
        .filter(p => {
            const d = new Date(p.date);
            return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const totalMemberCollection = payments
        .filter(p => p.type === 'monthly')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const totalOneTimeCollection = payments
        .filter(p => p.type === 'one-time')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

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
    const paidMembersCount = users.filter(user => {
        return payments.some(p =>
            p.userId === user.id &&
            p.type === 'monthly' &&
            p.month === currentMonth &&
            p.year === currentYear
        );
    }).length;

    const dueMembersCount = users.length - paidMembersCount;

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

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">Financial Overview & Analytics</p>
            </div>

            {/* Financial Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
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
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Member Collection</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">৳{totalMemberCollection.toLocaleString()}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Monthly subscriptions overall</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">One-time Donations</CardTitle>
                        <Heart className="h-4 w-4 text-pink-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-pink-600">৳{totalOneTimeCollection.toLocaleString()}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Direct single contributions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Month</CardTitle>
                        <TrendingUp className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-indigo-600">৳{currentMonthCollection.toLocaleString()}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Current month collection</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Paid Members</CardTitle>
                        <CreditCard className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loadingUsers ? "..." : paidMembersCount}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">For current month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Due Members</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{loadingUsers ? "..." : dueMembersCount}</div>
                        <p className="text-[10px] text-muted-foreground mt-1">Pending payments</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Monthly Trend Chart */}
                <Card className="col-span-4">
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
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Top Contributors</CardTitle>
                        <CardDescription>Highest financial contributions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={topContributors} layout="horizontal" margin={{ bottom: 40 }} key={`${JSON.stringify(topContributors)}-${lastUpdate}`}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        tickLine={false}
                                        axisLine={false}
                                        tick={{ fontSize: 11 }}
                                        interval={0}
                                        angle={-45}
                                        textAnchor="end"
                                        height={60}
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `৳${value}`}
                                    />
                                    <Tooltip
                                        formatter={(value: any) => [`৳${value}`, "Contributed"]}
                                        cursor={{ fill: 'transparent' }}
                                    />
                                    <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Original Project Stats (Preserved but pushed down) */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Active Projects</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {projects.slice(0, 3).map((project) => (
                                <div key={project.id} className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0">
                                    <div>
                                        <p className="font-medium">{project.title}</p>
                                        <p className="text-sm text-muted-foreground">৳{project.raised.toLocaleString()} / ৳{project.goal.toLocaleString()}</p>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {Math.round((project.raised / project.goal) * 100)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
