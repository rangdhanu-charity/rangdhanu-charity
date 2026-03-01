"use client";

import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, setDoc, onSnapshot, query, updateDoc, where, getDocs, addDoc, Timestamp, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Search, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Calendar as CalendarIcon, Camera, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { RecycleService } from "@/lib/recycle-service";
import { ActivityLogService } from "@/lib/activity-log-service";
import { useSettings, SettingsProvider } from "@/lib/settings-context";
import { useFinance, FinanceProvider } from "@/lib/finance-context";
import { TopContributorBadge } from "@/components/ui/top-contributor-badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ImageCropper } from "@/components/image-cropper";
import { useRef } from "react";

interface User {
    id: string;
    name: string;
    email: string;
    username: string;
    roles: string[];
    phone?: string;
    password?: string; // Optional for display
    createdAt?: any;
    photoURL?: string;
}

export default function UsersPage() {
    return (
        <SettingsProvider>
            <FinanceProvider>
                <UsersContent />
            </FinanceProvider>
        </SettingsProvider>
    );
}

function UsersContent() {
    const [users, setUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const { user: currentUser, adminUpdateUser } = useAuth();
    const { settings } = useSettings();

    // Filter states
    const [roleFilter, setRoleFilter] = useState("all");

    // Deletion Modal States
    const [deleteModalUser, setDeleteModalUser] = useState<User | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const { topContributors } = useFinance();
    const { toast } = useToast();

    // Password Visibility State
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

    // Sort State
    type UserSortKey = "name" | "username" | "role" | "createdAt";
    const [sortKey, setSortKey] = useState<UserSortKey>("createdAt");
    const [sortAsc, setSortAsc] = useState(false);

    const handleSort = (key: UserSortKey) => {
        if (key === sortKey) setSortAsc(prev => !prev);
        else { setSortKey(key); setSortAsc(false); }
    };

    const SortIcon = ({ col }: { col: UserSortKey }) => {
        if (col !== sortKey) return <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground inline" />;
        return sortAsc
            ? <ArrowUp className="ml-1 h-3 w-3 text-primary inline" />
            : <ArrowDown className="ml-1 h-3 w-3 text-primary inline" />;
    };

    // Edit Dialog State
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState<Partial<User>>({});
    const [isSaving, setIsSaving] = useState(false);

    // New User State
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [newUserForm, setNewUserForm] = useState({
        name: "",
        email: "",
        username: "",
        phone: "",
        role: "member",
        password: "password123"
    });

    // View Profile State
    const [viewingUser, setViewingUser] = useState<User | null>(null);
    const [isProfileEditMode, setIsProfileEditMode] = useState(false);
    const [profileEditForm, setProfileEditForm] = useState<Partial<User>>({});
    const [userPayments, setUserPayments] = useState<any[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(false);

    // Image Upload & Crop State
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string>("");
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Calendar Matrix States
    const currentYear = new Date().getFullYear();
    const availableYears = settings?.collectionYears || [currentYear];
    const [selectedCalendarYear, setSelectedCalendarYear] = useState<number>(currentYear);

    // Auto-select latest year when settings load
    useEffect(() => {
        if (settings?.collectionYears && settings.collectionYears.length > 0) {
            setSelectedCalendarYear(Math.max(...settings.collectionYears));
        }
    }, [settings]);

    useEffect(() => {
        const q = query(collection(db, "users"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as User[];

            data.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return dateB.getTime() - dateA.getTime();
            });

            setUsers(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleDeleteClick = (user: User) => {
        setDeleteModalUser(user);
    };

    const handleConfirmDelete = async (type: 'preserve' | 'purge') => {
        if (!deleteModalUser) return;
        setIsDeleting(true);
        const { id, name } = deleteModalUser;

        try {
            const paymentsRef = collection(db, "payments");
            const q = query(paymentsRef, where("userId", "==", id));
            const snapshot = await getDocs(q);

            const batchId = `user-del-${id}-${Date.now()}`;

            let totalAmount = 0;
            const paymentsToSoftDelete = snapshot.docs.map(doc => {
                totalAmount += Number(doc.data().amount || 0);
                return { id: doc.id, data: doc.data() };
            });

            // If Preserve, create the consolidated One-Time Donation
            if (type === 'preserve' && totalAmount > 0) {
                // To keep the dashboard accurate chronologically without jumping to today, 
                // try to backdate the creation time to the oldest payment or the user's join date.
                const earliestDate = paymentsToSoftDelete.length > 0
                    ? new Date(Math.min(...paymentsToSoftDelete.map(p => new Date(p.data.createdAt || p.data.date || new Date()).getTime())))
                    : (deleteModalUser.createdAt?.toDate ? deleteModalUser.createdAt.toDate() : new Date(deleteModalUser.createdAt || new Date()));

                const newDocRef = doc(collection(db, "payments"));
                await setDoc(newDocRef, {
                    userId: "deleted-user",
                    memberName: `Deleted Member: ${name}`,
                    email: deleteModalUser.email,
                    phone: deleteModalUser.phone || "",
                    amount: totalAmount,
                    date: earliestDate.toISOString(),
                    type: "one-time",
                    verified: true,
                    month: earliestDate.getMonth() + 1,
                    year: earliestDate.getFullYear(),
                    receiptRef: "",
                    note: "Consolidated funds from a deleted user. Restoring the user will revert this.",
                    recordedBy: currentUser?.name || currentUser?.username || "Admin",
                    recordedAt: new Date().toISOString(),
                    createdAt: earliestDate, // Critical: Backdate the raw timestamp so it sinks in the UI
                    linkedBatchId: batchId // CRITICAL: Tag to allow undoing this action if restored
                });
            }

            // Move all old payments to Recycle Bin (whether preserving or purging, we want them stored)
            for (const payment of paymentsToSoftDelete) {
                await RecycleService.softDelete("payments", payment.id, "payment", `Payment (৳${payment.data.amount}) by ${name}`, currentUser?.username || "admin", { batchId });
            }

            // Soft delete the user profile so they can't log in
            await RecycleService.softDelete("users", id, "user", name, currentUser?.username || "admin", { batchId });

            if (type === 'preserve') {
                toast({ title: "User Deleted & Funds Preserved", description: `Contributions (৳${totalAmount}) consolidated.` });
            } else {
                toast({ title: "User & Funds Erased", description: `Profile and financial records purged.` });
            }

            setDeleteModalUser(null);
        } catch (error) {
            console.error("Error deleting user:", error);
            toast({ title: "Error", description: "Failed to process.", variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };

    const togglePassword = (userId: string) => {
        setVisiblePasswords(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
    };

    const handleEditClick = (user: User) => {
        setEditingUser(user);
        setEditForm({ ...user });
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        setIsSaving(true);

        // Prepare data for update
        const { id, ...data } = editForm as any; // Cast to avoid strict type issues with Partial
        const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));

        const res = await adminUpdateUser(editingUser.id, cleanData);

        if (res.success) {
            await addDoc(collection(db, "notifications"), {
                userId: editingUser.id,
                title: "Profile Updated",
                message: "An administrator has updated your profile information.",
                type: "info",
                read: false,
                createdAt: Timestamp.now()
            });

            toast({ title: "User Updated", description: "User information saved successfully." });
            setEditingUser(null);
        } else {
            toast({ title: "Error", description: res.error || "Failed to update user.", variant: "destructive" });
        }
        setIsSaving(false);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAddingUser(true);

        try {
            const usersRef = collection(db, "users");
            const qEmail = query(usersRef, where("email", "==", newUserForm.email));
            const qUsername = query(usersRef, where("username", "==", newUserForm.username));

            const [emailSnap, usernameSnap] = await Promise.all([
                getDocs(qEmail),
                getDocs(qUsername)
            ]);

            if (!emailSnap.empty) {
                toast({ title: "Error", description: "User with this email already exists.", variant: "destructive" });
                setIsAddingUser(false);
                return;
            }

            if (!usernameSnap.empty) {
                toast({ title: "Error", description: "Username already taken.", variant: "destructive" });
                setIsAddingUser(false);
                return;
            }

            await addDoc(usersRef, {
                ...newUserForm,
                roles: [newUserForm.role],
                createdAt: new Date().toISOString(),
                photoURL: ""
            });

            toast({ title: "Success", description: "User created successfully." });
            setIsAddUserOpen(false);
            setNewUserForm({
                name: "",
                email: "",
                username: "",
                phone: "",
                role: "member",
                password: "password123"
            });
        } catch (error) {
            console.error("Error creating user:", error);
            toast({ title: "Error", description: "Failed to create user.", variant: "destructive" });
        } finally {
            setIsAddingUser(false);
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
        if (!viewingUser) return;
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
                const res = await adminUpdateUser(viewingUser.id, { photoURL: downloadURL });

                if (res.success) {
                    toast({ title: "Profile Picture Updated", description: "User's picture has been saved successfully in low-resolution." });
                    setViewingUser({ ...viewingUser, photoURL: downloadURL });
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
        if (!viewingUser) return;
        if (!confirm(`Are you sure you want to remove ${viewingUser.name}'s profile picture?`)) return;
        setIsUploadingImage(true);
        try {
            const res = await adminUpdateUser(viewingUser.id, { photoURL: "" });
            if (res.success) {
                toast({ title: "Success", description: "Profile picture removed successfully." });
                setViewingUser({ ...viewingUser, photoURL: "" });
            } else {
                toast({ title: "Error", description: res.error || "Failed to remove picture.", variant: "destructive" });
            }
        } finally {
            setIsUploadingImage(false);
        }
    };

    const handleViewProfile = async (user: User) => {
        setViewingUser(user);
        setLoadingPayments(true);
        setUserPayments([]);

        try {
            const q = query(collection(db, "payments"), where("userId", "==", user.id));
            const snap = await getDocs(q);
            const payments = snap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
            payments.sort((a, b) => {
                const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
                const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
                return dateB.getTime() - dateA.getTime();
            });
            setUserPayments(payments);
        } catch (error) {
            console.error("Error fetching user payments:", error);
            toast({ title: "Error", description: "Failed to fetch financial history.", variant: "destructive" });
        } finally {
            setLoadingPayments(false);
        }
    };

    // Calendar logic helpers
    const activeMonthsNum = settings?.collectionMonths?.[selectedCalendarYear] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const allMonths = [
        { value: 1, label: "Jan" }, { value: 2, label: "Feb" }, { value: 3, label: "Mar" },
        { value: 4, label: "Apr" }, { value: 5, label: "May" }, { value: 6, label: "Jun" },
        { value: 7, label: "Jul" }, { value: 8, label: "Aug" }, { value: 9, label: "Sep" },
        { value: 10, label: "Oct" }, { value: 11, label: "Nov" }, { value: 12, label: "Dec" }
    ];
    const activeMonths = allMonths.filter(m => activeMonthsNum.includes(m.value));

    const getMonthlyStatus = (month: number, year: number) => {
        const payment = userPayments.find((p: any) => p.type === "monthly" && p.month === month && p.year === year);
        const currentDate = new Date();
        const currentYearNum = currentDate.getFullYear();
        const currentMonthNum = currentDate.getMonth() + 1;
        const currentDayNum = currentDate.getDate();

        if (payment) return { status: 'paid', payment };

        if (year > currentYearNum || (year === currentYearNum && month > currentMonthNum)) {
            return { status: 'future' };
        }

        if (year === currentYearNum && month === currentMonthNum) {
            return currentDayNum <= 10 ? { status: 'due-yellow' } : { status: 'due-red' };
        }

        return { status: 'due-red' };
    };

    const handleProfileEditSave = async () => {
        if (!viewingUser) return;
        setIsLoading(true);
        try {
            await adminUpdateUser(viewingUser.id, profileEditForm);

            // Log the activity
            await ActivityLogService.logActivity(
                currentUser?.id || 'unknown',
                currentUser?.username || 'admin',
                'update_user',
                `Updated profile details for user ${viewingUser.username}`
            );

            toast({ title: "User Updated", description: "Profile details saved successfully." });

            // Update the local viewingUser object so UI reflects instantly without needing another full snapshot round
            setViewingUser({ ...viewingUser, ...profileEditForm } as User);
            setIsProfileEditMode(false);

            // Also update the main users list locally to be safe
            setUsers(users.map(u => u.id === viewingUser.id ? { ...u, ...profileEditForm } as User : u));
        } catch (error: any) {
            console.error("Error updating user profile:", error);
            toast({
                title: "Update Failed",
                description: error.message || "Failed to update profile.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.phone && user.phone.includes(searchQuery))
    ).sort((a, b) => {
        let valA: any;
        let valB: any;
        if (sortKey === "createdAt") {
            valA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
            valB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        } else if (sortKey === "role") {
            valA = (a.roles?.[0] || "").toLowerCase();
            valB = (b.roles?.[0] || "").toLowerCase();
        } else {
            valA = (a[sortKey] || "").toLowerCase();
            valB = (b[sortKey] || "").toLowerCase();
        }
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
    });

    const handleRoleToggle = (role: string) => {
        if (!editForm.roles) editForm.roles = [];
        const newRoles = editForm.roles.includes(role)
            ? editForm.roles.filter(r => r !== role)
            : [...editForm.roles, role];
        setEditForm({ ...editForm, roles: newRoles });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Members</h1>
                    <p className="text-muted-foreground">Manage organization members and admins.</p>
                </div>
                <Button onClick={() => setIsAddUserOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add User
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Members Directory</CardTitle>
                    <CardDescription>
                        A list of all registered users including admins and donors.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4 flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, username or phone..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-4">Loading users...</div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="cursor-pointer select-none hover:text-primary" onClick={() => handleSort("name")}>Name <SortIcon col="name" /></TableHead>
                                        <TableHead className="cursor-pointer select-none hover:text-primary" onClick={() => handleSort("username")}>Username / Email <SortIcon col="username" /></TableHead>
                                        <TableHead>Password</TableHead>
                                        <TableHead className="cursor-pointer select-none hover:text-primary" onClick={() => handleSort("role")}>Role <SortIcon col="role" /></TableHead>
                                        <TableHead className="cursor-pointer select-none hover:text-primary" onClick={() => handleSort("createdAt")}>Joined <SortIcon col="createdAt" /></TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredUsers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                                                No users found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredUsers.map((user) => {
                                            const isTopContributor = topContributors.includes(user.id);
                                            const rank = isTopContributor ? topContributors.indexOf(user.id) + 1 : undefined;
                                            return (
                                                <TableRow key={user.id}>
                                                    <TableCell className="font-medium cursor-pointer text-blue-600 hover:underline" onClick={() => handleViewProfile(user)}>
                                                        {user.name}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span>{user.username}</span>
                                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-xs">
                                                                {visiblePasswords[user.id] ? user.password : "••••••••"}
                                                            </span>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => togglePassword(user.id)}>
                                                                {visiblePasswords[user.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {user.roles && user.roles.map(role => (
                                                                <Badge key={role} variant={role === "admin" ? "default" : role === "moderator" ? "secondary" : "outline"}>
                                                                    {role}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {user.createdAt
                                                            ? (() => { try { return new Date(user.createdAt?.toDate ? user.createdAt.toDate() : user.createdAt).toLocaleDateString(); } catch { return "—"; } })()
                                                            : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="ghost" size="icon" onClick={() => {
                                                                setViewingUser(user);
                                                                handleEditClick(user);
                                                            }}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                                                onClick={() => handleDeleteClick(user)}
                                                                disabled={currentUser?.id === user.id} // Prevent self-delete
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* View User Profile Dialog */}
            <Dialog open={!!viewingUser} onOpenChange={(open) => {
                if (!open) {
                    setViewingUser(null);
                    setIsProfileEditMode(false);
                }
            }}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 p-0 sm:p-6 gap-0 sm:gap-4">
                    <DialogHeader className="p-6 sm:p-0 pb-0">
                        <DialogTitle className="text-2xl">Member Profile</DialogTitle>
                        <DialogDescription>Comprehensive dashboard for {viewingUser?.name}</DialogDescription>
                    </DialogHeader>
                    {viewingUser && (
                        <div className="p-6 sm:p-0 space-y-6">
                            {/* Top Section: Avatar & Quick Info */}
                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                <Card className="flex-shrink-0 w-full md:w-1/3">
                                    <CardContent className="pt-6 flex flex-col items-center text-center">
                                        <div className="relative group mb-4">
                                            <Avatar className={`h-24 w-24 md:h-32 md:w-32 border-4 shadow-xl ${topContributors.includes(viewingUser.id) ? 'border-yellow-400' : 'border-primary/20'}`}>
                                                <AvatarImage src={viewingUser.photoURL || undefined} alt={viewingUser.name} />
                                                <AvatarFallback className="text-3xl md:text-4xl bg-primary/10 text-primary">
                                                    {viewingUser.name?.charAt(0) || "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                            {topContributors.includes(viewingUser.id) && (
                                                <TopContributorBadge
                                                    rank={topContributors.indexOf(viewingUser.id) + 1}
                                                    className="absolute bottom-1 right-1 translate-x-1/4 translate-y-1/4 h-[34px] w-[34px]"
                                                />
                                            )}
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={handleFileChange}
                                            />
                                            {isProfileEditMode && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute bottom-0 left-0 bg-primary h-10 w-10 text-primary-foreground rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isUploadingImage}
                                                    title="Update Profile Picture"
                                                >
                                                    {isUploadingImage ? <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="h-5 w-5" />}
                                                </Button>
                                            )}
                                            {isProfileEditMode && viewingUser.photoURL && (
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-0 right-0 h-8 w-8 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                                    onClick={handleRemovePicture}
                                                    disabled={isUploadingImage}
                                                    title="Remove Profile Picture"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                        <h2 className="text-xl font-bold">{viewingUser.name}</h2>
                                        <p className="text-sm text-muted-foreground mb-4">@{viewingUser.username}</p>

                                        <div className="flex flex-wrap justify-center gap-1 mb-6">
                                            {viewingUser.roles?.map((role) => (
                                                <Badge key={role} variant={role === "admin" ? "default" : role === "moderator" ? "secondary" : "outline"} className="capitalize">
                                                    {role}
                                                </Badge>
                                            ))}
                                        </div>

                                        {isProfileEditMode ? (
                                            <div className="w-full space-y-3 text-sm text-left animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="space-y-1">
                                                    <Label htmlFor="edit-name" className="text-xs text-muted-foreground">Full Name</Label>
                                                    <Input
                                                        id="edit-name"
                                                        value={profileEditForm.name || ""}
                                                        onChange={(e) => setProfileEditForm({ ...profileEditForm, name: e.target.value })}
                                                        className="h-8"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="edit-email" className="text-xs text-muted-foreground">Email</Label>
                                                    <Input
                                                        id="edit-email"
                                                        type="email"
                                                        value={profileEditForm.email || ""}
                                                        onChange={(e) => setProfileEditForm({ ...profileEditForm, email: e.target.value })}
                                                        className="h-8"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="edit-username" className="text-xs text-muted-foreground">Username</Label>
                                                    <Input
                                                        id="edit-username"
                                                        value={profileEditForm.username || ""}
                                                        onChange={(e) => setProfileEditForm({ ...profileEditForm, username: e.target.value })}
                                                        className="h-8"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label htmlFor="edit-phone" className="text-xs text-muted-foreground">Phone</Label>
                                                    <Input
                                                        id="edit-phone"
                                                        value={profileEditForm.phone || ""}
                                                        onChange={(e) => setProfileEditForm({ ...profileEditForm, phone: e.target.value })}
                                                        className="h-8"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Roles</Label>
                                                    <div className="flex flex-col gap-2 pt-1">
                                                        {["admin", "moderator", "member"].map((role) => (
                                                            <div key={role} className="flex items-center space-x-2">
                                                                <input
                                                                    type="checkbox"
                                                                    id={`profile-role-${role}`}
                                                                    checked={profileEditForm.roles?.includes(role)}
                                                                    onChange={() => {
                                                                        const currentRoles = profileEditForm.roles || [];
                                                                        const newRoles = currentRoles.includes(role)
                                                                            ? currentRoles.filter(r => r !== role)
                                                                            : [...currentRoles, role];
                                                                        setProfileEditForm({ ...profileEditForm, roles: newRoles });
                                                                    }}
                                                                    className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                                                                />
                                                                <label htmlFor={`profile-role-${role}`} className="text-xs font-medium leading-none capitalize">
                                                                    {role}
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 pt-2">
                                                    <Button className="w-full flex-1" size="sm" onClick={handleProfileEditSave} disabled={isLoading}>
                                                        {isLoading ? "Saving..." : "Save Changes"}
                                                    </Button>
                                                    <Button className="w-full flex-1" variant="outline" size="sm" onClick={() => setIsProfileEditMode(false)}>
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-full space-y-2 text-sm text-left">
                                                    <div className="flex justify-between pb-2 border-b">
                                                        <span className="text-muted-foreground">Email</span>
                                                        <span className="font-medium truncate ml-4" title={viewingUser.email}>{viewingUser.email}</span>
                                                    </div>
                                                    <div className="flex justify-between pb-2 border-b">
                                                        <span className="text-muted-foreground">Phone</span>
                                                        <span className="font-medium">{viewingUser.phone || "N/A"}</span>
                                                    </div>
                                                    <div className="flex justify-between pb-2">
                                                        <span className="text-muted-foreground">Joined</span>
                                                        <span className="font-medium">
                                                            {viewingUser.createdAt ? new Date(viewingUser.createdAt?.toDate ? viewingUser.createdAt.toDate() : viewingUser.createdAt).toLocaleDateString() : "Unknown"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <Button className="w-full mt-6" variant="outline" onClick={() => {
                                                    setProfileEditForm({
                                                        ...viewingUser,
                                                        roles: viewingUser.roles || ["member"]
                                                    });
                                                    setIsProfileEditMode(true);
                                                }}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Edit Profile Details
                                                </Button>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>

                                <div className="flex-1 w-full space-y-6">
                                    {/* Financial Summary */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg">Financial Summary</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {(() => {
                                                const totalContributed = userPayments.reduce((sum, item) => sum + Number(item.amount), 0);
                                                const paidMonthsCount = new Set(userPayments.filter(p => p.type === 'monthly').map(p => `${p.month}-${p.year}`)).size;

                                                let totalPassedMonths = 0;
                                                const currentMonth = new Date().getMonth() + 1;
                                                const currentYearNum = new Date().getFullYear();

                                                if (settings?.collectionYears) {
                                                    settings.collectionYears.forEach((year: number) => {
                                                        const activeM = settings.collectionMonths?.[year] || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                                                        if (year < currentYearNum) {
                                                            totalPassedMonths += activeM.length;
                                                        } else if (year === currentYearNum) {
                                                            totalPassedMonths += activeM.filter((m: number) => m <= currentMonth).length;
                                                        }
                                                    });
                                                }
                                                const monthsDue = Math.max(0, totalPassedMonths - paidMonthsCount);

                                                return (
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 flex flex-col items-center text-center justify-center">
                                                            <span className="text-sm text-muted-foreground mb-1">Total Donated</span>
                                                            <span className="text-2xl font-bold text-primary">৳ {loadingPayments ? "..." : totalContributed.toLocaleString()}</span>
                                                        </div>
                                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800 flex flex-col items-center text-center justify-center">
                                                            <span className="text-sm text-muted-foreground mb-1">Months Paid</span>
                                                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{loadingPayments ? "..." : paidMonthsCount}</span>
                                                        </div>
                                                        <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-800 flex flex-col items-center text-center justify-center">
                                                            <span className="text-sm text-muted-foreground mb-1">Months Due</span>
                                                            <span className="text-2xl font-bold text-red-600 dark:text-red-400">{loadingPayments ? "..." : monthsDue}</span>
                                                        </div>
                                                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border flex flex-col items-center text-center justify-center">
                                                            <span className="text-sm text-muted-foreground mb-1">Total Active Months</span>
                                                            <span className="text-2xl font-bold">{loadingPayments ? "..." : totalPassedMonths}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </CardContent>
                                    </Card>

                                    {/* Annual Collection Calendar */}
                                    <Card className="border-t-4 border-t-primary/20 shadow-sm">
                                        <CardHeader className="pb-3">
                                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                                <div>
                                                    <CardTitle className="text-lg flex items-center gap-2">
                                                        <CalendarIcon className="h-5 w-5 text-primary" /> Collection Matrix
                                                    </CardTitle>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium">Year:</span>
                                                    <Select
                                                        value={selectedCalendarYear.toString()}
                                                        onValueChange={(v) => setSelectedCalendarYear(Number(v))}
                                                    >
                                                        <SelectTrigger className="w-[100px] h-9 bg-background">
                                                            <SelectValue placeholder="Year" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableYears.map((y: number) => (
                                                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-4 lg:grid-cols-6 gap-1 md:gap-2 mb-4">
                                                {(!settings?.collectionYears?.includes(selectedCalendarYear) || activeMonths.length === 0) ? (
                                                    <div className="text-center py-6 text-muted-foreground col-span-full border-2 border-dashed rounded-lg">
                                                        No collections active for this year.
                                                    </div>
                                                ) : (
                                                    activeMonths.map((month) => {
                                                        const statusData = getMonthlyStatus(month.value, selectedCalendarYear);

                                                        let bgClass = "bg-background border-dashed opacity-60";
                                                        let textClass = "text-muted-foreground";
                                                        let valueDisplayMobile: string | null = null;
                                                        let valueDisplayDesktop: string | null = null;

                                                        if (statusData.status === 'paid') {
                                                            bgClass = "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 border-solid";
                                                            textClass = "text-green-700 dark:text-green-400 font-bold";
                                                            valueDisplayMobile = `৳${statusData.payment?.amount || 0}`;
                                                            valueDisplayDesktop = `৳${statusData.payment?.amount || 0}`;
                                                        } else if (statusData.status === 'due-yellow') {
                                                            bgClass = "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800 border-solid";
                                                            textClass = "text-yellow-700 dark:text-yellow-400 font-medium";
                                                            valueDisplayMobile = null;
                                                            valueDisplayDesktop = "Due";
                                                        } else if (statusData.status === 'due-red') {
                                                            bgClass = "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 border-solid";
                                                            textClass = "text-red-700 dark:text-red-400 font-medium";
                                                            valueDisplayMobile = null;
                                                            valueDisplayDesktop = "Overdue";
                                                        }

                                                        return (
                                                            <div key={month.value} className={`flex flex-col justify-center items-center p-1.5 md:p-2 rounded-md transition-all border ${bgClass}`}>
                                                                <span className={`text-[11px] md:text-xs tracking-wide ${statusData.status === 'future' ? textClass : 'text-foreground font-semibold'}`}>{month.label}</span>
                                                                <div className={`text-[9px] md:text-xs mt-0.5 ${textClass} w-full text-center`}>
                                                                    <span className="md:hidden">{valueDisplayMobile}</span>
                                                                    <span className="hidden md:inline">{valueDisplayDesktop || "-"}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>

                                            {/* Setup Legend */}
                                            <div className="flex flex-wrap items-center justify-center gap-4 pt-3 border-t text-[10px] md:text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-green-500"></div>
                                                    <span className="text-muted-foreground">Paid</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-yellow-400"></div>
                                                    <span className="text-muted-foreground">Due</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-red-500"></div>
                                                    <span className="text-muted-foreground">Overdue</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Add User Dialog */}
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add New User</DialogTitle>
                        <DialogDescription>Create a new user account. Temporary password will be their phone number (if provided) or 'password123'.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-name">Full Name</Label>
                            <Input id="new-name" value={newUserForm.name} onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })} required placeholder="John Doe" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="new-username">Username</Label>
                            <Input id="new-username" value={newUserForm.username} onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })} required placeholder="johndoe" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="new-role">Role</Label>
                            <Select value={newUserForm.role} onValueChange={(value) => setNewUserForm({ ...newUserForm, role: value })}>
                                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="moderator">Moderator</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="new-email">Email</Label>
                            <Input id="new-email" type="email" value={newUserForm.email} onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} required placeholder="john@example.com" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="new-phone">Phone</Label>
                            <Input id="new-phone" type="tel" value={newUserForm.phone} onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })} placeholder="+880..." />
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={isAddingUser}>
                                {isAddingUser ? "Creating..." : "Create User"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Make changes to the user profile here. Click save when you're done.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input
                                id="name"
                                value={editForm.name || ""}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="username" className="text-right">Username</Label>
                            <Input
                                id="username"
                                value={editForm.username || ""}
                                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">Email</Label>
                            <Input
                                id="email"
                                value={editForm.email || ""}
                                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="phone" className="text-right">Phone</Label>
                            <Input
                                id="phone"
                                value={editForm.phone || ""}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="password" className="text-right">Password</Label>
                            <Input
                                id="password"
                                value={editForm.password || ""}
                                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right self-start pt-2">Roles</Label>
                            <div className="col-span-3 flex flex-col gap-2">
                                {["admin", "moderator", "member"].map((role) => (
                                    <div key={role} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`role-${role}`}
                                            checked={editForm.roles?.includes(role)}
                                            onChange={() => handleRoleToggle(role)}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <label htmlFor={`role-${role}`} className="text-sm font-medium leading-none capitalize">
                                            {role}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" onClick={handleSaveUser} disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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

            {/* Advanced Delete Confirmation Dialog */}
            <Dialog open={!!deleteModalUser} onOpenChange={(open) => !open && setDeleteModalUser(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="text-destructive flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" /> Delete Member: {deleteModalUser?.name}
                        </DialogTitle>
                        <DialogDescription className="text-base mt-2">
                            You are about to delete this user profile. Because charities must maintain accurate financial records, please choose how you want to handle their historical payment data.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                        {/* Option A: Preserve */}
                        <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-blue-700 dark:text-blue-400 text-lg">Preserve Financials</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-3">
                                <p><strong>Ideal for:</strong> Retiring members.</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Revokes login access.</li>
                                    <li>Safely converts all past payments into a single <strong>One-Time Donation</strong> to keep the Dashboard totals accurate.</li>
                                </ul>
                                <Button
                                    type="button"
                                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-lg"
                                    disabled={isDeleting}
                                    onClick={() => handleConfirmDelete('preserve')}
                                >
                                    {isDeleting ? "Processing..." : "Preserve Fund and Delete Profile"}
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Option B: Purge */}
                        <Card className="border-destructive/30 bg-destructive/5 hover:border-destructive/50 transition-colors">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-destructive text-lg">Purge Financials</CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm text-muted-foreground space-y-3">
                                <p><strong>Ideal for:</strong> Mistakes or refunds.</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Revokes login access entirely.</li>
                                    <li>Permanently deletes <strong>EVERY</strong> past payment they made, lowering the Dashboard collections total.</li>
                                </ul>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    className="w-full mt-2 hover:scale-105 active:scale-95 transition-all shadow-md hover:shadow-lg hover:bg-red-700"
                                    disabled={isDeleting}
                                    onClick={() => handleConfirmDelete('purge')}
                                >
                                    {isDeleting ? "Processing..." : "Erase fund and Delete profile"}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    <DialogFooter className="sm:justify-start">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setDeleteModalUser(null)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
