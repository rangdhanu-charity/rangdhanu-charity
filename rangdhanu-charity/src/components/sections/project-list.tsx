"use client";

import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Section } from "@/components/layout/section";

export function ProjectList() {
    const { projects } = useData();

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
                <Card key={project.id} className="flex flex-col overflow-hidden transition-all hover:shadow-lg">
                    <div className="relative aspect-video w-full overflow-hidden bg-muted">
                        {/* Placeholder for project image */}
                        <div className="flex items-center justify-center h-full text-muted-foreground bg-gray-200 dark:bg-gray-800">
                            Image: {project.title}
                        </div>
                    </div>
                    <CardHeader>
                        <CardTitle className="line-clamp-1">{project.title}</CardTitle>
                        <CardDescription className="line-clamp-2">{project.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Raised: ${project.raised}</span>
                                <span className="font-medium text-primary">Goal: ${project.goal}</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-secondary/20">
                                <div
                                    className="h-full rounded-full bg-secondary transition-all"
                                    style={{ width: `${Math.min(100, (project.raised / project.goal) * 100)}%` }}
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full">
                            <Link href={`/projects/${project.id}`}>View Details <ArrowRight className="ml-2 h-4 w-4" /></Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}
