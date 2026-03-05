"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { HomeDonateModal } from "./home-donate-modal";

/**
 * Wraps HomeDonateModal and auto-opens it when ?donate=true is in the URL.
 * Also renders the visible "Donate Now" button on the home page hero.
 */
export function AutoOpenDonateModal({ children }: { children?: React.ReactNode }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (searchParams.get("donate") === "true") {
            setIsOpen(true);
            // Clean up URL without full reload
            router.replace("/", { scroll: false });
        }
    }, [searchParams, router]);

    return (
        <HomeDonateModal open={isOpen} onOpenChange={setIsOpen}>
            {children}
        </HomeDonateModal>
    );
}
