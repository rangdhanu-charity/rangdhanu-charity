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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative z-10 w-full max-w-md bg-background border border-border shadow-2xl rounded-2xl overflow-hidden"
                    >
                        {/* Header Banner */}
                        <div className="bg-destructive/10 border-b border-destructive/20 p-6 flex flex-col items-center justify-center text-center">
                            <div className="h-16 w-16 bg-destructive/20 text-destructive rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="h-8 w-8" />
                            </div>
                            <h2 className="text-xl font-bold text-foreground">Session Expiring Soon</h2>
                            <p className="text-sm text-muted-foreground mt-2 max-w-[280px]">
                                For your security, you will be automatically logged out due to inactivity.
                            </p>
                        </div>

                        {/* Countdown Body */}
                        <div className="p-8 flex flex-col items-center justify-center bg-card">
                            <div className="relative flex items-center justify-center">
                                {/* Pulsing background ring */}
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="absolute inset-0 bg-red-100 dark:bg-red-900/40 rounded-full blur-xl"
                                />

                                <div className="relative z-10 flex flex-col items-center justify-center h-40 w-40 rounded-full border-4 border-destructive/30 bg-background shadow-inner">
                                    <Clock className="h-6 w-6 text-destructive mb-2" />
                                    <span className="text-5xl font-mono font-bold tracking-tighter text-destructive">
                                        {formatTime(countdown)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 bg-muted/30 border-t border-border flex flex-col sm:flex-row gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 order-2 sm:order-1"
                                onClick={performLogout}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Log Out Now
                            </Button>
                            <Button
                                className="flex-1 order-1 sm:order-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-primary/25 transition-all"
                                onClick={handleStayLoggedIn}
                            >
                                Stay Logged In
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
