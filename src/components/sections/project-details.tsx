"use client";

import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/layout/section";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Heart, Share2 } from "lucide-react";
import Link from "next/link";
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
                            Image: {project.title}
                        </div>
                        <div className="flex flex-col justify-center space-y-4">
                            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                                {project.title}
                            </h1>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span>Raised: ${project.raised.toLocaleString()}</span>
                                    <span>Goal: ${project.goal.toLocaleString()}</span>
                                </div>
                                <div className="h-4 w-full rounded-full bg-secondary/20">
                                    <div
                                        className="h-full rounded-full bg-secondary transition-all"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-right text-sm text-muted-foreground">{Math.round(progress)}% Funded</p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <Button asChild size="lg" className="flex-1 bg-gradient-to-r from-blue-600 to-pink-500">
                                    <Link href="/donate">
                                        Donate Now <Heart className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button variant="outline" size="lg" className="flex-1">
                                    Share Project <Share2 className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Content Section */}
            <Section>
                <div className="grid gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-8">
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

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Impact Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                                    <p className="text-sm">Directly supports local communities</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                                    <p className="text-sm">Transparent fund utilization</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                                    <p className="text-sm">Regular updates for donors</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </Section>
        </div>
    );
}
