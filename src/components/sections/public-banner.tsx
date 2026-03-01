"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AlertTriangle, CheckCircle2, Megaphone, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface BannerData {
    id: string;
    isActive: boolean;
    message: string;
    linkUrl: string;
    linkText: string;
    theme: "info" | "warning" | "success";
    targetPage: "all" | "home" | "profile" | "donate" | "projects" | "stories" | "about";
    expiresAt?: string;
}

export function PublicBanner() {
    const [banners, setBanners] = useState<BannerData[]>([]);
    const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());
    const [isLoaded, setIsLoaded] = useState(false);

    // We need to know where we are to filter banners correctly
    const pathname = usePathname();

    useEffect(() => {
        // Load dismissed IDs from session storage
        if (typeof window !== "undefined") {
            try {
                const sessionDismissed = JSON.parse(sessionStorage.getItem("rangdhanu_banners_dismissed") || "[]");
                setDismissedBanners(new Set(sessionDismissed));
            } catch (e) {
                // Ignore parse errors
            }
        }

        // Only query Active Banners to save reads
        const q = query(collection(db, "banners"), where("isActive", "==", true));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedBanners = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as BannerData[];

            setBanners(fetchedBanners);
            setIsLoaded(true);
        }, (error) => {
            console.error("Error fetching public banners:", error);
            setIsLoaded(true);
        });

        return () => unsubscribe();
    }, []);

    // 30-Second Auto-Dismiss on Page Load Logic
    // We will find all currently visible banners, and after 30s, add them to dismissed.
    useEffect(() => {
        if (!isLoaded || banners.length === 0) return;

        const timer = setTimeout(() => {
            setDismissedBanners(prev => {
                const newlyDismissed = new Set(prev);
                visibleBanners.forEach(b => newlyDismissed.add(b.id));

                if (typeof window !== "undefined") {
                    sessionStorage.setItem("rangdhanu_banners_dismissed", JSON.stringify(Array.from(newlyDismissed)));
                }
                return newlyDismissed;
            });
        }, 30000); // 30 seconds

        return () => clearTimeout(timer);
    }, [isLoaded, banners, pathname]); // Re-run when page changes so 30s timer restarts for new page's banners

    if (!isLoaded || banners.length === 0) {
        return null;
    }

    // Determine current page type based on Pathname
    let currentPageType = "all";
    if (pathname === "/") currentPageType = "home";
    else if (pathname.startsWith("/profile")) currentPageType = "profile";
    else if (pathname.startsWith("/donate")) currentPageType = "donate";
    else if (pathname.startsWith("/projects")) currentPageType = "projects";
    else if (pathname.startsWith("/stories")) currentPageType = "stories";
    else if (pathname.startsWith("/about")) currentPageType = "about";

    // Filter banners based on business logic
    const visibleBanners = banners.filter(b => {
        // 1. Is it dismissed by the user in this session?
        if (dismissedBanners.has(b.id)) return false;

        // 2. Has it expired server-side?
        if (b.expiresAt && new Date(b.expiresAt) < new Date()) return false;

        // 3. Does it target this page?
        if (b.targetPage !== "all" && b.targetPage !== currentPageType) return false;

        return true;
    });

    if (visibleBanners.length === 0) return null;

    const handleDismiss = (id: string) => {
        setDismissedBanners(prev => {
            const next = new Set(prev);
            next.add(id);
            if (typeof window !== "undefined") {
                sessionStorage.setItem("rangdhanu_banners_dismissed", JSON.stringify(Array.from(next)));
            }
            return next;
        });
    };

    const themeStyles = {
        warning: "bg-red-600 dark:bg-red-700 text-white border-b border-red-800",
        success: "bg-green-600 dark:bg-green-700 text-white border-b border-green-800",
        info: "bg-blue-600 dark:bg-blue-700 text-white border-b border-blue-800"
    };

    const linkStyles = {
        warning: "bg-white/20 hover:bg-white/30 text-white",
        success: "bg-white/20 hover:bg-white/30 text-white",
        info: "bg-white/20 hover:bg-white/30 text-white"
    };

    return (
        <div className="w-full relative z-50 flex flex-col">
            {visibleBanners.map(banner => (
                <div key={banner.id} className={`relative w-full transition-all duration-300 ${themeStyles[banner.theme] || themeStyles.info}`}>
                    <div className="container mx-auto px-4 py-3 sm:py-2 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 relative pr-10">
                        <div className="flex items-center gap-3 flex-1 min-w-0 justify-center sm:justify-start w-full">
                            <span className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-white/20">
                                {banner.theme === 'warning' && <AlertTriangle className="h-4 w-4" />}
                                {banner.theme === 'success' && <CheckCircle2 className="h-4 w-4" />}
                                {banner.theme === 'info' && <Megaphone className="h-4 w-4" />}
                            </span>
                            <p className="text-sm sm:text-base font-medium leading-tight text-center sm:text-left">
                                {banner.message}
                            </p>
                        </div>

                        {banner.linkUrl && banner.linkText && (
                            <div className="shrink-0 w-full sm:w-auto flex justify-center mt-1 sm:mt-0">
                                <Link
                                    href={banner.linkUrl}
                                    className={`text-xs sm:text-sm font-bold px-4 py-1.5 rounded-full transition-colors whitespace-nowrap inline-block ${linkStyles[banner.theme] || linkStyles.info}`}
                                >
                                    {banner.linkText}
                                </Link>
                            </div>
                        )}

                        <button
                            onClick={() => handleDismiss(banner.id)}
                            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/20 transition-colors opacity-80 hover:opacity-100"
                            aria-label="Dismiss banner"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
