"use client";

import { useState } from "react";
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function ResetAdminPage() {
    const [email, setEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [status, setStatus] = useState("");

    const handleReset = async () => {
        setStatus("Processing...");
        try {
            // 1. Check 'admins' collection
            const adminsRef = collection(db, "admins");
            const q = query(adminsRef, where("email", "==", email));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const adminDoc = snapshot.docs[0];
                await updateDoc(doc(db, "admins", adminDoc.id), { password: newPassword });
                setStatus("Success! Admin password updated in 'admins' collection.");
                return;
            }

            // 2. If not found in 'admins', check 'users' and promote/fix
            const usersRef = collection(db, "users");
            const qUser = query(usersRef, where("email", "==", email));
            const userSnap = await getDocs(qUser);

            if (!userSnap.empty) {
                const userDoc = userSnap.docs[0];
                // Update user password
                await updateDoc(doc(db, "users", userDoc.id), { password: newPassword });

                // Create new admin entry
                await addDoc(collection(db, "admins"), {
                    email: email,
                    password: newPassword,
                    username: userDoc.data().username || email.split('@')[0],
                    name: userDoc.data().name || "Admin",
                    role: "admin"
                });

                setStatus("Success! User found. Password updated and Admin entry created.");
            } else {
                setStatus("Error: No user or admin found with that email.");
            }

        } catch (error: any) {
            console.error(error);
            setStatus("Error: " + error.message);
        }
    };

    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle>Emergency Admin Reset</CardTitle>
                    <CardDescription>Enter email to reset password.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input
                        placeholder="Admin Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Button onClick={handleReset} className="w-full">Reset Password</Button>
                    {status && <p className="text-sm font-medium mt-2">{status}</p>}
                </CardContent>
            </Card>
        </div>
    );
}
