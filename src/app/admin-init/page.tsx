"use client";

import { useState } from "react";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";

export default function AdminInitPage() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        username: "",
        password: ""
    });
    const [status, setStatus] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("Creating...");

        try {
            // 1. Check if user exists
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", formData.email));
            const snap = await getDocs(q);

            if (!snap.empty) {
                setStatus("User with this email already exists. Please use a new email or delete the existing user from Firebase Console.");
                return;
            }

            // 2. Create User Doc
            await addDoc(usersRef, {
                ...formData,
                roles: ["admin", "member"],
                createdAt: new Date().toISOString()
            });

            // 3. Create Admin Doc
            await addDoc(collection(db, "admins"), {
                ...formData,
                role: "admin"
            });

            setStatus("Success! Admin user created. You can now login at /login (check 'Login as Admin').");
        } catch (err: any) {
            console.error(err);
            setStatus("Error: " + err.message);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Create Initial Admin</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            placeholder="Full Name"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                        <Input
                            placeholder="Email"
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                        <Input
                            placeholder="Username"
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                            required
                        />
                        <Input
                            placeholder="Password"
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            required
                        />
                        <Button type="submit" className="w-full">Create Admin</Button>
                    </form>
                </CardContent>
                <CardFooter>
                    <p className="text-sm text-muted-foreground">{status}</p>
                </CardFooter>
            </Card>
        </div>
    );
}
