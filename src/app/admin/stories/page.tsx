"use client";

import { useState, useEffect, useRef } from "react";
import { collection, deleteDoc, doc, onSnapshot, query, addDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, Plus, Image as ImageIcon, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";

// Define the Story model
interface Story {
    id: string;
    title: string;
    content: string;
    photoURL?: string;
    createdAt: string;
    createdBy: string;
}

export default function StoriesManager() {
    const [stories, setStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user: currentUser } = useAuth();
    const { toast } = useToast();

    // Dialog state
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingStory, setEditingStory] = useState<Story | null>(null);
    const [formData, setFormData] = useState<{ title: string; content: string; photoURL: string }>({
        title: "",
        content: "",
        photoURL: ""
    });

    // Image upload state
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch Stories
    useEffect(() => {
        const q = query(collection(db, "stories"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Story[];

            // Sort by descending created date
            data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            setStories(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Handlers
    const handleOpenDialog = (story?: Story) => {
        if (story) {
            setEditingStory(story);
            setFormData({
                title: story.title,
                content: story.content,
                photoURL: story.photoURL || ""
            });
        } else {
            setEditingStory(null);
            setFormData({ title: "", content: "", photoURL: "" });
        }
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Are you sure you want to delete the story: "${title}"?`)) return;

        try {
            await deleteDoc(doc(db, "stories", id));
            toast({ title: "Story Deleted", description: "The story has been removed." });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete story.", variant: "destructive" });
        }
    };

    const handleSave = async () => {
        if (!formData.title || !formData.content) {
            toast({ title: "Validation Error", description: "Title and content are required.", variant: "destructive" });
            return;
        }

        try {
            if (editingStory) {
                // Update
                await updateDoc(doc(db, "stories", editingStory.id), {
                    title: formData.title,
                    content: formData.content,
                    photoURL: formData.photoURL
                });
                toast({ title: "Story Updated", description: "Changes saved successfully." });
            } else {
                // Create
                await addDoc(collection(db, "stories"), {
                    title: formData.title,
                    content: formData.content,
                    photoURL: formData.photoURL,
                    createdAt: new Date().toISOString(),
                    createdBy: currentUser?.name || currentUser?.username || "Admin"
                });
                toast({ title: "Story Created", description: "New story added successfully." });
            }
            setIsDialogOpen(false);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save story.", variant: "destructive" });
        }
    };

    // ImgBB Upload Handler
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
                setFormData(prev => ({ ...prev, photoURL: data.data.url }));
                toast({ title: "Photo Uploaded", description: "Photo successfully attached to story." });
            } else {
                toast({ title: "Upload Error", description: data.error?.message || "Failed to upload image.", variant: "destructive" });
            }
        } catch (error) {
            console.error("Error uploading story picture:", error);
            toast({ title: "Upload Failed", description: "Could not upload the image.", variant: "destructive" });
        } finally {
            setIsUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Stories</h2>
                    <p className="text-muted-foreground">Manage public incidents and organization stories.</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" /> Add Story
                </Button>
            </div>

            {isLoading ? (
                <div className="text-center py-12">Loading stories...</div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {stories.map((story) => (
                        <Card key={story.id} className="flex flex-col overflow-hidden">
                            {story.photoURL ? (
                                <div className="relative aspect-video w-full">
                                    <Image src={story.photoURL} alt={story.title} fill className="object-cover" unoptimized />
                                </div>
                            ) : (
                                <div className="relative aspect-video w-full bg-muted flex items-center justify-center">
                                    <ImageIcon className="text-muted-foreground h-8 w-8 opacity-50" />
                                </div>
                            )}
                            <CardHeader className="pb-2">
                                <CardTitle className="line-clamp-1 text-lg">{story.title}</CardTitle>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(story.createdAt).toLocaleDateString()}
                                </p>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-between">
                                <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                                    {story.content}
                                </p>
                                <div className="flex justify-end gap-2 mt-auto">
                                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(story)}>
                                        <Pencil className="h-4 w-4 mr-1" /> Edit
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDelete(story.id, story.title)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {stories.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                            No stories found. Create one to get started.
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingStory ? "Edit Story" : "Create New Story"}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Title</label>
                            <Input
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="E.g., Winter Clothes Distribution 2026"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Story Content</label>
                            <textarea
                                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.content}
                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                placeholder="Write the details of the story here..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Cover Photo</label>
                            {formData.photoURL ? (
                                <div className="relative aspect-video w-full rounded-md overflow-hidden bg-muted border">
                                    <Image src={formData.photoURL} alt="Cover Preview" fill className="object-cover" unoptimized />
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-8 w-8 opacity-80 hover:opacity-100"
                                        onClick={() => setFormData({ ...formData, photoURL: "" })}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center text-center gap-2 bg-muted/30 hover:bg-muted/50 transition-colors">
                                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Upload a photo to accompany this story</p>
                                    <Button
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
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={isUploadingImage || !formData.title || !formData.content}>
                            {editingStory ? "Save Changes" : "Publish Story"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
