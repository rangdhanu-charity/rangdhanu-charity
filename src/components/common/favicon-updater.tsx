"use client";

import { useEffect } from "react";
import { useSettings } from "@/lib/settings-context";

/**
 * Dynamically updates the browser tab favicon to match the org logo.
 * Falls back to /favicon.ico when no logo is set.
 */
export function FaviconUpdater() {
    const { settings } = useSettings();
    const orgLogoURL = settings?.orgLogoURL || "";

    useEffect(() => {
        // Find or create the <link rel="icon"> element
        let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
        if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
        }

        if (orgLogoURL) {
            link.href = orgLogoURL;
            link.type = "image/png";
        } else {
            // Revert to default favicon
            link.href = "/favicon.ico";
            link.type = "image/x-icon";
        }
    }, [orgLogoURL]);

    return null; // Renders nothing
}
