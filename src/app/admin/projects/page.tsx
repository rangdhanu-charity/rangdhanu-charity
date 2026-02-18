"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/lib/data-context";
import { Edit, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

export default function ProjectsManager() {
    const { projects, deleteProject } = useData();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
                <Button asChild>
                    <Link href="/admin/projects/new">
                        <Plus className="mr-2 h-4 w-4" /> Add Project
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4">
                {projects.map((project) => (
                    <Card key={project.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-lg font-bold">{project.title}</CardTitle>
                            <div className="flex gap-2">
                                <Button variant="outline" size="icon" asChild>
                                    <Link href={`/admin/projects/${project.id}`}>
                                        <Edit className="h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => {
                                        if (confirm("Are you sure you want to delete this project?")) {
                                            deleteProject(project.id);
                                        }
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{project.description}</p>
                            <div className="flex justify-between text-sm">
                                <span>Raised: ${project.raised}</span>
                                <span>Goal: ${project.goal}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
