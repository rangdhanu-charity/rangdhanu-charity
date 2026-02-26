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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { collection, query, orderBy, getDocs, onSnapshot, addDoc, updateDoc, doc, Timestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ActivityLogService } from "@/lib/activity-log-service";

export default function RequestsPage() {
    const { user, getRegistrationRequests, approveRegistrationRequest, rejectRegistrationRequest } = useAuth();
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

    // Registration Review State
    const [registrationReview, setRegistrationReview] = useState<any>(null);

    // Donation Rejection State
    const [donationRejection, setDonationRejection] = useState<{ id: string, userId: string, userName: string, amount: number } | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");

    // Track user payments to check for previously paid months
    const [userPayments, setUserPayments] = useState<any[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(false);

    const handleViewUserDetails = async (request: any) => {
        const userId = request.userId;
        if (userId === "guest") {
            const rawContact = request.userEmail || "";
            const isEmail = rawContact.includes("@");
            setViewingUser({
                name: request.userName || "Guest Donor",
                username: "guest",
                email: isEmail ? rawContact : "Not provided",
                phone: !isEmail && rawContact ? rawContact : "Not provided",
                role: "guest"
            });
            return;
        }

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

    const fetchUserPayments = async (userId: string) => {
        if (userId === "guest") {
            setUserPayments([]);
            return;
        }

        setLoadingPayments(true);
        try {
            const { getDocs, query, collection, where } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");
            const q = query(
                collection(db, "payments"),
                where("userId", "==", userId),
                where("type", "==", "monthly")
            );
            const snap = await getDocs(q);
            const payments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUserPayments(payments);
        } catch (error) {
            console.error("Error fetching user payments:", error);
        } finally {
            setLoadingPayments(false);
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
            if (user) {
                ActivityLogService.logActivity(user.id, user.name || user.username || "Admin", "Approve Registration", `Approved user registration for ${request.name}`);
            }
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
            if (user) {
                ActivityLogService.logActivity(user.id, user.name || user.username || "Admin", "Reject Registration", `Rejected user registration for request ID ${requestId}`);
            }
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

    const processDonationApproval = async (request: any, overrideAllocations: Record<number, string> | null = null) => {
        setIsSubmittingDistribution(true);
        try {
            const isMonthly = request.type === 'monthly';
            const paymentDate = request.userDate ? (request.userDate.toDate ? request.userDate : Timestamp.fromDate(new Date(request.userDate))) : Timestamp.now();
            const paymentYear = request.year ? Number(request.year) : (paymentDate.toDate ? paymentDate.toDate().getFullYear() : new Date().getFullYear());
            const fallbackMonth = paymentDate.toDate ? paymentDate.toDate().getMonth() + 1 : new Date().getMonth() + 1;

            const monthsToProcess = isMonthly && request.months?.length > 0 ? request.months : [fallbackMonth];

            let finalAllocations: Record<number, string> = {};

            if (isMonthly) {
                if (overrideAllocations) {
                    finalAllocations = overrideAllocations;
                    const totalAllocated = Object.values(finalAllocations).reduce((sum, val) => sum + (Number(val) || 0), 0);
                    if (Math.abs(totalAllocated - Number(request.amount)) > 0.1) {
                        toast({ title: "Distribution Mismatch", description: `Allocated sum (${totalAllocated}) does not match donation amount (${request.amount}).`, variant: "destructive" });
                        setIsSubmittingDistribution(false);
                        return false;
                    }
                } else {
                    // Calculate automatic default allocation
                    let userProvidedTotal = 0;
                    if (request.allocations && Object.keys(request.allocations).length > 0) {
                        monthsToProcess.forEach((m: number) => {
                            finalAllocations[m] = request.allocations[m] || "";
                            userProvidedTotal += Number(request.allocations[m]) || 0;
                        });
                    }
                    if (userProvidedTotal === 0) {
                        const amountPerMonth = (Number(request.amount) / monthsToProcess.length).toFixed(2);
                        monthsToProcess.forEach((m: number) => {
                            finalAllocations[m] = amountPerMonth;
                        });
                    }
                }
            }

            for (const m of monthsToProcess) {
                const amountToAdd = isMonthly ? Number(finalAllocations[m]) : Number(request.amount);
                const paymentMonth = Number(m);
                const paymentYearValue = Number(paymentYear);

                if (isMonthly) {
                    // For monthly: check for existing record and update or create
                    const q = query(
                        collection(db, "payments"),
                        where("userId", "==", request.userId),
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
                            updatedAt: Timestamp.now(),
                            hiddenFromProfile: false
                        });

                        // Clean up any duplicates
                        if (snap.docs.length > 1) {
                            const { deleteDoc } = await import("firebase/firestore");
                            for (let i = 1; i < snap.docs.length; i++) {
                                await deleteDoc(doc(db, "payments", snap.docs[i].id));
                            }
                        }
                    } else {
                        await addDoc(collection(db, "payments"), {
                            amount: amountToAdd,
                            date: paymentDate,
                            month: paymentMonth,
                            year: paymentYearValue,
                            memberName: request.userName,
                            type: "monthly",
                            userId: request.userId,
                            method: request.method,
                            notes: request.notes,
                            transactionId: request.transactionId || "",
                            createdAt: Timestamp.now(),
                            hiddenFromProfile: false
                        });
                    }
                } else {
                    // For one-time: always create a new payment record
                    await addDoc(collection(db, "payments"), {
                        amount: amountToAdd,
                        date: paymentDate,
                        memberName: request.userName,
                        type: "one-time",
                        userId: request.userId,
                        method: request.method,
                        notes: request.notes,
                        transactionId: request.transactionId || "",
                        createdAt: Timestamp.now(),
                        hiddenFromProfile: false
                    });
                }
            }

            // Update status
            await updateDoc(doc(db, "donation_requests", request.id), {
                status: "approved",
                approvedAt: Timestamp.now()
            });

            if (user) {
                ActivityLogService.logActivity(user.id, user.name || user.username || "Admin", "Approve Donation", `Approved ${request.type} donation of ৳${request.amount} from ${request.userName}`);
            }

            if (request.userId !== "guest") {
                await addDoc(collection(db, "notifications"), {
                    userId: request.userId,
                    title: "Donation Approved",
                    message: `Your donation of ৳${request.amount} has been verified and applied.`,
                    type: "success",
                    read: false,
                    createdAt: new Date().toISOString()
                });
            }

            toast({ title: "Approved", description: "Donation verified and distributed." });
            return true;
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to apply distribution.", variant: "destructive" });
            return false;
        } finally {
            setIsSubmittingDistribution(false);
        }
    };

    const submitDistributionOverride = async () => {
        if (!distributionRequest) return;
        const success = await processDonationApproval(distributionRequest, distributionAllocations);
        if (success) {
            setDistributionRequest(null);
            setViewingUser(null);
            setUserPayments([]);
            fetchRequests();
        }
    };

    const handleDirectApproveDonation = async (request: any) => {
        if (!confirm("Approve this donation directly without reviewing?")) return;
        const success = await processDonationApproval(request, null);
        if (success) fetchRequests();
    };

    const handleApproveDonation = async (request: any) => {
        try {
            const paymentDate = request.userDate ? (request.userDate.toDate ? request.userDate : Timestamp.fromDate(new Date(request.userDate))) : Timestamp.now();
            const paymentYear = request.year ? Number(request.year) : (paymentDate.toDate ? paymentDate.toDate().getFullYear() : new Date().getFullYear());

            if (request.type === 'monthly' && request.months && Array.isArray(request.months) && request.months.length > 0) {
                const initialAllocations: Record<number, string> = {};
                let userProvidedTotal = 0;

                if (request.allocations && Object.keys(request.allocations).length > 0) {
                    request.months.forEach((m: number) => {
                        initialAllocations[m] = request.allocations[m] || "";
                        userProvidedTotal += Number(request.allocations[m]) || 0;
                    });
                }

                if (userProvidedTotal === 0) {
                    const amountPerMonth = (Number(request.amount) / request.months.length).toFixed(2);
                    request.months.forEach((m: number) => {
                        initialAllocations[m] = amountPerMonth;
                    });
                }
                setDistributionAllocations(initialAllocations);
            } else {
                setDistributionAllocations({});
            }

            setDistributionRequest(request);
            handleViewUserDetails(request);
            fetchUserPayments(request.userId);

            return;
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to approve donation.", variant: "destructive" });
        }
    };

    const handleRejectDonation = async () => {
        if (!donationRejection) return;
        setIsSubmittingDistribution(true); // Reusing spinning state for button disabled state
        
        try {
            const { updateDoc, doc } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");
            await updateDoc(doc(db, "donation_requests", donationRejection.id), { 
                status: "rejected", 
                rejectionReason: rejectionReason.trim() || null 
            });

            if (user) {
                ActivityLogService.logActivity(user.id, user.name || user.username || "Admin", "Reject Donation", `Rejected donation request ID ${donationRejection.id} from user ID ${donationRejection.userId}`);
            }

            if (donationRejection.userId !== "guest") {
                const message = rejectionReason.trim() 
                    ? `Your donation request was rejected. Reason: ${rejectionReason.trim()}`
                    : "Your donation request was rejected. Please contact admin for details.";
                await sendNotification(
                    donationRejection.userId,
                    message,
                    "error"
                );
            }

            toast({ title: "Rejected", description: "Donation request rejected." });
            setDonationRejection(null);
            setRejectionReason("");
            fetchRequests();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to reject.", variant: "destructive" });
        } finally {
            setIsSubmittingDistribution(false);
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
                                            <Button size="sm" variant="outline" className="text-blue-600 hover:bg-blue-50" onClick={() => setRegistrationReview(req)}>
                                                Review
                                            </Button>
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
                                            <div className="font-medium">
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
                                            <Button size="sm" variant="outline" className="text-blue-600 hover:bg-blue-50" onClick={() => handleApproveDonation(req)}>
                                                Review
                                            </Button>
                                            <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50" onClick={() => handleDirectApproveDonation(req)}>
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => {
                                                setDonationRejection({ id: req.id, userId: req.userId, userName: req.userName, amount: req.amount });
                                                setRejectionReason("");
                                            }}>
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

            {/* Registration Request Review Modal */}
            <Dialog open={!!registrationReview} onOpenChange={(open: boolean) => !open && setRegistrationReview(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Review Registration Request</DialogTitle>
                        <DialogDescription>
                            Review the user's submitted details before approving their registration.
                        </DialogDescription>
                    </DialogHeader>
                    {registrationReview && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-3 gap-4 border-b pb-4">
                                <div className="font-semibold text-muted-foreground">Name</div>
                                <div className="col-span-2 font-medium">{registrationReview.name}</div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 border-b pb-4">
                                <div className="font-semibold text-muted-foreground">Username</div>
                                <div className="col-span-2">{registrationReview.username || "Not provided (will default to email prefix)"}</div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 border-b pb-4">
                                <div className="font-semibold text-muted-foreground">Email</div>
                                <div className="col-span-2">{registrationReview.email}</div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 border-b pb-4">
                                <div className="font-semibold text-muted-foreground">Phone</div>
                                <div className="col-span-2">{registrationReview.phone || "Not provided"}</div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="font-semibold text-muted-foreground">Submitted At</div>
                                <div className="col-span-2">{new Date(registrationReview.createdAt).toLocaleString()}</div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRegistrationReview(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                handleReject(registrationReview.id);
                                setRegistrationReview(null);
                            }}
                        >
                            <X className="mr-2 h-4 w-4" /> Reject
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                                handleApprove(registrationReview);
                                setRegistrationReview(null);
                            }}
                        >
                            <Check className="mr-2 h-4 w-4" /> Approve User
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Distribution Override Modal */}
            <Dialog open={!!distributionRequest} onOpenChange={(open: boolean) => {
                if (!open) {
                    setDistributionRequest(null);
                    setViewingUser(null);
                    setUserPayments([]);
                }
            }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Verify Donation Details</DialogTitle>
                        <DialogDescription>
                            Review the member's profile and verify the donation details before approving.
                        </DialogDescription>
                    </DialogHeader>
                    {distributionRequest && (
                        <div className="space-y-6 py-4">
                            {/* Membership Basic Info */}
                            {loadingUser ? (
                                <div className="flex justify-center items-center w-full h-24"><Loader2 className="h-6 w-6 animate-spin" /></div>
                            ) : viewingUser ? (
                                <div className="flex flex-col md:flex-row gap-6 p-4 bg-muted/20 border rounded-lg">
                                    <Avatar className="w-24 h-24 border-2 border-primary shrink-0 self-center md:self-start">
                                        <AvatarImage src={viewingUser.photoURL || "/default-avatar.png"} alt={viewingUser.name || "User"} />
                                        <AvatarFallback className="text-2xl"><UserIcon className="h-10 w-10 text-muted-foreground" /></AvatarFallback>
                                    </Avatar>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 w-full text-sm">
                                        <div><span className="text-muted-foreground font-semibold">Name:</span> {viewingUser.name}</div>
                                        <div><span className="text-muted-foreground font-semibold">Username:</span> {viewingUser.username}</div>
                                        <div className="md:col-span-2"><span className="text-muted-foreground font-semibold">Email:</span> {viewingUser.email}</div>
                                        <div><span className="text-muted-foreground font-semibold">Phone:</span> {viewingUser.phone || "Not provided"}</div>
                                        <div><span className="text-muted-foreground font-semibold">Role:</span> <Badge variant="outline" className="capitalize">{viewingUser.role}</Badge></div>
                                        {viewingUser.address && <div className="md:col-span-2"><span className="text-muted-foreground font-semibold">Address:</span> {viewingUser.address}</div>}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-red-500 bg-red-50 p-4 rounded border border-red-200">Failed to load user profile.</div>
                            )}

                            {/* Request Info Section */}
                            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/10 p-4 rounded border">
                                <div><span className="font-semibold text-muted-foreground">Type:</span> <Badge variant="outline">{distributionRequest.type === 'monthly' ? 'Monthly' : 'One-Time'}</Badge></div>
                                <div><span className="font-semibold text-muted-foreground">Amount:</span> <span className="font-bold text-green-600">৳{distributionRequest.amount}</span></div>
                                <div><span className="font-semibold text-muted-foreground">Method:</span> <span className="uppercase">{distributionRequest.method}</span></div>
                                <div><span className="font-semibold text-muted-foreground">TxID:</span> <code className="bg-muted px-1 py-0.5 rounded">{distributionRequest.transactionId || 'N/A'}</code></div>
                                <div className="col-span-2"><span className="font-semibold text-muted-foreground">User Date:</span> {distributionRequest.userDate?.toDate ? format(distributionRequest.userDate.toDate(), "PPP") : distributionRequest.userDate}</div>
                                <div className="col-span-2"><span className="font-semibold text-muted-foreground">Notes:</span> {distributionRequest.notes || 'No additional notes provided.'}</div>
                            </div>

                            {/* Monthly Distribution Editor */}
                            {distributionRequest.type === 'monthly' && distributionRequest.months?.length > 0 && (
                                <div className="space-y-4 pt-4 border-t">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-sm">Verify Monthly Money Distribution</h4>
                                        <Badge variant="secondary">Year: {distributionRequest.year}</Badge>
                                    </div>

                                    {/* Warnings for already paid months */}
                                    {!loadingPayments && userPayments.length > 0 && (
                                        (() => {
                                            const paidMonths = distributionRequest.months.filter((m: number) =>
                                                userPayments.some(p => p.month === m && p.year === Number(distributionRequest.year))
                                            );

                                            if (paidMonths.length > 0) {
                                                return (
                                                    <Alert variant="destructive" className="bg-yellow-50 text-yellow-900 border-yellow-200">
                                                        <AlertDescription>
                                                            <strong>Warning:</strong> The user has already made payments for: {paidMonths.map((m: number) => format(new Date(2000, m - 1, 1), 'MMM')).join(', ')}. Proceeding will add additional money to these months.
                                                        </AlertDescription>
                                                    </Alert>
                                                );
                                            }
                                            return null;
                                        })()
                                    )}

                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                        {distributionRequest.months.map((m: number) => {
                                            const isPaid = userPayments.some(p => p.month === m && p.year === Number(distributionRequest.year));
                                            return (
                                                <div key={m} className={`flex items-center gap-2 p-2 rounded border focus-within:ring-1 ${isPaid ? 'bg-yellow-100/50 border-yellow-300' : 'bg-background'}`}>
                                                    <Label className={`w-12 text-xs font-semibold ${isPaid ? 'text-yellow-800' : ''}`}>
                                                        {format(new Date(2000, m - 1, 1), 'MMM')}
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        className="h-8"
                                                        value={distributionAllocations[m] || ""}
                                                        onChange={(e) => setDistributionAllocations({
                                                            ...distributionAllocations,
                                                            [m]: e.target.value
                                                        })}
                                                    />
                                                </div>
                                            );
                                        })}
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
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setDistributionRequest(null);
                            setViewingUser(null);
                            setUserPayments([]);
                        }} disabled={isSubmittingDistribution}>Cancel</Button>
                        <Button onClick={submitDistributionOverride} disabled={isSubmittingDistribution}>
                            {isSubmittingDistribution && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Verify & Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* User Profile Modal */}
            <Dialog open={!!viewingUser && !distributionRequest} onOpenChange={(open: boolean) => !open && setViewingUser(null)}>
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
            {/* Donation Rejection Modal */}
            <Dialog open={!!donationRejection} onOpenChange={(open: boolean) => !open && setDonationRejection(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Reject Donation</DialogTitle>
                        <DialogDescription>
                            You are rejecting a donation of ৳{donationRejection?.amount} from {donationRejection?.userName}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="reason">Reason for Rejection (Optional)</Label>
                            <Input
                                id="reason"
                                placeholder="E.g., Transaction ID not found / Amount mismatch"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground">This note will be visible to the donor.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDonationRejection(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleRejectDonation} disabled={isSubmittingDistribution}>
                            {isSubmittingDistribution && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
