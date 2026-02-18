import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SectionProps {
    children: ReactNode;
    className?: string;
    id?: string;
    background?: "default" | "muted" | "none";
}

export function Section({
    children,
    className,
    id,
    background = "default",
}: SectionProps) {
    return (
        <section
            id={id}
            className={cn(
                "py-16 md:py-24",
                background === "muted" && "bg-muted/50",
                className
            )}
        >
            <div className="container px-4 md:px-6">{children}</div>
        </section>
    );
}
