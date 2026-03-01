"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Quote, MessageSquare, Trash2, Edit2, Send } from "lucide-react";

export function MemberTestimonialTab() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [testimonial, setTestimonial] = useState<any>(null);
    const [content, setContent] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!user) return;

        const fetchTestimonial = async () => {
            try {
                const docRef = doc(db, "testimonials", user.id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setTestimonial(docSnap.data());
                    setContent(docSnap.data().content);
                }
            } catch (error) {
                console.error("Error fetching testimonial:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTestimonial();
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        if (!content.trim()) {
            toast({ title: "Error", description: "Testimonial cannot be empty.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const docRef = doc(db, "testimonials", user.id);
            const dataToSave = {
                userId: user.id,
                name: user.name || "Member",
                photoURL: user.photoURL || null,
                role: user.roles?.[0] || "member",
                content: content.trim(),
                updatedAt: serverTimestamp(),
                // Keep the original created at if it exists
                ...(testimonial ? {} : { createdAt: serverTimestamp() }),
                isActive: true // Always true for now unless admins flag it
            };

            await setDoc(docRef, dataToSave, { merge: true });

            setTestimonial(dataToSave);
            setIsEditing(false);
            toast({ title: "Success", description: "Your testimonial has been saved and will appear publicly." });
        } catch (error) {
            console.error("Error saving testimonial:", error);
            toast({ title: "Error", description: "Failed to save. Please try again.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!user) return;
        if (!confirm("Are you sure you want to delete your testimonial? It will be removed from the public website.")) return;

        setIsSaving(true);
        try {
            await deleteDoc(doc(db, "testimonials", user.id));
            setTestimonial(null);
            setContent("");
            setIsEditing(false);
            toast({ title: "Deleted", description: "Your testimonial was removed successfully." });
        } catch (error) {
            console.error("Error deleting testimonial:", error);
            toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Voice of Change...</div>;
    }

    return (
        <Card className="min-w-0 max-w-full overflow-hidden border shadow-sm">
            <CardHeader className="bg-muted/30 pb-4 border-b">
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Voices of Change
                </CardTitle>
                <CardDescription>
                    Share your experience with Rangdhanu Charity Foundation. How has being part of this community impacted you or others? Your voice will inspire future members and display on our public page.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                {!testimonial || isEditing ? (
                    <div className="space-y-4">
                        <div className="relative">
                            <Quote className="absolute top-3 left-3 h-5 w-5 text-muted-foreground/30" />
                            <Textarea
                                placeholder="Write your thoughts..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="pl-10 min-h-[150px] resize-none text-base leading-relaxed p-4"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Note: Your display name and profile picture will be shown alongside this quote on the public home page and testimonials page.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-muted/20 p-6 rounded-lg relative overflow-hidden border border-muted/50">
                            <Quote className="absolute top-2 right-2 h-16 w-16 text-primary/5 rotate-180" />
                            <p className="text-lg leading-relaxed text-foreground italic relative z-10">"{testimonial.content}"</p>
                        </div>
                    </div>
                )}
            </CardContent>

            <CardFooter className="bg-muted/10 border-t px-6 py-4 flex justify-between sm:justify-end gap-3 flex-wrap">
                {!testimonial || isEditing ? (
                    <>
                        {testimonial && (
                            <Button variant="outline" onClick={() => {
                                setIsEditing(false);
                                setContent(testimonial.content); // Reset changes
                            }} disabled={isSaving}>
                                Cancel
                            </Button>
                        )}
                        <Button onClick={handleSave} disabled={isSaving || !content.trim()} className="flex-1 sm:flex-none">
                            <Send className="mr-2 h-4 w-4" /> {isSaving ? "Publishing..." : "Publish to Website"}
                        </Button>
                    </>
                ) : (
                    <>
                        <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={isSaving}>
                            <Trash2 className="mr-2 h-4 w-4" /> Remove
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditing(true)} disabled={isSaving}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit My Voice
                        </Button>
                    </>
                )}
            </CardFooter>
        </Card>
    );
}
