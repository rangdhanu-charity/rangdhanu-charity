"use client";

import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Section } from "@/components/layout/section";

export function ProjectList() {
    const { projects, isLoading } = useData();

    if (isLoading) {
        return <div className="text-center py-12">Loading projects...</div>;
    }
    const activeProjects = projects.filter(p => p.status !== "completed");
    const completedProjects = projects.filter(p => p.status === "completed");

    return (
        <div className="space-y-16">
            {activeProjects.length > 0 && (
                <div className="space-y-6">
                    <h2 className="text-3xl font-bold tracking-tighter text-center sm:text-left">Active Projects</h2>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {activeProjects.map((project) => (
                            <Card key={project.id} className="flex flex-col overflow-hidden transition-all hover:shadow-lg border-primary/20">
                                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                                    {project.image && project.image !== "/images/placeholder.jpg" ? (
                                        <Image src={project.image} alt={project.title} fill className="object-cover transition-transform hover:scale-105 duration-500" unoptimized />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground bg-gray-200 dark:bg-gray-800">
                                            No Image
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                                        Active
                                    </div>
                                </div>
                                <CardHeader>
                                    <CardTitle className="line-clamp-1">{project.title}</CardTitle>
                                    <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    {project.goal > 0 ? (
                                        <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full font-medium text-xs">
                                            Project Goal: ৳{project.goal}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground italic">Upcoming Event</div>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button asChild className="w-full">
                                        <Link href={`/projects/${project.id}`}>View Details <ArrowRight className="ml-2 h-4 w-4" /></Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {completedProjects.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-px bg-border flex-1" />
                        <h2 className="text-2xl font-semibold tracking-tight text-muted-foreground">Past Completed Projects</h2>
                        <div className="h-px bg-border flex-1" />
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 opacity-90">
                        {completedProjects.map((project) => (
                            <Card key={project.id} className="flex flex-col overflow-hidden transition-all hover:shadow-md bg-muted/30">
                                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                                    {project.image && project.image !== "/images/placeholder.jpg" ? (
                                        <Image src={project.image} alt={project.title} fill className="object-cover grayscale transition-transform hover:scale-105 duration-500" unoptimized />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground bg-gray-200 dark:bg-gray-800 grayscale">
                                            No Image
                                        </div>
                                    )}
                                    <div className="absolute top-2 right-2 bg-green-600/90 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                                        Completed
                                    </div>
                                </div>
                                <CardHeader>
                                    <CardTitle className="line-clamp-1">{project.title}</CardTitle>
                                    <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    {project.goal > 0 ? (
                                        <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full font-medium text-xs">
                                            Project Goal: ৳{project.goal}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-green-600 dark:text-green-400 font-medium">Successfully Completed</div>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button asChild variant="outline" className="w-full bg-background">
                                        <Link href={`/projects/${project.id}`}>Read Report <ArrowRight className="ml-2 h-4 w-4" /></Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
