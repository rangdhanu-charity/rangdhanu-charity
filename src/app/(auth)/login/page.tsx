"use client";

import { Suspense, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Heart, Eye, EyeOff } from "lucide-react";

function LoginForm() {
    // Shared State
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, loginWithGoogle } = useAuth();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Email State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        const res = await login(email, password, isAdmin);
        if (!res.success) {
            setError(res.error || "Login failed");
        } else {
            const redirectUrl = searchParams?.get('redirect');
            if (redirectUrl && !isAdmin) router.push(redirectUrl);
        }
        setLoading(false);
    };


    const handleSubmitGoogle = async () => {
        setLoading(true);
        setError("");
        const res = await loginWithGoogle();
        if (!res.success) {
            setError(res.error || "Google Login failed");
        } else {
            const redirectUrl = searchParams?.get('redirect');
            if (redirectUrl) router.push(redirectUrl);
        }
        setLoading(false);
    };

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

            <Card className="w-full max-w-sm">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
                    <CardDescription>
                        Choose how you would like to sign in
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && <div className="p-3 mb-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">{error}</div>}

                    <div className="w-full">
                        <form onSubmit={handleEmailSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="email">Email or Username</label>
                                <Input
                                    id="email"
                                    type="text"
                                    placeholder="m@example.com or username"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="password">Password</label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                                <div className="flex justify-end pt-1">
                                    <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                                        Forgot password?
                                    </Link>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 pb-2">
                                <input
                                    type="checkbox"
                                    id="admin-toggle"
                                    checked={isAdmin}
                                    onChange={(e) => setIsAdmin(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor="admin-toggle" className="text-sm font-medium leading-none">
                                    Login as Admin
                                </label>
                            </div>

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? "Signing In..." : "Sign In"}
                            </Button>
                        </form>
                    </div>

                    <div className="relative my-6 mt-8">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleSubmitGoogle}
                        disabled={loading}
                    >
                        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                        </svg>
                        Google
                    </Button>
                </CardContent>
                <CardFooter className="flex justify-center border-t bg-muted/20 py-4">
                    <p className="text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <Link href="/register" className="text-primary hover:underline font-medium">
                            Sign up
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-8">Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
