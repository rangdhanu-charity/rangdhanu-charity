"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useData } from "@/lib/data-context";
import { ArrowLeft, Image as ImageIcon, X } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

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
        status: "active",
    });

    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploadingImage(true);
        try {
            const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
            if (!apiKey) {
                toast({ title: "Configuration Error", description: "ImgBB API Key is missing.", variant: "destructive" });
                return;
            }

            const uploadData = new FormData();
            uploadData.append("image", file);

            const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: "POST",
                body: uploadData
            });

            const data = await response.json();

            if (data.success) {
                setFormData(prev => ({ ...prev, image: data.data.url }));
                toast({ title: "Photo Uploaded", description: "Photo successfully attached to project." });
            } else {
                toast({ title: "Upload Error", description: data.error?.message || "Failed to upload image.", variant: "destructive" });
            }
        } catch (error) {
            console.error("Error uploading project picture:", error);
            toast({ title: "Upload Failed", description: "Could not upload the image.", variant: "destructive" });
        } finally {
            setIsUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    useEffect(() => {
        const project = projects.find(p => p.id === id);
        if (project) {
            setFormData({
                title: project.title,
                description: project.description,
                goal: project.goal || 0,
                raised: project.raised || 0,
                image: project.image || "/images/placeholder.jpg",
                status: project.status || "active",
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
                        <div className="space-y-2">
                            <label>Status</label>
                            <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active (Upcoming / Ongoing)</SelectItem>
                                    <SelectItem value="completed">Completed (Past Project)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label>Goal Amount (৳) [Optional]</label>
                            <Input
                                type="number"
                                value={formData.goal}
                                onChange={(e) => setFormData({ ...formData, goal: Number(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label>Cover Photo</label>
                            {formData.image && formData.image !== "/images/placeholder.jpg" ? (
                                <div className="relative aspect-video w-full rounded-md overflow-hidden bg-muted border">
                                    <Image src={formData.image} alt="Cover Preview" fill className="object-cover" unoptimized />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-8 w-8 opacity-80 hover:opacity-100"
                                        onClick={() => setFormData({ ...formData, image: "" })}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center text-center gap-2 bg-muted/30 hover:bg-muted/50 transition-colors">
                                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Upload a photo for this project</p>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        className="mt-2"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploadingImage}
                                    >
                                        {isUploadingImage ? "Uploading..." : "Select Image"}
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            )}
                        </div>
                        <Button type="submit" disabled={isUploadingImage}>Update Project</Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
