"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useData } from "@/lib/data-context";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { projects, updateProject } = useData();
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        goal: 0,
        raised: 0,
        image: "",
    });

    useEffect(() => {
        const project = projects.find(p => p.id === id);
        if (project) {
            setFormData({
                title: project.title,
                description: project.description,
                goal: project.goal,
                raised: project.raised,
                image: project.image || "/images/placeholder.jpg",
            });
        }
    }, [id, projects]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateProject(id, formData);
        router.push("/admin/projects");
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/admin/projects">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h2 className="text-3xl font-bold tracking-tight">Edit Project</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label>Title</label>
                            <Input
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label>Description</label>
                            <textarea
                                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label>Goal Amount ($)</label>
                                <Input
                                    type="number"
                                    value={formData.goal}
                                    onChange={(e) => setFormData({ ...formData, goal: Number(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label>Raised Amount ($)</label>
                                <Input
                                    type="number"
                                    value={formData.raised}
                                    onChange={(e) => setFormData({ ...formData, raised: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <Button type="submit">Update Project</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
