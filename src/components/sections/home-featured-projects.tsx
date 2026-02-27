"use client";

import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Section } from "@/components/layout/section";

export function HomeFeaturedProjects() {
    const { projects, isLoading } = useData();

    if (isLoading) {
        return (
            <Section id="projects">
                <div className="container px-4 md:px-6">
                    <div className="flex flex-col items-center justify-center space-y-4 text-center">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Our Projects</h2>
                            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                                Loading projects...
                            </p>
                        </div>
                    </div>
                </div>
            </Section>
        );
    }

    const featuredProjects = projects.filter(p => p.status !== "completed").slice(0, 3); // Show top 3 active

    return (
        <Section id="projects">
            <div className="flex flex-col items-center justify-center gap-4 text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Our Active Projects</h2>
                <p className="max-w-[700px] text-muted-foreground">
                    We are currently running these projects to support our mission. Join us by donating or volunteering.
                </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {featuredProjects.map((project) => (
                    <Card key={project.id} className="flex flex-col overflow-hidden transition-all hover:shadow-lg">
                        <div className="relative aspect-video w-full overflow-hidden bg-muted">
                            {project.image && project.image !== "/images/placeholder.jpg" ? (
                                <Image src={project.image} alt={project.title} fill className="object-cover transition-transform hover:scale-105 duration-500" unoptimized />
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground bg-gray-200 dark:bg-gray-800">
                                    No Image
                                </div>
                            )}
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
            <div className="mt-12 flex justify-center">
                <Button asChild variant="ghost" size="lg">
                    <Link href="/projects">View All Projects <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
            </div>
        </Section>
    );
}
