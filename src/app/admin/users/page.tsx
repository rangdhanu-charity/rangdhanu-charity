"use client";

import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus, Search, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { RecycleService } from "@/lib/recycle-service";
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
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const { user: currentUser, adminUpdateUser } = useAuth();
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
    const [userPayments, setUserPayments] = useState<any[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(false);

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

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}?`)) return;
        try {
            await RecycleService.softDelete("users", id, "user", name, currentUser?.username || "admin");
            // await deleteDoc(doc(db, "users", id));
            toast({ title: "User Deleted", description: `${name} has been moved to recycle bin.` });
        } catch (error) {
            console.error("Error deleting user:", error);
            toast({ title: "Error", description: "Failed to delete user.", variant: "destructive" });
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

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.phone && user.phone.includes(searchTerm))
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
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
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
                                        filteredUsers.map((user) => (
                                            <TableRow key={user.id}>
                                                <TableCell className="font-medium cursor-pointer text-blue-600 hover:underline" onClick={() => handleViewProfile(user)}>{user.name}</TableCell>
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
                                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(user)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:text-destructive/90"
                                                            onClick={() => handleDelete(user.id, user.name)}
                                                            disabled={currentUser?.id === user.id} // Prevent self-delete
                                                        >
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
                    )}
                </CardContent>
            </Card>

            {/* View User Profile Dialog */}
            <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Member Profile</DialogTitle>
                        <DialogDescription>Details and financial history for {viewingUser?.name}</DialogDescription>
                    </DialogHeader>
                    {viewingUser && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4 border p-4 rounded-md">
                                <div><span className="font-semibold">Name:</span> {viewingUser.name}</div>
                                <div><span className="font-semibold">Email:</span> {viewingUser.email}</div>
                                <div><span className="font-semibold">Username:</span> {viewingUser.username}</div>
                                <div><span className="font-semibold">Phone:</span> {viewingUser.phone || "N/A"}</div>
                                <div><span className="font-semibold">Roles:</span> {viewingUser.roles?.join(", ")}</div>
                                <div><span className="font-semibold">Joined:</span> {viewingUser.createdAt ? new Date(viewingUser.createdAt).toLocaleDateString() : "Unknown"}</div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold mb-2">Financial History</h3>
                                {loadingPayments ? (
                                    <div className="text-muted-foreground">Loading payments...</div>
                                ) : userPayments.length === 0 ? (
                                    <div className="text-muted-foreground">No payment history found.</div>
                                ) : (
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Amount</TableHead>
                                                    <TableHead>Method</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {userPayments.map(p => (
                                                    <TableRow key={p.id}>
                                                        <TableCell>{p.date?.toDate ? new Date(p.date.toDate()).toLocaleDateString() : new Date(p.date).toLocaleDateString()}</TableCell>
                                                        <TableCell className="capitalize">{p.type}</TableCell>
                                                        <TableCell className="font-medium text-green-600">৳{p.amount}</TableCell>
                                                        <TableCell className="capitalize">{p.method}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
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
                        <DialogDescription>Create a new member record.</DialogDescription>
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
        </div>
    );
}
