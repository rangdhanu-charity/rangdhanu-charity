"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { Heart, ArrowLeft, Mail, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSettings } from "@/lib/settings-context";

export default function ForgotPasswordPage() {
    const [identifier, setIdentifier] = useState("");
    const { requestPasswordReset } = useAuth();
    const { settings } = useSettings();
    const orgLogoURL = settings?.orgLogoURL || "";
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submittedType, setSubmittedType] = useState<"email" | "username">("email");
    const { toast } = useToast();

    const handleRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identifier.trim()) return;
        setLoading(true);

        const isEmail = identifier.includes("@");

        if (isEmail) {
            try {
                const { doc, updateDoc, collection, query, where, getDocs } = await import("firebase/firestore");
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("email", "==", identifier.trim()));
                const snap = await getDocs(q);

                if (snap.empty) {
                    toast({
                        title: "Notice",
                        description: "If an account with that email exists, instructions have been sent.",
                    });
                    setSubmittedType("email");
                    setSubmitted(true);
                    setLoading(false);
                    return;
                }

                const userData = snap.docs[0].data();
                const userId = snap.docs[0].id;

                // Generate a secure temporary password entirely locally
                const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);

                // Directly synchronize update into Firestore immediately
                await updateDoc(doc(db, "users", userId), { password: tempPassword });

                // Dispatch secure Zoho Mail natively
                await fetch("/api/email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        to: identifier.trim(),
                        subject: "Your New Password - Rangdhanu Charity",
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                                <h2>Password Reset Successfully</h2>
                                <p>Dear ${userData.name || userData.username || 'Member'},</p>
                                <p>You recently requested a password reset for your Rangdhanu Charity account.</p>
                                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #10b981; margin: 20px 0;">
                                    <p style="margin: 0; font-size: 16px;"><strong>Your new temporary password is:</strong></p>
                                    <p style="margin: 10px 0 0 0; font-size: 24px; font-weight: bold; font-family: monospace; letter-spacing: 2px;">${tempPassword}</p>
                                </div>
                                <p>You can use this password to immediately log into your portal alongside your email address (${identifier.trim()}).</p>
                                <p>If you did not request this, please contact site administrators immediately.</p>
                            </div>
                        `
                    })
                });

                setSubmittedType("email");
                setSubmitted(true);
            } catch (err) {
                console.error("Email reset failed:", err);
                toast({
                    title: "Error",
                    description: "Failed to securely process email request. Please try again.",
                    variant: "destructive"
                });
            }
        } else {
            // Username-based reset: create an admin request
            try {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("username", "==", identifier.trim()));
                const snap = await getDocs(q);

                if (snap.empty) {
                    toast({
                        title: "Not Found",
                        description: "No account found with that username.",
                        variant: "destructive"
                    });
                    setLoading(false);
                    return;
                }

                const userData = snap.docs[0].data();
                const userId = snap.docs[0].id;

                // Check if there's already a pending request for this user
                const existingQ = query(
                    collection(db, "password_reset_requests"),
                    where("userId", "==", userId),
                    where("status", "==", "pending")
                );
                const existingSnap = await getDocs(existingQ);

                if (!existingSnap.empty) {
                    toast({
                        title: "Request Already Pending",
                        description: "A password reset request for this account is already pending. Please wait for an admin to respond.",
                    });
                    setLoading(false);
                    return;
                }

                await addDoc(collection(db, "password_reset_requests"), {
                    userId,
                    username: userData.username,
                    name: userData.name || userData.username,
                    email: userData.email || "",
                    phone: userData.phone || "",
                    status: "pending",
                    createdAt: Timestamp.now()
                });

                setSubmittedType("username");
                setSubmitted(true);
            } catch (err) {
                console.error("Username reset request failed:", err);
                toast({
                    title: "Error",
                    description: "Something went wrong. Please try again.",
                    variant: "destructive"
                });
            }
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
            <Link href="/" className="mb-8 flex items-center gap-2 font-bold text-2xl text-primary">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-purple-500 to-pink-500 text-white overflow-hidden shrink-0">
                    {orgLogoURL ? (
                        <img src={orgLogoURL} alt="Rangdhanu Logo" className="h-full w-full object-cover" />
                    ) : (
                        <Heart className="h-6 w-6 fill-current" />
                    )}
                </div>
                <div className="flex flex-col leading-tight">
                    <span className="bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent text-xl font-bold">Rangdhanu</span>
                    <span className="text-[10px] font-medium tracking-wide text-muted-foreground whitespace-nowrap">Charity Foundation</span>
                </div>
            </Link>

            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">
                        Forgot Password
                    </CardTitle>
                    <CardDescription>
                        Enter your email or username. If you use an email, you'll receive a new password directly. For usernames, an admin will assist you.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {submitted ? (
                        <div className="py-4 text-center space-y-3">
                            {submittedType === "email" ? (
                                <>
                                    <div className="flex justify-center"><Mail className="h-12 w-12 text-green-500" /></div>
                                    <p className="font-semibold text-green-700">Check Your Inbox</p>
                                    <p className="text-sm text-muted-foreground">
                                        Your newly generated password has been sent directly to your inbox. You may use it to login immediately.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-center"><User className="h-12 w-12 text-blue-500" /></div>
                                    <p className="font-semibold text-blue-700">Request Submitted</p>
                                    <p className="text-sm text-muted-foreground">
                                        Your password reset request has been sent to an administrator. They will contact you with your new password.
                                    </p>
                                </>
                            )}
                            <Button variant="outline" className="mt-4 w-full" onClick={() => { setSubmitted(false); setIdentifier(""); }}>
                                Submit Another Request
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleRequest} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="identifier">Email or Username</label>
                                <Input
                                    id="identifier"
                                    type="text"
                                    placeholder="m@example.com or your_username"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    required
                                />
                                <p className="text-xs text-muted-foreground">
                                    Enter your email to receive a new password instantly, or your username for admin assistance.
                                </p>
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Processing..." : "Continue"}
                            </Button>
                        </form>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Link href="/login" className="flex items-center text-sm text-muted-foreground hover:text-primary">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}
