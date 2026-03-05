"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AlertTriangle, CheckCircle2, Megaphone, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

interface BannerData {
    id: string;
    isActive: boolean;
    bannerType?: "text" | "image";
    // Text banner
    message: string;
    linkUrl: string;
    linkText: string;
    theme: "info" | "warning" | "success";
    // Image banner
    imageUrl?: string;
    imageLinkUrl?: string;
    imageLinkTarget?: string;
    // Common
    targetPage: "all" | "home" | "profile" | "donate" | "projects" | "stories" | "about";
    expiresAt?: string;
}

// Human-readable labels matching the admin's LINK_TARGET_OPTIONS
const LINK_TARGET_LABELS: Record<string, string> = {
    donate: "Donate Now",
    login: "Login",
    register: "Register",
    projects: "View Projects",
    stories: "View Stories",
    about: "About Us",
    contact: "Contact Us",
    url: "Learn More",
};

const SESSION_KEY = "rangdhanu_banners_dismissed";

function getSessionDismissed(): Set<string> {
    if (typeof window === "undefined") return new Set();
    try {
        return new Set(JSON.parse(sessionStorage.getItem(SESSION_KEY) || "[]"));
    } catch {
        return new Set();
    }
}

function saveSessionDismissed(set: Set<string>) {
    if (typeof window !== "undefined") {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(Array.from(set)));
    }
}

