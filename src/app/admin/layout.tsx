"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Heart, LayoutDashboard, FolderOpen, Users, LogOut, BarChart3, MessageSquareQuote } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isLoading) {
            if (!user || (user.role !== "admin" && user.role !== "moderator")) {
                router.push("/login");
            }
        }
    }, [user, isLoading, router]);

    if (isLoading) return <div className="p-8">Loading...</div>;

    if (!user || (user.role !== "admin" && user.role !== "moderator")) return null;

    const sidebarItems = [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/projects", label: "Projects", icon: FolderOpen },
        { href: "/admin/users", label: "Users", icon: Users },
    ];

    return (
        <div className="flex min-h-screen flex-col md:flex-row">
            <aside className="w-full border-r bg-muted/40 md:w-64 md:min-h-screen">
                <div className="flex h-16 items-center border-b px-6">
                    <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
                        <Heart className="h-5 w-5 fill-current" />
                        <span>Rangdhanu Admin</span>
                    </Link>
                </div>
                <nav className="flex flex-col gap-2 p-4">
                    {sidebarItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
                                pathname === item.href
                                    ? "bg-muted text-primary"
                                    : "text-muted-foreground"
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                        </Link>
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
                {children}
            </main>
        </div>
    );
}
