"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { Heart } from "lucide-react";

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [reason, setReason] = useState("");
    const [phone, setPhone] = useState("");
    const { submitRegistrationRequest } = useAuth();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const res = await submitRegistrationRequest({ name, username, email, reason, phone });
        if (res.success) {
            setSuccess(true);
        } else {
            setError(res.error || "Failed to submit request");
        }
        setLoading(false);
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
                <Link href="/" className="mb-8 flex items-center gap-2 font-bold text-2xl text-primary">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-purple-500 to-pink-500 text-white">
                        <Heart className="h-6 w-6 fill-current" />
                    </div>
                    <span className="bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
                        Rangdhanu
                    </span>
                </Link>
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-center text-green-600">Application Submitted!</CardTitle>
                        <CardDescription className="text-center">
                            Your registration request has been sent to the admin. <br />
                            You will be notified once your account is approved.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center">
                        <Link href="/">
                            <Button>Return to Home</Button>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center">
            <Link href="/" className="mb-8 flex items-center gap-2 font-bold text-2xl text-primary">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-purple-500 to-pink-500 text-white">
                    <Heart className="h-6 w-6 fill-current" />
                </div>
                <span className="bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
                    Rangdhanu
                </span>
            </Link>

            <Card className="w-full">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Apply for Membership</CardTitle>
                    <CardDescription>
                        Enter your details to request an account
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="name">Full Name</label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="username">Username</label>
                            <Input
                                id="username"
                                placeholder="johndoe"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="email">Email (Optional)</label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="phone">Phone Number</label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="+1234567890"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="reason">Reason for Joining</label>
                            <Input
                                id="reason"
                                placeholder="e.g. I want to volunteer"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Submitting..." : "Submit Application"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link href="/login" className="text-primary hover:underline">
                            Sign in
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
