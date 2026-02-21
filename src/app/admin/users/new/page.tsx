"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewUserPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        username: "",
        phone: "",
        role: "member",
        password: "password123" // Default temporary password
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // 1. Check if user already exists (by email or username)
            const usersRef = collection(db, "users");
            const qEmail = query(usersRef, where("email", "==", formData.email));
            const qUsername = query(usersRef, where("username", "==", formData.username));

            const [emailSnap, usernameSnap] = await Promise.all([
                getDocs(qEmail),
                getDocs(qUsername)
            ]);

            if (!emailSnap.empty) {
                toast({ title: "Error", description: "User with this email already exists.", variant: "destructive" });
                setIsLoading(false);
                return;
            }

            if (!usernameSnap.empty) {
                toast({ title: "Error", description: "Username already taken.", variant: "destructive" });
                setIsLoading(false);
                return;
            }

            // 2. Create User Document in Firestore
            // Note: We cannot create Firebase Auth account from client side for another user without logging out.
            // We create the Firestore record so they appear in the system. 
            // They can later "Register" with this email to link Auth, OR an Admin SDK would be needed for full creation.
            // For this app scope, Firestore creation enables Record Management (Collections/Reports).

            await addDoc(usersRef, {
                ...formData,
                roles: [formData.role], // Helper for role array
                createdAt: new Date().toISOString(),
                photoURL: ""
            });

            toast({ title: "Success", description: "User created successfully." });
            router.push("/admin/users");
        } catch (error) {
            console.error("Error creating user:", error);
            toast({ title: "Error", description: "Failed to create user.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/users">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Add New User</h1>
                    <p className="text-muted-foreground">Create a new member record.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>User Details</CardTitle>
                    <CardDescription>
                        Enter the information for the new user.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="John Doe"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                    placeholder="johndoe"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="role">Role</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="member">Member</SelectItem>
                                        <SelectItem value="moderator">Moderator</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                placeholder="john@example.com"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+880..."
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">Temporary Password</Label>
                            <Input
                                id="password"
                                type="text"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="password123"
                            />
                            <p className="text-xs text-muted-foreground">
                                Save this password. The user can use it if manual authentication is implemented,
                                or they can register with the same email to link accounts.
                            </p>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Creating..." : "Create User"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
