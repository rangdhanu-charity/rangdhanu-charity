"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs, where, orderBy, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RecycleService, RecycleItem } from "@/lib/recycle-service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, RotateCcw, AlertTriangle, Trash } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function RecycleBinPage() {
    const [deletedItems, setDeletedItems] = useState<RecycleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        setLoading(true);
        // Initial cleanup check
        RecycleService.cleanupOldItems().catch(console.error);

        const q = query(collection(db, "recycle_bin"), orderBy("deletedAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RecycleItem[];
            setDeletedItems(items);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching recycle bin:", error);
            toast({ title: "Error", description: "Failed to load recycle bin.", variant: "destructive" });
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleRestore = async (item: RecycleItem) => {
        if (!confirm(`Restore ${item.name}?`)) return;
        try {
            await RecycleService.restore(item.id);
            setDeletedItems(prev => prev.filter(i => i.id !== item.id));
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
            setDeletedItems(prev => prev.filter(i => i.id !== item.id));
            toast({ title: "Deleted", description: `${item.name} permanently removed.` });
        } catch (error) {
            console.error("Delete failed:", error);
            toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" });
        }
    };

    const handleEmptyBin = async () => {
        if (!confirm("Are you sure you want to empty the recycle bin? All items will be permanently lost.")) return;
        try {
            // Loop delete for client side simplicity, or batch if many
            // For now, simple loop
            const promises = deletedItems.map(item => RecycleService.permanentDelete(item.id));
            await Promise.all(promises);
            setDeletedItems([]);
            toast({ title: "Bin Emptied", description: "Recycle bin is now empty." });
        } catch (error) {
            console.error("Empty bin failed:", error);
            toast({ title: "Error", description: "Failed to empty bin.", variant: "destructive" });
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Recycle Bin</h1>
                    <p className="text-muted-foreground">Recover deleted items within 7 days.</p>
                </div>
                {deletedItems.length > 0 && (
                    <Button variant="destructive" onClick={handleEmptyBin}>
                        <Trash className="h-4 w-4 mr-2" /> Empty Bin
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Deleted Items</CardTitle>
                    <CardDescription>Items are automatically removed after 7 days.</CardDescription>
                </CardHeader>
                <CardContent>
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
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">Loading...</TableCell></TableRow>
                            ) : deletedItems.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Recycle bin is empty.</TableCell></TableRow>
                            ) : (
                                deletedItems.map(item => {
                                    const deletedDate = item.deletedAt?.toDate ? item.deletedAt.toDate() : new Date();
                                    const daysDiff = differenceInDays(new Date(), deletedDate);
                                    const daysRemaining = 7 - daysDiff;

                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="capitalize">{item.type}</TableCell>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>{format(deletedDate, "MMM d, yyyy HH:mm")}</TableCell>
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
        </div>
    );
}
