"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, Timestamp, onSnapshot } from "firebase/firestore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";

export default function AnnouncementsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [recipientType, setRecipientType] = useState<"all" | "specific">("all");
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [usersList, setUsersList] = useState<any[]>([]);

    const [subject, setSubject] = useState("");
    const [content, setContent] = useState("");
    const [isSending, setIsSending] = useState(false);

    const [messageHistory, setMessageHistory] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [selectedHistoryLog, setSelectedHistoryLog] = useState<any | null>(null);

    // Fetch users for dropdown
    useEffect(() => {
        const fetchUsers = async () => {
            const snap = await getDocs(collection(db, "users"));
            setUsersList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        };
        fetchUsers();
    }, []);

    // Listen to message history
    useEffect(() => {
        if (!user) return;

        const q = query(collection(db, "announcement_history"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            setMessageHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoadingHistory(false);
        });

        return () => unsub();
    }, [user]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) {
            toast({ title: "Error", description: "Message content cannot be empty.", variant: "destructive" });
            return;
        }
        if (recipientType === "specific" && selectedUserIds.length === 0) {
            toast({ title: "Error", description: "Please select at least one recipient.", variant: "destructive" });
            return;
        }

        setIsSending(true);
        try {
            const targetUsers = recipientType === "all" ? usersList : usersList.filter(u => selectedUserIds.includes(u.id));
            const senderName = user?.name || "Admin";

            // 1. Create message doc for each user
            const promises = targetUsers.map(targetUser => {
                return addDoc(collection(db, "messages"), {
                    userId: targetUser.id,
                    senderId: user?.id || "system",
                    senderName,
                    subject: subject.trim(),
                    content: content.trim(),
                    read: false,
                    createdAt: Timestamp.now()
                });
            });

            await Promise.all(promises);

            let recipientNameLabel = "All Members";
            if (recipientType === "specific") {
                recipientNameLabel = targetUsers.length === 1 ? targetUsers[0].name : `${targetUsers.length} Members`;
            }

            // 2. Log in announcement_history
            await addDoc(collection(db, "announcement_history"), {
                senderId: user?.id,
                senderName,
                subject: subject.trim(),
                content: content.trim(),
                recipientType,
                recipientName: recipientNameLabel,
                createdAt: Timestamp.now(),
                deliveryCount: targetUsers.length
            });

            toast({ title: "Sent!", description: `Message sent to ${targetUsers.length} member(s).` });
            setSubject("");
            setContent("");
            setSelectedUserIds([]);
        } catch (error: any) {
            console.error("Failed to send message:", error);
            toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteHistory = async (id: string) => {
        if (!confirm("Delete this log? (This won't delete the messages already in users' inboxes)")) return;
        const { deleteDoc, doc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "announcement_history", id));
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Announcements & Messaging</h1>
                <p className="text-muted-foreground">Send direct messages or broadcast announcements to all members.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Compose Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Compose Message</CardTitle>
                        <CardDescription>Messages will appear in the users&apos; profile inbox.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSendMessage} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Recipient Type</Label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="radio"
                                            checked={recipientType === "all"}
                                            onChange={() => setRecipientType("all")}
                                            className="accent-primary"
                                        />
                                        All Members ({usersList.length})
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="radio"
                                            checked={recipientType === "specific"}
                                            onChange={() => setRecipientType("specific")}
                                            className="accent-primary"
                                        />
                                        Specific Member
                                    </label>
                                </div>
                            </div>

                            {recipientType === "specific" && (
                                <div className="space-y-2">
                                    <Label>Select Members</Label>
                                    <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto p-4 border rounded-md bg-background">
                                        {usersList.map(u => (
                                            <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="accent-primary w-4 h-4"
                                                    checked={selectedUserIds.includes(u.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedUserIds(prev => [...prev, u.id]);
                                                        } else {
                                                            setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                                                        }
                                                    }}
                                                />
                                                {u.name} <span className="text-muted-foreground">({u.email})</span>
                                            </label>
                                        ))}
                                        {usersList.length === 0 && <span className="text-muted-foreground text-sm">No members found.</span>}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="subject">Subject (Optional)</Label>
                                <Input
                                    id="subject"
                                    placeholder="e.g. Important Update for 2024"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="content">Message Content (Markdown supported)</Label>
                                <Textarea
                                    id="content"
                                    placeholder="Write your message here..."
                                    className="min-h-[150px]"
                                    required
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">You can use basic markdown like **bold**, *italics*, lists, and raw URLs (https://...).</p>
                            </div>

                            <Button type="submit" disabled={isSending || usersList.length === 0} className="w-full">
                                {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Message
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* History Log */}
                <Card>
                    <CardHeader>
                        <CardTitle>Sent History</CardTitle>
                        <CardDescription>Log of past announcements and messages.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingHistory ? (
                            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                        ) : messageHistory.length === 0 ? (
                            <div className="text-center p-8 text-muted-foreground">No messages sent yet.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Recipient</TableHead>
                                            <TableHead>Subject / Content</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {messageHistory.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="text-xs whitespace-nowrap">
                                                    {log.createdAt?.toDate ? format(log.createdAt.toDate(), "MMM d, yy") : "N/A"}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {log.recipientType === 'all' ? (
                                                        <span className="font-semibold text-primary">All Members</span>
                                                    ) : (
                                                        <span>{log.recipientName}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell
                                                    className="text-xs max-w-[200px] truncate cursor-pointer hover:bg-muted/50"
                                                    onClick={() => setSelectedHistoryLog(log)}
                                                >
                                                    <div className="font-medium truncate">{log.subject || "No Subject"}</div>
                                                    <div className="text-muted-foreground truncate" title="Click to view full message">{log.content}</div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteHistory(log.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={!!selectedHistoryLog} onOpenChange={(open) => !open && setSelectedHistoryLog(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{selectedHistoryLog?.subject || "No Subject"}</DialogTitle>
                        <DialogDescription>
                            Sent by {selectedHistoryLog?.senderName} to {selectedHistoryLog?.recipientName} on {selectedHistoryLog?.createdAt?.toDate ? format(selectedHistoryLog.createdAt.toDate(), "PPP 'at' p") : "Unknown date"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 text-sm whitespace-pre-wrap max-h-[60vh] overflow-y-auto w-full break-words">
                        {selectedHistoryLog?.content}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
