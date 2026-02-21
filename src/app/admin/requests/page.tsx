"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/notification-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { collection, query, orderBy, getDocs, onSnapshot, addDoc, updateDoc, doc, Timestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function RequestsPage() {
    const { getRegistrationRequests, approveRegistrationRequest, rejectRegistrationRequest } = useAuth();
    const { sendNotification } = useNotifications();
    const [requests, setRequests] = useState<any[]>([]);
    const [donationRequests, setDonationRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [approvedCreds, setApprovedCreds] = useState<{ username: string, password: string } | null>(null);

    // User Verification State
    const [viewingUser, setViewingUser] = useState<any>(null);
    const [loadingUser, setLoadingUser] = useState(false);

    // Donation Distribution State
    const [distributionRequest, setDistributionRequest] = useState<any>(null);
    const [distributionAllocations, setDistributionAllocations] = useState<Record<number, string>>({});
    const [isSubmittingDistribution, setIsSubmittingDistribution] = useState(false);

    const handleViewUserDetails = async (userId: string) => {
        setLoadingUser(true);
        try {
            const { getDoc, doc } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");
            const snap = await getDoc(doc(db, "users", userId));
            if (snap.exists()) {
                setViewingUser({ id: snap.id, ...snap.data() });
            } else {
                toast({ title: "Not Found", description: "User profile could not be found.", variant: "destructive" });
            }
        } catch (error) {
            console.error("Error fetching user details:", error);
            toast({ title: "Error", description: "Failed to fetch user details.", variant: "destructive" });
        } finally {
            setLoadingUser(false);
        }
    };

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const [regData, donationData] = await Promise.all([
                getRegistrationRequests(),
                (async () => {
                    try {
                        const { getDocs, collection, query, where, orderBy } = await import("firebase/firestore");
                        const { db } = await import("@/lib/firebase");
                        const q = query(collection(db, "donation_requests"), where("status", "==", "pending"));
                        const snap = await getDocs(q);
                        return snap.docs
                            .map(d => ({ id: d.id, ...d.data() }))
                            .sort((a: any, b: any) => {
                                const timeA = a.createdAt?.seconds || 0;
                                const timeB = b.createdAt?.seconds || 0;
                                return timeB - timeA;
                            });
                    } catch (e) {
                        console.error("Donation fetch error (likely missing index):", e);
                        return [];
                    }
                })()
            ]);
            setRequests(regData.sort((a: any, b: any) => {
                const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return timeB - timeA;
            }));
            setDonationRequests(donationData);
        } catch (error) {
            console.error("Failed to fetch requests", error);
            // toast({ title: "Error", description: "Failed to load requests.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (request: any) => {
        // Generate random password
        const tempPassword = Math.random().toString(36).slice(-8);
        const username = request.username || request.email.split("@")[0]; // Use requested username or fallback

        const result = await approveRegistrationRequest(request.id, {
            name: request.name,
            email: request.email,
            username: username,
            password: tempPassword,
            phone: request.phone,
            role: "user"
        });

        if (result.success) {
            toast({
                title: "Request Approved",
                description: `User ${request.name} has been approved.`,
            });
            setApprovedCreds({ username, password: tempPassword });
            // fetchRequests(); // onSnapshot will handle this
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to approve request",
                variant: "destructive"
            });
        }
    };

    const handleReject = async (requestId: string) => {
        if (!confirm("Are you sure you want to reject this request?")) return;

        const result = await rejectRegistrationRequest(requestId);
        if (result.success) {
            toast({
                title: "Request Rejected",
                description: "The registration request has been rejected.",
            });
            // fetchRequests(); // onSnapshot will handle this
        } else {
            toast({
                title: "Error",
                description: result.error || "Failed to reject request",
                variant: "destructive"
            });
        }
    };

    const submitDistributionOverride = async () => {
        if (!distributionRequest) return;
        setIsSubmittingDistribution(true);
        try {
            // Verify total equals the original amount
            const totalAllocated = Object.values(distributionAllocations).reduce((sum, val) => sum + (Number(val) || 0), 0);
            if (Math.abs(totalAllocated - Number(distributionRequest.amount)) > 0.1) {
                toast({ title: "Distribution Mismatch", description: `Allocated sum (${totalAllocated}) does not match donation amount (${distributionRequest.amount}).`, variant: "destructive" });
                setIsSubmittingDistribution(false);
                return;
            }

            const paymentDate = distributionRequest.userDate ? (distributionRequest.userDate.toDate ? distributionRequest.userDate : Timestamp.fromDate(new Date(distributionRequest.userDate))) : Timestamp.now();
            const paymentYear = distributionRequest.year ? Number(distributionRequest.year) : (paymentDate.toDate ? paymentDate.toDate().getFullYear() : new Date().getFullYear());

            for (const m of distributionRequest.months) {
                const amountToAdd = Number(distributionAllocations[m]);
                const paymentMonth = Number(m);
                const paymentYearValue = Number(paymentYear);

                const q = query(
                    collection(db, "payments"),
                    where("userId", "==", distributionRequest.userId),
                    where("type", "==", "monthly"),
                    where("month", "==", paymentMonth),
                    where("year", "==", paymentYearValue)
                );

                const snap = await getDocs(q);

                if (!snap.empty) {
                    const existingDoc = snap.docs[0];
                    const existingAmount = Number(existingDoc.data().amount) || 0;
                    await updateDoc(doc(db, "payments", existingDoc.id), {
                        amount: existingAmount + amountToAdd,
                        updatedAt: Timestamp.now()
                    });
                } else {
                    await addDoc(collection(db, "payments"), {
                        amount: amountToAdd,
                        date: paymentDate,
                        month: paymentMonth,
                        year: paymentYearValue,
                        memberName: distributionRequest.userName,
                        type: 'monthly',
                        userId: distributionRequest.userId,
                        method: distributionRequest.method,
                        notes: distributionRequest.notes,
                        transactionId: distributionRequest.transactionId || "",
                        createdAt: Timestamp.now()
                    });
                }
            }

            // Update status
            await updateDoc(doc(db, "donation_requests", distributionRequest.id), {
                status: "approved",
                approvedAt: Timestamp.now()
            });

            await addDoc(collection(db, "notifications"), {
                userId: distributionRequest.userId,
                title: "Donation Approved",
                message: `Your donation of ৳${distributionRequest.amount} has been verified and applied.`,
                type: "success",
                read: false,
                createdAt: new Date().toISOString()
            });

            toast({ title: "Approved", description: "Donation verified and distributed." });
            setDistributionRequest(null);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to apply distribution.", variant: "destructive" });
        } finally {
            setIsSubmittingDistribution(false);
        }
    };

    const handleApproveDonation = async (request: any) => {
        try {
            const paymentDate = request.userDate ? (request.userDate.toDate ? request.userDate : Timestamp.fromDate(new Date(request.userDate))) : Timestamp.now();
            const paymentYear = request.year ? Number(request.year) : (paymentDate.toDate ? paymentDate.toDate().getFullYear() : new Date().getFullYear());

            if (request.type === 'monthly' && request.months && Array.isArray(request.months) && request.months.length > 0) {
                // ALWAYS open modal for admin distribution to verify/edit
                const initialAllocations: Record<number, string> = {};
                let userProvidedTotal = 0;

                if (request.allocations && Object.keys(request.allocations).length > 0) {
                    request.months.forEach((m: number) => {
                        initialAllocations[m] = request.allocations[m] || "";
                        userProvidedTotal += Number(request.allocations[m]) || 0;
                    });
                }

                // If user didn't provide complete allocations, calculate defaults
                if (userProvidedTotal === 0) {
                    const amountPerMonth = (Number(request.amount) / request.months.length).toFixed(2);
                    request.months.forEach((m: number) => {
                        initialAllocations[m] = amountPerMonth;
                    });
                }

                setDistributionAllocations(initialAllocations);
                setDistributionRequest(request);
                return; // Stop here, modal will handle the rest
            } else {
                // Single month or One-time logic
                const paymentMonth = request.month ? Number(request.month) : (paymentDate.toDate ? paymentDate.toDate().getMonth() + 1 : new Date().getMonth() + 1);
                const amountToAdd = Number(request.amount);
                const isMonthly = request.type === 'monthly';

                if (isMonthly) {
                    const q = query(
                        collection(db, "payments"),
                        where("userId", "==", request.userId),
                        where("type", "==", "monthly"),
                        where("month", "==", paymentMonth),
                        where("year", "==", paymentYear)
                    );
                    const snap = await getDocs(q);

                    if (!snap.empty) {
                        const existingDoc = snap.docs[0];
                        const existingAmount = Number(existingDoc.data().amount) || 0;
                        await updateDoc(doc(db, "payments", existingDoc.id), {
                            amount: existingAmount + amountToAdd,
                            updatedAt: Timestamp.now()
                        });
                    } else {
                        await addDoc(collection(db, "payments"), {
                            amount: amountToAdd,
                            date: paymentDate,
                            month: paymentMonth,
                            year: paymentYear,
                            memberName: request.userName,
                            type: 'monthly',
                            userId: request.userId,
                            method: request.method,
                            notes: request.notes,
                            transactionId: request.transactionId || "",
                            createdAt: Timestamp.now()
                        });
                    }
                } else {
                    await addDoc(collection(db, "payments"), {
                        amount: amountToAdd,
                        date: paymentDate,
                        month: paymentMonth,
                        year: paymentYear,
                        memberName: request.userName,
                        type: 'one-time',
                        userId: request.userId,
                        method: request.method,
                        notes: request.notes,
                        transactionId: request.transactionId || "",
                        createdAt: Timestamp.now()
                    });
                }

                // Update request status
                await updateDoc(doc(db, "donation_requests", request.id), {
                    status: "approved",
                    approvedAt: Timestamp.now()
                });

                // Notify User
                await addDoc(collection(db, "notifications"), {
                    userId: request.userId,
                    title: "Donation Approved",
                    message: `Your donation of ৳${request.amount} has been verified.`,
                    type: "success",
                    read: false,
                    createdAt: new Date().toISOString()
                });

                toast({ title: "Approved", description: "Donation verified and recorded." });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to approve donation.", variant: "destructive" });
        }
    };

    const handleRejectDonation = async (requestId: string, userId: string) => {
        if (!confirm("Reject this donation request?")) return;
        try {
            const { updateDoc, doc } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");
            await updateDoc(doc(db, "donation_requests", requestId), { status: "rejected" });

            await sendNotification(
                userId,
                "Your donation request was rejected. Please contact admin for details.",
                "error"
            );

            toast({ title: "Rejected", description: "Donation request rejected." });
            fetchRequests();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to reject.", variant: "destructive" });
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Requests Management</h1>
                <Button onClick={fetchRequests} variant="outline" size="sm">
                    Refresh
                </Button>
            </div>

            {/* Unified Requests Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Pending Requests</CardTitle>
                    <CardDescription>All registration and donation requests needing approval.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : requests.length === 0 && donationRequests.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">No pending requests.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>User / Details</TableHead>
                                    <TableHead>Amount / Info</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* Registration Requests */}
                                {requests.map((req) => (
                                    <TableRow key={req.id}>
                                        <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell><Badge variant="outline">Registration</Badge></TableCell>
                                        <TableCell>
                                            <div className="font-medium">{req.name}</div>
                                            <div className="text-xs text-muted-foreground">{req.email}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">{req.phone || "No phone"}</div>
                                        </TableCell>
                                        <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50" onClick={() => handleApprove(req)}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleReject(req.id)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {/* Donation Requests */}
                                {donationRequests.map((req) => (
                                    <TableRow key={req.id}>
                                        <TableCell>
                                            {req.createdAt?.toDate ? format(req.createdAt.toDate(), "MMM d") : "-"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={req.type === 'monthly' ? "default" : "secondary"}>
                                                {req.type === 'monthly' ? 'Monthly' : 'One-time Donation'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div
                                                className="font-medium text-blue-600 hover:underline cursor-pointer"
                                                onClick={() => handleViewUserDetails(req.userId)}
                                            >
                                                {req.userName}
                                            </div>
                                            <div className="text-xs text-muted-foreground capitalize">{req.method} • {req.transactionId}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-bold text-green-600">৳{req.amount}</div>
                                            {req.type === 'monthly' && (
                                                <div className="text-xs text-muted-foreground">
                                                    {req.months && req.months.length > 0
                                                        ? `Months: ${req.months.join(', ')} / ${req.year}`
                                                        : req.month ? `For: ${req.month}/${req.year}` : ''}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell><Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge></TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50" onClick={() => handleApproveDonation(req)}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleRejectDonation(req.id, req.userId)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>



            <Dialog open={!!approvedCreds} onOpenChange={(open: boolean) => !open && setApprovedCreds(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>User Approved Successfully</DialogTitle>
                        <DialogDescription>
                            Please share these temporary credentials with the user.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <span className="font-bold text-right">Username:</span>
                            <code className="col-span-3 bg-muted p-2 rounded">{approvedCreds?.username}</code>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <span className="font-bold text-right">Password:</span>
                            <code className="col-span-3 bg-muted p-2 rounded">{approvedCreds?.password}</code>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setApprovedCreds(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Distribution Override Modal */}
            <Dialog open={!!distributionRequest} onOpenChange={(open: boolean) => !open && setDistributionRequest(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Verify Donation Distribution</DialogTitle>
                        <DialogDescription>
                            Review or edit how the total ৳{distributionRequest?.amount} should be distributed across the requested months.
                        </DialogDescription>
                    </DialogHeader>
                    {distributionRequest && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                {distributionRequest.months.map((m: number) => (
                                    <div key={m} className="flex items-center gap-2">
                                        <Label className="w-16">{format(new Date(2000, m - 1, 1), 'MMM')}</Label>
                                        <Input
                                            type="number"
                                            value={distributionAllocations[m] || ""}
                                            onChange={(e) => setDistributionAllocations({
                                                ...distributionAllocations,
                                                [m]: e.target.value
                                            })}
                                        />
                                    </div>
                                ))}
                            </div>
                            {Math.abs(Object.values(distributionAllocations).reduce((a, b) => a + (Number(b) || 0), 0) - Number(distributionRequest.amount)) > 0.1 && (
                                <Alert variant="destructive">
                                    <AlertDescription>
                                        Total allocated (৳{Object.values(distributionAllocations).reduce((a, b) => a + (Number(b) || 0), 0)}) must strictly equal the donation amount (৳{distributionRequest.amount}).
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDistributionRequest(null)} disabled={isSubmittingDistribution}>Cancel</Button>
                        <Button onClick={submitDistributionOverride} disabled={isSubmittingDistribution}>
                            {isSubmittingDistribution && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Verify & Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* User Profile Modal */}
            <Dialog open={!!viewingUser} onOpenChange={(open: boolean) => !open && setViewingUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Member Verification Details</DialogTitle>
                    </DialogHeader>
                    {loadingUser ? (
                        <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
                    ) : viewingUser && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-3 gap-4 border-b pb-4">
                                <div className="font-semibold text-muted-foreground">Name</div>
                                <div className="col-span-2 font-medium">{viewingUser.name}</div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 border-b pb-4">
                                <div className="font-semibold text-muted-foreground">Username</div>
                                <div className="col-span-2">{viewingUser.username}</div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 border-b pb-4">
                                <div className="font-semibold text-muted-foreground">Email</div>
                                <div className="col-span-2">{viewingUser.email}</div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 border-b pb-4">
                                <div className="font-semibold text-muted-foreground">Phone</div>
                                <div className="col-span-2">{viewingUser.phone || "Not provided"}</div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 border-b pb-4">
                                <div className="font-semibold text-muted-foreground">Address</div>
                                <div className="col-span-2">{viewingUser.address || "Not provided"}</div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="font-semibold text-muted-foreground">Role</div>
                                <div className="col-span-2 capitalize"><Badge variant={viewingUser.role === 'admin' ? "destructive" : "default"}>{viewingUser.role}</Badge></div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setViewingUser(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
