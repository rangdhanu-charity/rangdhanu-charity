"use client";

import { useEffect } from "react";
import { useSettings } from "@/lib/settings-context";

/**
 * Dynamically updates the browser tab favicon to match the org logo.
 * Draws the logo onto a canvas with a circular clip so the favicon is round.
 * Falls back to /favicon.ico when no logo is set.
 */
export function FaviconUpdater() {
    const { settings } = useSettings();
    const orgLogoURL = settings?.orgLogoURL || "";

    useEffect(() => {
        let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
        if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
        }

        if (!orgLogoURL) {
            link.href = "/favicon.ico";
            link.type = "image/x-icon";
            return;
        }

        // Draw logo as a circle on a canvas, then use as favicon
        const size = 64;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;

        const img = new Image();
        img.crossOrigin = "anonymous"; // needed for external URLs (ImgBB)
        img.onload = () => {
            // Clip to circle
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            // Draw image inside the circle
            ctx.drawImage(img, 0, 0, size, size);

            // Use canvas as favicon
            link!.href = canvas.toDataURL("image/png");
            link!.type = "image/png";
        };
        img.onerror = () => {
            // If image fails to load, just use the URL directly
            link!.href = orgLogoURL;
            link!.type = "image/png";
        };
        img.src = orgLogoURL;
    }, [orgLogoURL]);

    return null;
}
