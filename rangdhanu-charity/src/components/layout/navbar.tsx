"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Heart, User as UserIcon, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/lib/data";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

import { ThemeToggle } from "@/components/common/theme-toggle";

export function Navbar() {
    const [isOpen, setIsOpen] = React.useState(false);
    const pathname = usePathname();
    const { user, logout } = useAuth();

    const toggleMenu = () => setIsOpen(!isOpen);

    React.useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-purple-500 to-pink-500 text-white">
                        <Heart className="h-5 w-5 fill-current" />
                    </div>
                    <span className="bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
                        Rangdhanu
                    </span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-6">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-primary",
                                pathname === link.href
                                    ? "text-primary"
                                    : "text-muted-foreground"
                            )}
                        >
                            {link.label}
                        </Link>
                    ))}
                    <ThemeToggle />

                    {user ? (
                        <div className="flex items-center gap-4">
                            {(user.role === "admin" || user.role === "moderator") && (
                                <Link href="/admin" className="text-sm font-medium text-muted-foreground hover:text-primary flex items-center gap-1">
                                    <LayoutDashboard className="h-4 w-4" />
                                    Admin
                                </Link>
                            )}
                            <div className="flex items-center gap-2">
                                <Link href="/profile" className="text-sm font-medium text-muted-foreground hover:text-primary mr-2">
                                    My Profile
                                </Link>
                                <span className="text-sm font-medium text-muted-foreground">Hi, {user.name}</span>
                                <Button variant="ghost" size="icon" onClick={logout} title="Logout">
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/login">
                                <UserIcon className="mr-2 h-4 w-4" />
                                Login
                            </Link>
                        </Button>
                    )}

                    <Button asChild size="sm" className="bg-gradient-to-r from-blue-600 to-pink-500 hover:opacity-90 transition-opacity">
                        <Link href="/donate">Donate Now</Link>
                    </Button>
                </nav>

                {/* Mobile Menu Toggle */}
                <div className="flex items-center gap-2 md:hidden">
                    <ThemeToggle />
                    <button
                        className="flex items-center justify-center p-2 rounded-md hover:bg-muted"
                        onClick={toggleMenu}
                        aria-label="Toggle menu"
                    >
                        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Nav */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden border-b bg-background overflow-hidden"
                    >
                        <nav className="flex flex-col gap-4 p-4">
                            {NAV_LINKS.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        "text-sm font-medium transition-colors hover:text-primary py-2",
                                        pathname === link.href
                                            ? "text-primary bg-muted/50 px-2 rounded-md"
                                            : "text-foreground"
                                    )}
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <hr />
                            {user ? (
                                <>
                                    <div className="flex items-center gap-2 px-2">
                                        <UserIcon className="h-4 w-4" />
                                        <span className="text-sm font-medium">{user.name} ({user.role})</span>
                                    </div>
                                    {(user.role === "admin" || user.role === "moderator") && (
                                        <Link href="/admin" className="flex items-center gap-2 text-sm font-medium hover:text-primary py-2 px-2">
                                            <LayoutDashboard className="h-4 w-4" />
                                            Admin Dashboard
                                        </Link>
                                    )}
                                    <Button variant="ghost" className="justify-start px-2" onClick={logout}>
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Logout
                                    </Button>
                                </>
                            ) : (
                                <Link href="/login" className="flex items-center gap-2 text-sm font-medium hover:text-primary py-2 px-2">
                                    <UserIcon className="h-4 w-4" />
                                    Login / Register
                                </Link>
                            )}
                            <Button asChild className="w-full bg-gradient-to-r from-blue-600 to-pink-500">
                                <Link href="/donate">Donate Now</Link>
                            </Button>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
