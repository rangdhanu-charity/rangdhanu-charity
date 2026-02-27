"use client";

import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/layout/section";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Heart, Share2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";

export function ProjectDetails() {
    const { projects, isLoading } = useData();
    const params = useParams();
    const id = params.id as string;

    if (isLoading) {
        return <div className="container py-20 text-center">Loading project details...</div>;
    }

    const project = projects.find((p) => p.id === id);

    if (!project) {
        return (
            <div className="container py-20 text-center">
                <h1 className="text-4xl font-bold">Project Not Found</h1>
                <Button asChild className="mt-8">
                    <Link href="/projects">Back to Projects</Link>
                </Button>
            </div>
        );
    }

    const progress = Math.min(100, (project.raised / project.goal) * 100);

    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="relative bg-muted py-12 md:py-20">
                <div className="container px-4">
                    <Button asChild variant="ghost" className="mb-8">
                        <Link href="/projects">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
                        </Link>
                    </Button>
                    <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
                        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-muted-foreground">
                            {project.image && project.image !== "/images/placeholder.jpg" ? (
                                <Image src={project.image} alt={project.title} fill className="object-cover" unoptimized />
                            ) : (
                                <span>No Image</span>
                            )}
                        </div>
                        <div className="flex flex-col justify-center space-y-4">
                            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                                {project.title}
                            </h1>
                            <div className="space-y-2">
                                <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full font-medium text-sm">
                                    Project Goal: ৳{project.goal?.toLocaleString() || 0}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Content Section */}
            <Section>
                <div className="max-w-4xl mx-auto space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>About This Project</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {project.description}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </Section>
        </div>
    );
}
