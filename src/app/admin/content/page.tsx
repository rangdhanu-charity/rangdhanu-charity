"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Megaphone, BookOpen } from "lucide-react";
import Link from "next/link";

export default function ContentHubPage() {
    const sections = [
        {
            title: "Announcements",
            description: "Manage public announcements and site banners.",
            icon: Megaphone,
            href: "/admin/announcements",
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            title: "Public Banner",
            description: "Configure global dynamic homepage alerts.",
            icon: Megaphone,
            href: "/admin/banner",
            color: "text-red-500",
            bg: "bg-red-500/10"
        },
        {
            title: "Stories",
            description: "Publish and manage impact stories, reports, and updates.",
            icon: BookOpen,
            href: "/admin/stories",
            color: "text-green-500",
            bg: "bg-green-500/10"
        },
        {
            title: "Projects",
            description: "Create and track ongoing or past charity campaigns.",
            icon: FolderOpen,
            href: "/admin/projects",
            color: "text-purple-500",
            bg: "bg-purple-500/10"
        }
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Content Hub</h2>
                <p className="text-muted-foreground">Centralized management for public-facing platform content.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sections.map((section) => (
                    <Link key={section.href} href={section.href} className="block group">
                        <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 relative overflow-hidden">
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className={`p-3 rounded-lg ${section.bg}`}>
                                    <section.icon className={`h-6 w-6 ${section.color}`} />
                                </div>
                                <div className="space-y-1">
                                    <CardTitle className="text-xl group-hover:text-primary transition-colors">{section.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-sm mt-2 leading-relaxed">{section.description}</CardDescription>
                            </CardContent>
                            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
