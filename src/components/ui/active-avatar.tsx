import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ActiveAvatarProps {
    lastActiveAt?: number;
    src?: string;
    alt?: string;
    fallbackText?: string | React.ReactNode;
    className?: string;
    /** Controls the size of the green indicator dot. Defaults to 'md'. */
    dotSize?: "sm" | "md" | "lg";
}

export function ActiveAvatar({ lastActiveAt, src, alt, fallbackText, className = "", dotSize = "md" }: ActiveAvatarProps) {
    // A user is considered online if they were active in the last 10 minutes
    const isOnline = lastActiveAt && (Date.now() - lastActiveAt) <= 10 * 60 * 1000;

    const dotClasses: Record<string, string> = {
        sm: "h-2 w-2 ring-1",
        md: "h-3 w-3 ring-2",
        lg: "h-4 w-4 ring-2",
    };

    return (
        <div className="relative inline-block shrink-0">
            <Avatar className={className}>
                <AvatarImage src={src || undefined} alt={alt || "User Avatar"} />
                <AvatarFallback>
                    {fallbackText || "?"}
                </AvatarFallback>
            </Avatar>
            {isOnline && (
                <span
                    className={`absolute bottom-0 left-0 block rounded-full bg-green-500 ring-white dark:ring-slate-950 shadow-sm animate-pulse z-10 ${dotClasses[dotSize]}`}
                    title="Online now"
                />
            )}
        </div>
    );
}
