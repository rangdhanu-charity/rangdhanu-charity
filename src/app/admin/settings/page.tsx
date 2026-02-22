"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, writeBatch, doc, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, AlertTriangle, FileJson, Trash2, RotateCcw, Trash, Activity, FileText, FileSpreadsheet } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecycleService, RecycleItem } from "@/lib/recycle-service";

export default function SettingsPage() {
    const { toast } = useToast();
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    // --- RECYCLE BIN STATE ---
    const [deletedItems, setDeletedItems] = useState<RecycleItem[]>([]);
    const [recycleLoading, setRecycleLoading] = useState(true);
    const [recycleCategory, setRecycleCategory] = useState<string>("all");

    // --- ACTIVITY LOGS STATE ---
    const [activityLogs, setActivityLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(true);

    // --- EFFECTS ---
    useEffect(() => {
        setRecycleLoading(true);
        RecycleService.cleanupOldItems().catch(console.error);

        const q = query(collection(db, "recycle_bin"), orderBy("deletedAt", "desc"));
        const unsubscribeRecycle = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RecycleItem[];
            setDeletedItems(items);
            setRecycleLoading(false);
        }, (error) => {
            console.error("Error fetching recycle bin:", error);
            toast({ title: "Error", description: "Failed to load recycle bin.", variant: "destructive" });
            setRecycleLoading(false);
        });

        const logsQ = query(collection(db, "activity_logs"), orderBy("createdAt", "desc"));
        const unsubscribeLogs = onSnapshot(logsQ, (snapshot) => {
            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setActivityLogs(logs);
            setLogsLoading(false);
        }, (error) => {
            console.error("Error fetching activity logs:", error);
            toast({ title: "Error", description: "Failed to load activity logs.", variant: "destructive" });
            setLogsLoading(false);
        });

        return () => {
            unsubscribeRecycle();
            unsubscribeLogs();
        };
    }, []);

    const filteredItems = deletedItems.filter(item => {
        if (recycleCategory === "all") return true;
        if (recycleCategory === "payment") return item.type === "payment";
        if (recycleCategory === "user") return item.type === "user";
        if (recycleCategory === "system") return item.type === "other" || item.type === "project"; // Grouping system/other
        return true;
    });

    const handleRestore = async (item: RecycleItem) => {
        if (!confirm(`Restore ${item.name}?`)) return;
        try {
            await RecycleService.restore(item.id);
            toast({ title: "Restored", description: `${item.name} has been restored.` });
        } catch (error) {
            console.error("Restore failed:", error);
            toast({ title: "Error", description: "Failed to restore item.", variant: "destructive" });
        }
    };

    const handlePermanentDelete = async (item: RecycleItem) => {
        if (!confirm(`Permanently delete ${item.name}? This cannot be undone.`)) return;
        try {
            await RecycleService.permanentDelete(item.id);
            toast({ title: "Deleted", description: `${item.name} permanently removed.` });
        } catch (error) {
            console.error("Delete failed:", error);
            toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
        }
    };

    const handleEmptyBin = async () => {
        if (!confirm("Are you sure you want to empty the recycle bin? All items will be permanently lost.")) return;
        try {
            const promises = deletedItems.map(item => RecycleService.permanentDelete(item.id));
            await Promise.all(promises);
            toast({ title: "Bin Emptied", description: "Recycle bin is now empty." });
        } catch (error) {
            console.error("Empty bin failed:", error);
            toast({ title: "Error", description: "Failed to empty bin.", variant: "destructive" });
        }
    }

    // --- BACKUP LOGIC ---
    const handleBackup = async () => {
        setIsBackingUp(true);
        try {
            const collectionsToBackup = [
                "users", "payments", "expenses", "projects",
                "team", "testimonials", "registration_requests", "admins", "system_settings", "recycle_bin"
            ];

            const backupData: Record<string, any[]> = {};

            for (const colName of collectionsToBackup) {
                const snapshot = await getDocs(collection(db, colName));
                backupData[colName] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
            }

            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `rangdhanu-backup-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast({ title: "Backup Complete", description: "Database backup downloaded successfully." });
        } catch (error) {
            console.error("Backup failed:", error);
            toast({ title: "Backup Failed", description: "Could not generate backup.", variant: "destructive" });
        } finally {
            setIsBackingUp(false);
        }
    };

    // --- RESTORE LOGIC ---
    const handleRestoreData = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm("WARNING: Restoring will merge/overwrite existing data. This cannot be undone. Are you sure?")) {
            e.target.value = ""; // Reset input
            return;
        }

        setIsRestoring(true);
        try {
            await performRestore(file);
        } catch (e) {
            console.error(e);
            toast({ title: "Restore Failed", description: "Invalid file or error writing to database.", variant: "destructive" });
        } finally {
            setIsRestoring(false);
            e.target.value = ""; // Reset
        }
    };

    const performRestore = async (file: File) => {
        const text = await file.text();
        const data = JSON.parse(text);
        const { setDoc, doc } = await import("firebase/firestore");

        let count = 0;
        for (const [colName, docs] of Object.entries(data)) {
            if (!Array.isArray(docs)) continue;
            for (const docData of docs) {
                const { id, ...rest } = docData;
                if (!id) continue;

                const cleanData = { ...rest };
                ['date', 'createdAt', 'updatedAt', 'dob', 'deletedAt'].forEach(field => {
                    if (cleanData[field] && typeof cleanData[field] === 'string') {
                        cleanData[field] = new Date(cleanData[field]);
                    }
                });

                await setDoc(doc(db, colName, id), cleanData, { merge: true });
                count++;
            }
        }
        toast({ title: "Restore Complete", description: `Restored ${count} items successfully.` });
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>

            <Tabs defaultValue="general" className="w-full">
                <TabsList className="flex w-full justify-start overflow-x-auto sm:grid sm:grid-cols-3 lg:w-[600px] mb-4">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="recycle">Recycle Bin</TabsTrigger>
                    <TabsTrigger value="activity">Activity Logs</TabsTrigger>
                </TabsList>

                {/* --- GENERAL TAB --- */}
                <TabsContent value="general" className="space-y-6 mt-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* BACKUP */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Download className="h-5 w-5" /> Backup Data
                                </CardTitle>
                                <CardDescription>
                                    Download a comprehensive JSON backup of your entire database.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Alert className="mb-4 bg-muted/50 border-none">
                                    <FileJson className="h-4 w-4" />
                                    <AlertTitle>Full Export</AlertTitle>
                                    <AlertDescription>
                                        Includes Users, Payments, Expenses, Projects, Teams, Settings, and Recycle Bin.
                                    </AlertDescription>
                                </Alert>
                                <Button onClick={handleBackup} disabled={isBackingUp} className="w-full">
                                    {isBackingUp ? "Generating Backup..." : "Download Backup .json"}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* RESTORE */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Upload className="h-5 w-5" /> Restore Data
                                </CardTitle>
                                <CardDescription>
                                    Restore data from a previously verified backup file.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Alert variant="destructive" className="mb-4">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Warning</AlertTitle>
                                    <AlertDescription>
                                        Looking to restore? This action <strong>merges</strong> data. Existing records with same IDs will be updated.
                                    </AlertDescription>
                                </Alert>
                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <Label htmlFor="restore-file">Upload Backup File</Label>
                                    <Input
                                        id="restore-file"
                                        type="file"
                                        accept=".json"
                                        onChange={handleRestoreData}
                                        disabled={isRestoring}
                                    />
                                    {isRestoring && <p className="text-sm text-muted-foreground animate-pulse">Restoring data... please wait...</p>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* EXPORT CENTER */}
                    <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-primary/20 mt-6">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Download className="h-5 w-5 text-primary" /> Report Export Center
                            </CardTitle>
                            <CardDescription>Generate beautifully formatted PDF and Excel reports for offline analysis and record-keeping.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20" onClick={async () => {
                                    const { getDocs, collection } = await import("firebase/firestore");
                                    const { db } = await import("@/lib/firebase");
                                    const { ExportService } = await import("@/lib/export-service");

                                    const paymentsSnap = await getDocs(collection(db, "payments"));
                                    const payments = paymentsSnap.docs.map(d => d.data());

                                    const expensesSnap = await getDocs(collection(db, "expenses"));
                                    const expenses = expensesSnap.docs.map(d => d.data());

                                    const totalCollection = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
                                    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

                                    const combinedData = [
                                        ...payments.map((p: any) => ({
                                            date: format(p.date?.toDate ? p.date.toDate() : new Date(p.date), "yyyy-MM-dd"),
                                            description: `Collection: ${p.memberName} (${p.type})`,
                                            type: 'Collection',
                                            amount: p.amount,
                                            status: 'Completed'
                                        })),
                                        ...expenses.map((e: any) => ({
                                            date: format(e.date?.toDate ? e.date.toDate() : new Date(e.date), "yyyy-MM-dd"),
                                            description: `Expense: ${e.title}`,
                                            type: 'Expense',
                                            amount: -Number(e.amount),
                                            status: 'Completed'
                                        }))
                                    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                    ExportService.exportFinancialSummaryPDF("Financial Summary", combinedData, {
                                        collection: totalCollection,
                                        expenses: totalExpenses,
                                        balance: totalCollection - totalExpenses
                                    });
                                    toast({ title: "Exported", description: "Financial Summary PDF generated." });
                                }}>
                                    <FileText className="h-6 w-6 text-blue-600" />
                                    <span className="font-medium">Financial Summary (PDF)</span>
                                </Button>

                                <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20" onClick={async () => {
                                    const { getDocs, collection } = await import("firebase/firestore");
                                    const { db } = await import("@/lib/firebase");
                                    const { ExportService } = await import("@/lib/export-service");

                                    const usersSnap = await getDocs(collection(db, "users"));
                                    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                                    const paymentsSnap = await getDocs(collection(db, "payments"));
                                    const payments = paymentsSnap.docs.map(d => {
                                        const data = d.data();
                                        return {
                                            ...data,
                                            date: data.date?.toDate ? data.date.toDate() : new Date(data.date)
                                        };
                                    });

                                    ExportService.exportMemberRecordsPDF(users, payments);
                                    toast({ title: "Exported", description: "Member Detailed Records PDF generated." });
                                }}>
                                    <FileText className="h-6 w-6 text-green-600" />
                                    <span className="font-medium">Member Records (PDF)</span>
                                </Button>

                                <Button variant="outline" className="h-24 flex flex-col items-center justify-center gap-2 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20" onClick={async () => {
                                    const { getDocs, getDoc, doc, collection } = await import("firebase/firestore");
                                    const { db } = await import("@/lib/firebase");
                                    const { ExportService } = await import("@/lib/export-service");

                                    const usersSnap = await getDocs(collection(db, "users"));
                                    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                                    const paymentsSnap = await getDocs(collection(db, "payments"));
                                    const payments = paymentsSnap.docs.map(d => d.data());

                                    const settingsSnap = await getDoc(doc(db, "system_settings", "general"));
                                    const settings = settingsSnap.exists() ? settingsSnap.data() : {};

                                    ExportService.exportCollectionMatrixExcel(users, payments, settings);
                                    toast({ title: "Exported", description: "Collection Matrix Excel generated." });
                                }}>
                                    <FileSpreadsheet className="h-6 w-6 text-purple-600" />
                                    <span className="font-medium">Collection Matrix (Excel)</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- RECYCLE BIN TAB --- */}
                <TabsContent value="recycle" className="space-y-6 mt-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold tracking-tight">Recycle Bin</h2>
                            <p className="text-muted-foreground">Recover deleted items within 7 days.</p>
                        </div>
                        {deletedItems.length > 0 && (
                            <Button variant="destructive" onClick={handleEmptyBin}>
                                <Trash className="h-4 w-4 mr-2" /> Empty Bin
                            </Button>
                        )}
                    </div>

                    <Tabs defaultValue="all" value={recycleCategory} onValueChange={setRecycleCategory} className="w-full">
                        <TabsList>
                            <TabsTrigger value="all">All Items</TabsTrigger>
                            <TabsTrigger value="payment">Payments</TabsTrigger>
                            <TabsTrigger value="user">Users</TabsTrigger>
                            <TabsTrigger value="system">System & Other</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Deleted Date</TableHead>
                                        <TableHead>Days Remaining</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recycleLoading ? (
                                        <TableRow><TableCell colSpan={5} className="text-center h-24">Loading...</TableCell></TableRow>
                                    ) : filteredItems.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No items found in this category.</TableCell></TableRow>
                                    ) : (
                                        filteredItems.map(item => {
                                            const deletedDate = item.deletedAt?.toDate ? item.deletedAt.toDate() : new Date();
                                            const daysDiff = differenceInDays(new Date(), deletedDate);
                                            const daysRemaining = 7 - daysDiff;

                                            return (
                                                <TableRow key={item.id}>
                                                    <TableCell className="capitalize">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${item.type === 'payment' ? 'bg-blue-100 text-blue-800' :
                                                            item.type === 'user' ? 'bg-purple-100 text-purple-800' :
                                                                'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {item.type}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="font-medium">{item.name}</TableCell>
                                                    <TableCell>{format(deletedDate, "MMM d, HH:mm")}</TableCell>
                                                    <TableCell>
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${daysRemaining < 2 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                                                            {daysRemaining > 0 ? `${daysRemaining} days` : "Expiring..."}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right space-x-2">
                                                        <Button variant="outline" size="sm" onClick={() => handleRestore(item)}>
                                                            <RotateCcw className="h-4 w-4 mr-2" /> Restore
                                                        </Button>
                                                        <Button variant="destructive" size="sm" onClick={() => handlePermanentDelete(item)}>
                                                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- ACTIVITY LOGS TAB --- */}
                <TabsContent value="activity" className="space-y-6 mt-6">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Activity Logs</h2>
                        <p className="text-muted-foreground">Monitor recent admin actions across the system (Last 100 entries).</p>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date & Time</TableHead>
                                        <TableHead>Admin</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Details</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logsLoading ? (
                                        <TableRow><TableCell colSpan={4} className="text-center h-24">Loading...</TableCell></TableRow>
                                    ) : activityLogs.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No activity logs recorded yet.</TableCell></TableRow>
                                    ) : (
                                        activityLogs.map(log => {
                                            const logDate = log.createdAt?.toDate ? log.createdAt.toDate() : new Date();
                                            return (
                                                <TableRow key={log.id}>
                                                    <TableCell className="whitespace-nowrap">{format(logDate, "MMM d, yyyy - HH:mm")}</TableCell>
                                                    <TableCell className="font-medium">{log.adminName}</TableCell>
                                                    <TableCell>
                                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                                                            {log.action}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">{log.details}</TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div >
    );
}
