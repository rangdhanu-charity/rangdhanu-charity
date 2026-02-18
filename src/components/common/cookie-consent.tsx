"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import Link from "next/link";

export function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem("cookie_consent");
        if (!consent) {
            setIsVisible(true);
        }
    }, []);

    const acceptCookies = () => {
        localStorage.setItem("cookie_consent", "true");
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t p-4 shadow-lg md:flex md:items-center md:justify-between md:px-8">
            <div className="flex flex-col gap-2 md:max-w-3xl">
                <p className="text-sm text-foreground">
                    We use cookies to improve your experience on our site. By using our site, you consent to cookies.
                    <Link href="/privacy" className="underline ml-1 hover:text-primary">
                        Learn more
                    </Link>.
                </p>
            </div>
            <div className="mt-4 flex gap-4 md:mt-0">
                <Button onClick={acceptCookies} className="whitespace-nowrap">
                    Accept
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setIsVisible(false)} aria-label="Close">
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