export function PublicBanner() {
    const [banners, setBanners] = useState<BannerData[]>([]);
    const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());
    const [isLoaded, setIsLoaded] = useState(false);
    const [activeImageBannerId, setActiveImageBannerId] = useState<string | null>(null);

    const pathname = usePathname();

    useEffect(() => {
        setDismissedBanners(getSessionDismissed());

        const q = query(collection(db, "banners"), where("isActive", "==", true));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedBanners = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as BannerData[];
            setBanners(fetchedBanners);
            setIsLoaded(true);
        }, () => {
            setIsLoaded(true);
        });

        return () => unsubscribe();
    }, []);

    // Determine current page type
    let currentPageType = "other";
    if (pathname === "/") currentPageType = "home";
    else if (pathname.startsWith("/profile")) currentPageType = "profile";
    else if (pathname.startsWith("/donate")) currentPageType = "donate";
    else if (pathname.startsWith("/projects")) currentPageType = "projects";
    else if (pathname.startsWith("/stories")) currentPageType = "stories";
    else if (pathname.startsWith("/about")) currentPageType = "about";

    const isRelevantPage = (b: BannerData) =>
        b.targetPage === "all" || b.targetPage === currentPageType;

    const isVisible = (b: BannerData) => {
        if (dismissedBanners.has(b.id)) return false;
        if (b.expiresAt && new Date(b.expiresAt) < new Date()) return false;
        if (!isRelevantPage(b)) return false;
        return true;
    };

    const visibleTextBanners = banners.filter(b => (b.bannerType || "text") === "text" && isVisible(b));
    const visibleImageBanners = banners.filter(b => b.bannerType === "image" && isVisible(b));

    // Show first image banner popup if none active
    useEffect(() => {
        if (!isLoaded) return;
        const first = visibleImageBanners[0];
        if (first && activeImageBannerId === null && !dismissedBanners.has(first.id)) {
            setActiveImageBannerId(first.id);
        }
    }, [isLoaded, visibleImageBanners.map(b => b.id).join(",")]);

    // 30-second auto-dismiss for text banners
    useEffect(() => {
        if (!isLoaded || visibleTextBanners.length === 0) return;
        const timer = setTimeout(() => {
            setDismissedBanners(prev => {
                const next = new Set(prev);
                visibleTextBanners.forEach(b => next.add(b.id));
                saveSessionDismissed(next);
                return next;
            });
        }, 30000);
        return () => clearTimeout(timer);
    }, [isLoaded, pathname, visibleTextBanners.length]);

    const handleDismiss = useCallback((id: string) => {
        setDismissedBanners(prev => {
            const next = new Set(prev);
            next.add(id);
            saveSessionDismissed(next);
            return next;
        });
        if (activeImageBannerId === id) {
            setActiveImageBannerId(null);
            const remaining = visibleImageBanners.filter(b => b.id !== id && !dismissedBanners.has(b.id));
            if (remaining.length > 0) {
                setTimeout(() => setActiveImageBannerId(remaining[0].id), 300);
            }
        }
    }, [activeImageBannerId, visibleImageBanners, dismissedBanners]);

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

    const activeImageBanner = visibleImageBanners.find(b => b.id === activeImageBannerId);

    // Derive human-readable CTA label from banner config
    const getCtaLabel = (b: BannerData): string => {
        if (!b.imageLinkTarget) return "";
        if (b.imageLinkTarget === "url") {
            // Use the raw URL host as fallback
            try {
                return new URL(b.imageLinkUrl || "").hostname || "Learn More";
            } catch {
                return "Learn More";
            }
        }
        return LINK_TARGET_LABELS[b.imageLinkTarget] || "Learn More";
    };

    return (
        <>
            {/* ── Text Banners ─────────────────────────────── */}
            {isLoaded && visibleTextBanners.length > 0 && (
                <div className="w-full relative z-50 flex flex-col">
                    {visibleTextBanners.map(banner => (
                        <div
                            key={banner.id}
                            className={`relative w-full transition-all duration-300 ${themeStyles[banner.theme] || themeStyles.info}`}
                        >
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
            )}

            {/* ── Image Banner (Premium Poster Popup) ──────── */}
            <AnimatePresence>
                {activeImageBanner && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            key="img-banner-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md"
                            onClick={() => handleDismiss(activeImageBanner.id)}
                        />

                        {/* Poster Card */}
                        <motion.div
                            key="img-banner-popup"
                            initial={{ opacity: 0, scale: 0.85, y: 32 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.85, y: 32 }}
                            transition={{ type: "spring", stiffness: 260, damping: 24 }}
                            className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-8 pointer-events-none"
                        >
                            <div
                                className="relative pointer-events-auto w-full max-w-md rounded-3xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/10 bg-white dark:bg-slate-900"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Close button */}
                                <button
                                    onClick={() => handleDismiss(activeImageBanner.id)}
                                    className="absolute top-3 right-3 z-20 flex items-center justify-center h-9 w-9 rounded-full bg-black/50 text-white hover:bg-black/80 active:scale-90 transition-all shadow-lg backdrop-blur-sm"
                                    aria-label="Close banner"
                                >
                                    <X className="h-4 w-4" />
                                </button>

                                {/* Poster Image */}
                                <div className="relative">
                                    {activeImageBanner.linkUrl ? (
                                        <Link
                                            href={activeImageBanner.linkUrl}
                                            onClick={() => handleDismiss(activeImageBanner.id)}
                                        >
                                            <img
                                                src={activeImageBanner.imageUrl}
                                                alt="Event Poster"
                                                className="w-full h-auto block object-cover max-h-[55vh] cursor-pointer"
                                            />
                                        </Link>
                                    ) : (
                                        <img
                                            src={activeImageBanner.imageUrl}
                                            alt="Event Poster"
                                            className="w-full h-auto block object-cover max-h-[55vh]"
                                        />
                                    )}
                                </div>

                                {/* Card Footer */}
                                <div className="px-5 py-4 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
                                    <p className="text-xs text-muted-foreground">
                                        Tap outside or <span className="font-semibold">×</span> to dismiss
                                    </p>

                                    {activeImageBanner.linkUrl && (
                                        <Link
                                            href={activeImageBanner.linkUrl}
                                            onClick={() => handleDismiss(activeImageBanner.id)}
                                            className="shrink-0 inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-full shadow transition-all hover:shadow-md active:scale-95"
                                        >
                                            {getCtaLabel(activeImageBanner)}
                                            <span aria-hidden>→</span>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
