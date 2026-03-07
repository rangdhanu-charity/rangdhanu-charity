import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ActiveAvatarProps {
    lastActiveAt?: number;
    src?: string;
    alt?: string;
    fallbackUrl?: string;
    fallbackText?: string | React.ReactNode;
    className?: string;
}

export function ActiveAvatar({ lastActiveAt, src, alt, fallbackText, className = "" }: ActiveAvatarProps) {
    // A user is considered online if they were active in the last 10 minutes
    const isOnline = lastActiveAt && (Date.now() - lastActiveAt) <= 10 * 60 * 1000;

    return (
        <div className="relative inline-block">
            <Avatar className={className}>
                <AvatarImage src={src || undefined} alt={alt || "User Avatar"} />
                <AvatarFallback className={className.includes("text-") ? "" : "text-primary/70"}>
                    {fallbackText || "?"}
                </AvatarFallback>
            </Avatar>
            {isOnline && (
                <span className="absolute bottom-0 right-0 md:-bottom-0.5 md:-right-0.5 block h-3 w-3 md:h-4 md:w-4 rounded-full bg-green-500 ring-2 ring-white dark:ring-slate-950 shadow-sm animate-pulse z-10" />
            )}
        </div>
    );
}
