"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Menu, X, Heart, User as UserIcon, LogOut,
    LayoutDashboard, ChevronRight, Home, Info,
    FolderOpen, HandHelping, BarChart3, Mail, ShieldCheck,
    Coins, PiggyBank, FileText, Users, MessageSquareQuote, Settings, Megaphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NAV_LINKS } from "@/lib/data";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const PUBLIC_NAV_LINKS = [
    { href: "/", label: "Home", icon: Home },
    { href: "/about", label: "About Us", icon: Info },
    { href: "/projects", label: "Projects", icon: FolderOpen },
    { href: "/volunteer", label: "Volunteer", icon: HandHelping },
    { href: "/transparency", label: "Transparency", icon: BarChart3 },
    { href: "/contact", label: "Contact", icon: Mail },
];

const MEMBER_NAV_LINKS = [
    { href: "/profile", label: "Personal Overview", icon: UserIcon },
    { href: "/profile?action=donate", label: "Donate Now", icon: Heart },
    { href: "/profile?tab=finance", label: "Organisation Finance", icon: BarChart3 },
    { href: "/profile?tab=security", label: "Security", icon: ShieldCheck },
    { href: "/profile#history", label: "Donation History", icon: FileText },
    { href: "/profile#requests", label: "My Requests", icon: MessageSquareQuote },
];

const ADMIN_NAV_LINKS = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
    { href: "/admin/collections", label: "Collections", icon: Coins },
    { href: "/admin/finance", label: "Finance", icon: PiggyBank },
    { href: "/admin/reports", label: "Reports", icon: FileText },
    { href: "/admin/projects", label: "Projects", icon: FolderOpen },
    { href: "/admin/users", label: "Members", icon: Users },
    { href: "/admin/requests", label: "Requests", icon: MessageSquareQuote },
    { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function Navbar() {
    const [isOpen, setIsOpen] = React.useState(false);
    const [adminView, setAdminView] = React.useState(false);
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const router = useRouter();

    const isAdminOrMod = user?.roles?.includes("admin") || user?.roles?.includes("moderator");
    const [requestCount, setRequestCount] = React.useState(0);

    // Live pending request count for admin badge
    React.useEffect(() => {
        if (!isAdminOrMod) return;
        let regCount = 0;
        let donationCount = 0;
        const q1 = query(collection(db, "registration_requests"), where("status", "==", "pending"));
        const q2 = query(collection(db, "donation_requests"), where("status", "==", "pending"));
        const unsub1 = onSnapshot(q1, (snap) => {
            regCount = snap.size;
            setRequestCount(regCount + donationCount);
        });
        const unsub2 = onSnapshot(q2, (snap) => {
            donationCount = snap.size;
            setRequestCount(regCount + donationCount);
        });
        return () => { unsub1(); unsub2(); };
    }, [isAdminOrMod]);

    // Auto-switch to admin view when on admin routes
    React.useEffect(() => {
        if (pathname.startsWith("/admin")) {
            setAdminView(true);
        }
    }, [pathname]);

    React.useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    const handleLogout = async () => {
        setIsOpen(false);
        await logout();
        router.push("/");
    };

    const linksToShow = React.useMemo(() => {
        if (!user) return PUBLIC_NAV_LINKS;
        if (!isAdminOrMod || !adminView) return MEMBER_NAV_LINKS;
        return ADMIN_NAV_LINKS;
    }, [user, isAdminOrMod, adminView]);

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center justify-between px-4">
                    <Link href={user ? "/profile" : "/"} className="flex items-center gap-2 font-bold text-xl text-primary">
                        <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-purple-500 to-pink-500 text-white">
                            <Heart className="h-5 w-5 fill-current" />
                        </div>
                        <span className="bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
                            Rangdhanu
                        </span>
                    </Link>

                    {/* Desktop Nav — original behavior */}
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
                                {isAdminOrMod && (
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
                                    <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
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
                    </nav>

                    {/* Mobile: Right side controls */}
                    <div className="flex items-center gap-1 md:hidden">
                        <ThemeToggle />
                        <button
                            className="flex items-center justify-center p-2 rounded-md hover:bg-muted"
                            onClick={() => setIsOpen(true)}
                            aria-label="Open menu"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Drawer Overlay */}
            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Slide-in Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.aside
                        key="drawer"
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed top-0 right-0 bottom-0 z-[51] w-72 bg-background shadow-2xl flex flex-col md:hidden border-l"
                    >
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <div className="flex items-center gap-2">
                                {user ? (
                                    <>
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={user.photoURL || undefined} />
                                            <AvatarFallback className="text-xs">{user.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold leading-tight">{user.name}</span>
                                            {isAdminOrMod ? (
                                                <span className="text-xs text-muted-foreground capitalize">
                                                    {adminView ? "Admin View" : "Member View"}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground capitalize">
                                                    Member
                                                </span>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-purple-500 to-pink-500 text-white">
                                            <Heart className="h-4 w-4 fill-current" />
                                        </div>
                                        <span className="font-bold text-primary">Rangdhanu</span>
                                    </div>
                                )}
                            </div>
                            <button
                                className="p-1.5 rounded-md hover:bg-muted"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close menu"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Nav Links */}
                        <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
                            {linksToShow.map((link) => {
                                const Icon = link.icon;
                                const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setIsOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-primary/10 text-primary"
                                                : "text-foreground hover:bg-muted"
                                        )}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        {link.label}
                                        {link.href === "/admin/requests" && requestCount > 0 && (
                                            <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                                                {requestCount}
                                            </span>
                                        )}
                                        {isActive && link.href !== "/admin/requests" && <ChevronRight className="h-4 w-4 ml-auto text-primary/70" />}
                                        {isActive && link.href === "/admin/requests" && requestCount === 0 && <ChevronRight className="h-4 w-4 ml-auto text-primary/70" />}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Drawer Footer Actions */}
                        <div className="p-3 border-t flex flex-col gap-2">
                            {user ? (
                                <>
                                    {isAdminOrMod && (
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start gap-2 text-sm"
                                            onClick={() => {
                                                const next = !adminView;
                                                setAdminView(next);
                                                setIsOpen(false);
                                                router.push(next ? "/admin" : "/profile");
                                            }}
                                        >
                                            {adminView ? (
                                                <><UserIcon className="h-4 w-4" /> Switch to Member View</>
                                            ) : (
                                                <><LayoutDashboard className="h-4 w-4" /> Switch to Admin View</>
                                            )}
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start gap-2 text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={handleLogout}
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Logout
                                    </Button>
                                </>
                            ) : (
                                <Button asChild className="w-full">
                                    <Link href="/login">
                                        <UserIcon className="mr-2 h-4 w-4" />
                                        Login / Register
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </>
    );
}
