"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { Heart, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [step, setStep] = useState<"request" | "reset">("request");
    const { requestPasswordReset, resetPasswordWithCode } = useAuth();
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await requestPasswordReset(email);
        setLoading(false);

        if (res.success) {
            setStep("reset");
            // In a real app, we wouldn't show this. But for demo/no-backend:
            toast({
                title: "Code Sent",
                description: `(Demo) Your reset code is: ${res.code}`,
                duration: 10000,
            });
        } else {
            toast({
                title: "Error",
                description: res.error || "Failed to send reset code",
                variant: "destructive"
            });
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await resetPasswordWithCode(email, code, newPassword);
        setLoading(false);

        if (res.success) {
            toast({
                title: "Success",
                description: "Password reset successfully. Please login.",
            });
            router.push("/login");
        } else {
            toast({
                title: "Error",
                description: res.error || "Failed to reset password",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
            <Link href="/" className="mb-8 flex items-center gap-2 font-bold text-2xl text-primary">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-purple-500 to-pink-500 text-white">
                    <Heart className="h-6 w-6 fill-current" />
                </div>
                <span className="bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
                    Rangdhanu
                </span>
            </Link>

            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">
                        {step === "request" ? "Forgot Password" : "Reset Password"}
                    </CardTitle>
                    <CardDescription>
                        {step === "request"
                            ? "Enter your email to receive a reset code"
                            : "Enter the code sent to your email and your new password"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === "request" ? (
                        <form onSubmit={handleRequest} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="email">Email</label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Sending..." : "Send Code"}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="code">Reset Code</label>
                                <Input
                                    id="code"
                                    placeholder="123456"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="newPassword">New Password</label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Resetting..." : "Reset Password"}
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
