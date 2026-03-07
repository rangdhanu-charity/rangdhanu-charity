import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ActiveAvatarProps {
    lastActiveAt?: number;
    src?: string;
    alt?: string;
    fallbackText?: string | React.ReactNode;
    className?: string;
    /** Controls the size of the green indicator dot.
     *  sm = small avatars (table rows), md = medium (member grid), lg = large (profile sidebar) */
    dotSize?: "sm" | "md" | "lg";
}

export function ActiveAvatar({
    lastActiveAt,
    src,
    alt,
    fallbackText,
    className = "",
    dotSize = "md",
}: ActiveAvatarProps) {
    const isOnline = lastActiveAt && (Date.now() - lastActiveAt) <= 10 * 60 * 1000;

    // Size classes for the dot itself.
    // Positioning mirrors the top-contributor badge pattern:
    // badge: "absolute bottom-1 right-1 translate-x-1/4 translate-y-1/4"
    // dot (bottom-left): "absolute bottom-1 left-1 -translate-x-1/4 translate-y-1/4"
    const dotSizeClasses: Record<string, string> = {
        // small avatars (h-8 w-8) in tables — dot 3×3 with ring-1
        sm: "h-3 w-3 ring-[2px]",
        // medium avatars (h-12 w-12) in member grid — dot 3.5×3.5
        md: "h-3.5 w-3.5 ring-2",
        // large avatars (h-24/h-32) in profile sidebar — dot 5×5
        lg: "h-5 w-5 ring-2",
    };

    return (
        <div className="relative inline-block shrink-0">
            <Avatar className={className}>
                <AvatarImage src={src || undefined} alt={alt || "User"} />
                <AvatarFallback>{fallbackText || "?"}</AvatarFallback>
            </Avatar>
            {isOnline && (
                <span
                    title="Online now"
                    className={`absolute bottom-1 left-1 -translate-x-1/4 translate-y-1/4 block rounded-full bg-green-500 ring-white dark:ring-slate-950 shadow animate-pulse z-10 ${dotSizeClasses[dotSize]}`}
                />
            )}
        </div>
    );
}
