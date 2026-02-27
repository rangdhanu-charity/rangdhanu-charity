"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Section } from "@/components/layout/section";
import Image from "next/image";
import { CalendarIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Story {
    id: string;
    title: string;
    content: string;
    photoURL?: string;
    createdAt: string;
    createdBy: string;
}

export default function StoriesPage() {
    const [stories, setStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="relative bg-primary text-primary-foreground py-20 md:py-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-blue-800 opacity-90" />
                <div className="container relative z-10 px-4 md:px-6 text-center">
                    <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl mb-4">
                        Stories of Impact
                    </h1>
                    <p className="mx-auto max-w-[700px] text-primary-foreground/80 md:text-lg">
                        Real stories of change, hope, and community resilience powered by your support.
                    </p>
                </div>
            </section>

            <Section>
                <div className="container px-4 md:px-6 max-w-5xl mx-auto">
                    {isLoading ? (
                        <div className="flex flex-col space-y-8 animate-pulse">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-64 bg-muted rounded-xl w-full" />
                            ))}
                        </div>
                    ) : stories.length === 0 ? (
                        <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed">
                            <h3 className="text-2xl font-semibold tracking-tight mb-2">No Stories Yet</h3>
                            <p className="text-muted-foreground">Check back soon for inspiring updates from our team on the ground.</p>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {stories.map((story) => (
                                <Card key={story.id} className="overflow-hidden border-none shadow-md hover:shadow-xl transition-shadow bg-card/50">
                                    {story.photoURL && (
                                        <div className="relative w-full aspect-[21/9] bg-muted overflow-hidden group">
                                            {/* We apply the specific aesthetic filters requested by the user to match the hero gallery environment */}
                                            <Image
                                                src={story.photoURL}
                                                alt={story.title}
                                                fill
                                                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                                sizes="(max-width: 768px) 100vw, 1024px"
                                                unoptimized
                                                style={{
                                                    // Aesthetic Filter to match the "Clean & Airy" environment setup previously
                                                    filter: "brightness(1.05) contrast(1.05) saturate(1.1)"
                                                }}
                                            />
                                            {/* Slight overlay for visual blending */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                                        </div>
                                    )}
                                    <CardContent className="p-6 md:p-8">
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                                            <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                                                <CalendarIcon className="h-4 w-4" />
                                                <span>{new Date(story.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 opacity-80">
                                                <UserIcon className="h-4 w-4" />
                                                <span>By {story.createdBy}</span>
                                            </div>
                                        </div>
                                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4 text-foreground/90">
                                            {story.title}
                                        </h2>
                                        <div className="prose prose-blue dark:prose-invert max-w-none">
                                            {story.content.split('\n').map((paragraph, index) => (
                                                <p key={index} className="mb-4 text-muted-foreground leading-relaxed text-lg">
                                                    {paragraph}
                                                </p>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </Section>
        </div>
    );
}
