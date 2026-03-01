"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Quote } from "lucide-react";

interface TestimonialData {
    id: string;
    userId: string;
    name: string;
    photoURL: string | null;
    role: string;
    content: string;
    createdAt: any;
}

export function TestimonialsGrid() {
    const [testimonials, setTestimonials] = useState<TestimonialData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTestimonials = async () => {
            try {
                // Fetch all active testimonials
                const q = query(
                    collection(db, "testimonials"),
                    where("isActive", "==", true)
                );

                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as TestimonialData[];

                // Sort client-side to bypass composite index requirement
                data.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
                    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
                    return dateB.getTime() - dateA.getTime();
                });

                setTestimonials(data);
            } catch (error) {
                console.error("Error fetching testimonials:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTestimonials();
    }, []);

    if (isLoading) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <Card key={i} className="animate-pulse bg-muted/20 h-[200px] border-muted/30"></Card>
                ))}
            </div>
        );
    }

    if (testimonials.length === 0) {
        return (
            <div className="text-center py-20 px-4">
                <Quote className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold mb-2 text-foreground">No Voices Yet</h3>
                <p className="text-muted-foreground">
                    Check back later for inspiring community stories.
                    If you are a member, you can leave your voice from your profile dashboard!
                </p>
            </div>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
                <Card key={testimonial.id} className="bg-background relative overflow-hidden group hover:shadow-md transition-shadow border-muted/60">
                    <Quote className="absolute top-4 right-4 h-12 w-12 text-primary/5 rotate-180 transition-transform group-hover:scale-110" />
                    <CardHeader className="flex flex-row items-center gap-4 pb-4 relative z-10 border-b border-muted/30">
                        <Avatar className="h-12 w-12 border-2 border-primary/10">
                            <AvatarImage src={testimonial.photoURL || undefined} alt={testimonial.name} />
                            <AvatarFallback className="bg-primary/5 text-primary font-bold">
                                {testimonial.name ? testimonial.name.charAt(0) : <User className="h-5 w-5" />}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-base line-clamp-1">{testimonial.name}</CardTitle>
                            <CardDescription className="capitalize line-clamp-1">{testimonial.role}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="relative z-10 pt-6">
                        <p className="text-base text-foreground/80 leading-relaxed italic">
                            "{testimonial.content}"
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
