"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

const TIMEOUT_DURATION = 5 * 60 * 1000; // 5 minutes
const WARNING_DURATION = 1 * 60 * 1000; // 1 minute warning before timeout
const IDLE_TIME_BEFORE_WARNING = TIMEOUT_DURATION - WARNING_DURATION;

export function SessionTimeout() {
    const { user, logout } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [isWarningRef, setIsWarningRef] = useState(false);
    const [countdown, setCountdown] = useState(WARNING_DURATION / 1000);

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
            await logout();
            toast({
                title: "Session Expired",
                description: "You have been logged out due to inactivity.",
                variant: "destructive",
            });
            router.push("/");
        }
    }, [logout, router, toast, cleanupTimers]);

    const resetTimer = useCallback(() => {
        // Don't do anything if not logged in
        if (!stateRef.current.user) return;

        cleanupTimers();

        // If we were in warning state and user acted, dismiss warning
        if (stateRef.current.isWarning) {
            stateRef.current.isWarning = false;
            setIsWarningRef(false);
            // Hide the toast if possible (Toaster component handles its own display, 
            // but we reset the state)
            toast({
                title: "Session Extended",
                description: "Your session has been extended.",
            });
        }

        // Set timer for when to show warning
        idleTimerRef.current = setTimeout(() => {
            stateRef.current.isWarning = true;
            setIsWarningRef(true);
            setCountdown(WARNING_DURATION / 1000);

            // Show warning toast
            toast({
                title: "Inactivity Warning",
                description: "You will be logged out in 1 minute due to inactivity. Move your mouse or press any key to stay logged in.",
                variant: "destructive",
                duration: WARNING_DURATION, // Keep toast open for the entire duration
                action: <ToastAction altText="Stay logged in">Stay Logged In</ToastAction>,
            });

            // Start countdown ticker for UI (optional, good for advanced custom dialogs)
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

    useEffect(() => {
        // Only run if user is logged in
        if (!user) {
            cleanupTimers();
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

    // This component doesn't render any persistent UI itself.
    // It relies on the global toaster to show the warning.
    return null;
}
