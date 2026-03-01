"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Heart, LayoutDashboard, FolderOpen, Users, LogOut, BarChart3, MessageSquareQuote, Trash2, Settings, Megaphone, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FinanceProvider } from "@/lib/finance-context";
import { SettingsProvider } from "@/lib/settings-context";
import { Coins, PiggyBank, FileText, Library } from "lucide-react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const [requestCount, setRequestCount] = useState(0);
    const [isContentOpen, setIsContentOpen] = useState(false);

    useEffect(() => {
        if (!isLoading) {
            if (!user || (!user.roles?.includes("admin") && !user.roles?.includes("moderator"))) {
                router.push("/login");
            }
        }
    }, [user, isLoading, router]);



    // Better approach: Direct Firestore listener for real-time updates
    useEffect(() => {
        if (user && (user.roles?.includes("admin") || user.roles?.includes("moderator"))) {
            const q1 = query(collection(db, "registration_requests"), where("status", "==", "pending"));
            const q2 = query(collection(db, "donation_requests"), where("status", "==", "pending"));

            let regCount = 0;
            let donationCount = 0;

            const unsub1 = onSnapshot(q1, (snap) => {
                regCount = snap.size;
                setRequestCount(regCount + donationCount);
            });

            const unsub2 = onSnapshot(q2, (snap) => {
                donationCount = snap.size;
                setRequestCount(regCount + donationCount);
            });

            return () => {
                unsub1();
                unsub2();
            };
        }
    }, [user]);

    if (isLoading) return <div className="p-8">Loading...</div>;

    if (!user || (!user.roles?.includes("admin") && !user.roles?.includes("moderator"))) return null;

    const sidebarItems = [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        {
            href: "/admin/content",
            label: "Content Hub",
            icon: Library,
            subItems: [
                { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
                { href: "/admin/banner", label: "Public Banner", icon: Megaphone },
                { href: "/admin/stories", label: "Stories", icon: BookOpen },
                { href: "/admin/projects", label: "Projects", icon: FolderOpen },
            ]
        },
        { href: "/admin/collections", label: "Collections", icon: Coins },
        { href: "/admin/finance", label: "Finance", icon: PiggyBank },
        { href: "/admin/reports", label: "Reports", icon: FileText },
        { href: "/admin/users", label: "Members", icon: Users },
        { href: "/admin/requests", label: "Requests", icon: MessageSquareQuote },
        { href: "/admin/settings", label: "Settings", icon: Settings },
    ];

    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            <aside className="hidden border-r bg-muted/40 md:flex flex-col md:w-64 md:min-h-screen">
                <div className="flex h-16 items-center border-b px-6">
                    <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
                        <Heart className="h-5 w-5 fill-current" />
                        <span>Rangdhanu Admin</span>
                    </Link>
                </div>
                <nav className="flex flex-col gap-2 p-4">
                    {sidebarItems.map((item) => (
                        <div key={item.href}>
                            <div className="flex items-center group">
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
                                        pathname === item.href
                                            ? "bg-muted text-primary"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                    {item.href === "/admin/requests" && requestCount > 0 && (
                                        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                                            {requestCount}
                                        </span>
                                    )}
                                </Link>
                                {item.subItems && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setIsContentOpen(!isContentOpen);
                                        }}
                                        className={cn(
                                            "p-2 ml-1 rounded-md text-muted-foreground hover:bg-muted hover:text-primary transition-colors",
                                            isContentOpen && "bg-muted text-primary"
                                        )}
                                        aria-label="Toggle sub-menu"
                                    >
                                        {isContentOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </button>
                                )}
                            </div>
                            {item.subItems && isContentOpen && (
                                <div className="ml-6 mt-1 flex flex-col gap-1 border-l pl-2">
                                    {item.subItems.map((sub) => (
                                        <Link
                                            key={sub.href}
                                            href={sub.href}
                                            className={cn(
                                                "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all hover:text-primary",
                                                pathname === sub.href
                                                    ? "bg-muted text-primary"
                                                    : "text-muted-foreground"
                                            )}
                                        >
                                            <sub.icon className="h-3.5 w-3.5" />
                                            {sub.label}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    <Button
                        variant="ghost"
                        className="justify-start gap-3 mt-auto text-muted-foreground hover:text-destructive"
                        onClick={logout}
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </Button>
                </nav>
            </aside>
            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                <SettingsProvider>
                    <FinanceProvider>
                        {children}
                    </FinanceProvider>
                </SettingsProvider>
            </main>
        </div>
    );
}
