"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";

export default function EditUserPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { adminUpdateUser } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        username: "",
        email: "",
        roles: [] as string[],
        phone: "",
        photoURL: ""
    });

    const [newPassword, setNewPassword] = useState("");

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const docRef = doc(db, "users", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    let roles = [];
                    if (data.roles && Array.isArray(data.roles)) {
                        roles = data.roles;
                    } else if (data.role) {
                        roles = [data.role];
                    }

                    setFormData({
                        name: data.name || "",
                        username: data.username || "",
                        email: data.email || "",
                        roles: roles,
                        phone: data.phone || "",
                        photoURL: data.photoURL || ""
                    });
                } else {
                    setError("User not found");
                }
            } catch (err) {
                console.error(err);
                setError("Failed to load user");
            } finally {
                setIsLoading(false);
            }
        };
        fetchUser();
    }, [id]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRoleToggle = (role: string) => {
        const newRoles = formData.roles.includes(role)
            ? formData.roles.filter(r => r !== role)
            : [...formData.roles, role];
        setFormData({ ...formData, roles: newRoles });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError("");

        try {
            // Determine if admin status changed for sync
            const isAdmin = formData.roles.includes("admin");

            console.log("Submitting User Update:", {
                id,
                roles: formData.roles,
                isAdminCalculated: isAdmin,
                passLength: newPassword?.length
            });

            await adminUpdateUser(id, {
                ...formData,
                password: newPassword || undefined,
                isAdmin: isAdmin // Pass this explicitly to trigger admin doc sync/creation
            });

            router.push("/admin/users");
        } catch (err) {
            console.error(err);
            setError("Failed to update user.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center">Loading user data...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/users">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Edit User</h1>
                    <p className="text-muted-foreground">Modify account details and permissions.</p>
                </div>
            </div>

            <Card>
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle>Account Details</CardTitle>
                        <CardDescription>
                            Update the user's personal information.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">

                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" name="name" required value={formData.name} onChange={handleChange} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="username">Username</Label>
                                <Input id="username" name="username" required value={formData.username} onChange={handleChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="phone">Phone (Optional)</Label>
                                <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="photoURL">Photo URL</Label>
                                <Input id="photoURL" name="photoURL" value={formData.photoURL} onChange={handleChange} placeholder="https://..." />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label>Roles & Badges</Label>
                            <div className="flex flex-wrap gap-4 p-4 border rounded-md">
                                {["admin", "moderator", "member"].map((role) => (
                                    <div key={role} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`role-edit-${role}`}
                                            checked={formData.roles.includes(role)}
                                            onChange={() => handleRoleToggle(role)}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <label htmlFor={`role-edit-${role}`} className="text-sm font-medium leading-none capitalize cursor-pointer">
                                            {role}
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                checking "admin" will create an entry in the Admins collection. Unchecking it will remove it.
                            </p>
                        </div>

                        <Separator className="my-4" />

                        <div className="space-y-2">
                            <Label htmlFor="newPassword">Reset Password (Optional)</Label>
                            <Input
                                id="newPassword"
                                type="text"
                                placeholder="Enter new password to reset"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">Leave blank to keep current password.</p>
                        </div>

                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="ghost" asChild>
                            <Link href="/admin/users">Cancel</Link>
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
