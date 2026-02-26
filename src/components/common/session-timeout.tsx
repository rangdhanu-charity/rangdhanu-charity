"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const TIMEOUT_DURATION = 5 * 60 * 1000; // 5 minutes total
const WARNING_DURATION = 1 * 60 * 1000; // 1 minute warning before timeout
const IDLE_TIME_BEFORE_WARNING = TIMEOUT_DURATION - WARNING_DURATION;

export function SessionTimeout() {
    const { user, logout } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [isWarning, setIsWarning] = useState(false);
    const [countdown, setCountdown] = useState(WARNING_DURATION / 1000); // 60 seconds

    // Use refs for timers to easily clear them without causing re-renders
    const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
    const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Track state in refs to access within listeners and timeouts
    const stateRef = useRef({ isWarning: false, user: user });

    useEffect(() => {
        stateRef.current.user = user;
    }, [user]);

    const cleanupTimers = useCallback(() => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }, []);

    const performLogout = useCallback(async () => {
        cleanupTimers();
        if (stateRef.current.user) {
            stateRef.current.isWarning = false;
            setIsWarning(false);
            await logout();
            toast({
                title: "Session Expired",
                description: "You have been logged out due to inactivity.",
                variant: "destructive",
            });
            router.push("/");
        }
    }, [logout, router, toast, cleanupTimers]);

    const resetTimer = useCallback((e?: Event) => {
        // Don't do anything if not logged in
        if (!stateRef.current.user) return;

        // If warning is currently showing, DO NOT reset on background mouse movements
        // Only reset if they explicitly click "Stay Logged In" or if it wasn't showing yet
        if (stateRef.current.isWarning && e) {
            return;
        }

        cleanupTimers();

        // If we purposefully call this to dismiss warning
        if (stateRef.current.isWarning) {
            stateRef.current.isWarning = false;
            setIsWarning(false);
            toast({
                title: "Session Extended",
                description: "Your session has been extended.",
            });
        }

        // Set timer for when to show warning
        idleTimerRef.current = setTimeout(() => {
            stateRef.current.isWarning = true;
            setIsWarning(true);
            setCountdown(WARNING_DURATION / 1000); // Reset to 60

            // Show warning toast (optional, for initial notification)
            toast({
                title: "Inactivity Warning",
                description: "You will be logged out in 1 minute due to inactivity.",
                variant: "destructive",
            });

            // Start countdown ticker for UI
            countdownIntervalRef.current = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Set final timer to actually log out
            logoutTimerRef.current = setTimeout(() => {
                performLogout();
            }, WARNING_DURATION);

        }, IDLE_TIME_BEFORE_WARNING);

    }, [cleanupTimers, performLogout, toast]);

    const handleStayLoggedIn = () => {
        resetTimer();
    };

    useEffect(() => {
        // Only run if user is logged in
        if (!user) {
            cleanupTimers();
            setIsWarning(false);
            stateRef.current.isWarning = false;
            return;
        }

        // Initialize timers
        resetTimer();

        // Events to listen for activity
        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer, { passive: true });
        });

        // Cleanup
        return () => {
            cleanupTimers();
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [user, resetTimer, cleanupTimers]);

    // Format countdown timer (e.g., 60s -> 01:00)
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <AnimatePresence>
            {isWarning && (
                <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-[100] p-4 sm:p-0 pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="w-full max-w-sm pointer-events-auto bg-background/95 backdrop-blur-md border border-destructive/20 shadow-2xl rounded-2xl overflow-hidden"
                    >
                        {/* Compact Header & Body */}
                        <div className="p-5 flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                                <div className="h-10 w-10 bg-destructive/10 text-destructive rounded-full flex items-center justify-center">
                                    <AlertTriangle className="h-5 w-5" />
                                </div>
                            </div>

                            <div className="flex-1 space-y-1 relative">
                                <h2 className="text-base font-bold text-foreground">Session Expiring</h2>
                                <p className="text-sm text-muted-foreground leading-tight">
                                    You will be logged out due to inactivity in:
                                </p>

                                <div className="mt-3 flex items-center gap-2 bg-destructive/5 border border-destructive/10 rounded-lg p-2 w-fit">
                                    <Clock className="h-4 w-4 text-destructive animate-pulse" />
                                    <span className="text-xl font-mono font-extrabold tracking-tight text-destructive">
                                        {formatTime(countdown)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="px-5 pb-5 flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 border-destructive/20 hover:bg-destructive/5 text-muted-foreground hover:text-destructive"
                                onClick={performLogout}
                            >
                                <LogOut className="mr-2 h-3.5 w-3.5" />
                                Log Out
                            </Button>
                            <Button
                                size="sm"
                                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm"
                                onClick={handleStayLoggedIn}
                            >
                                Stay Logged In
                            </Button>
                        </div>

                        {/* Progress Bar under the card */}
                        <motion.div
                            className="h-1 bg-destructive/80"
                            initial={{ width: "100%" }}
                            animate={{ width: "0%" }}
                            transition={{ duration: WARNING_DURATION / 1000, ease: "linear" }}
                        />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
