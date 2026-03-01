"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Section } from "@/components/layout/section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Quote, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface TestimonialData {
    id: string;
    userId: string;
    name: string;
    photoURL: string | null;
    role: string;
    content: string;
    createdAt: any;
}

export function HomeTestimonials() {
    const [testimonials, setTestimonials] = useState<TestimonialData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTestimonials = async () => {
            try {
                // Fetch the active testimonials
                const q = query(
                    collection(db, "testimonials"),
                    where("isActive", "==", true)
                );

                const snapshot = await getDocs(q);
                let data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as TestimonialData[];

                // Sort client-side to bypass composite index requirement
                data.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
                    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
                    return dateB.getTime() - dateA.getTime();
                });

                // Limit to 3 for the home page
                data = data.slice(0, 3);

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
            <Section background="muted">
                <div className="flex flex-col items-center justify-center gap-4 text-center mb-12">
                    <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Voices of Change</h2>
                    <div className="h-4 w-48 bg-muted-foreground/20 animate-pulse rounded mt-2"></div>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse bg-background/50 h-[200px]"></Card>
                    ))}
                </div>
            </Section>
        )
    }

    if (testimonials.length === 0) {
        return null; // Don't show section if no voices yet
    }

    return (
        <Section background="muted">
            <div className="flex flex-col items-center justify-center gap-4 text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Voices of Change</h2>
                <p className="max-w-[700px] text-muted-foreground">
                    Hear from our donors, volunteers, and the community we serve.
                </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 relative">
                {testimonials.map((testimonial) => (
                    <Card key={testimonial.id} className="bg-background relative overflow-hidden group hover:shadow-md transition-shadow">
                        <Quote className="absolute top-4 right-4 h-12 w-12 text-primary/5 rotate-180 transition-transform group-hover:scale-110" />
                        <CardHeader className="flex flex-row items-center gap-4 pb-2 relative z-10">
                            <Avatar className="h-12 w-12 border-2 border-primary/10">
                                <AvatarImage src={testimonial.photoURL || undefined} alt={testimonial.name} />
                                <AvatarFallback className="bg-primary/5 text-primary">
                                    {testimonial.name ? testimonial.name.charAt(0) : <User className="h-5 w-5" />}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-base line-clamp-1">{testimonial.name}</CardTitle>
                                <CardDescription className="capitalize line-clamp-1">{testimonial.role}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4 italic">
                                "{testimonial.content}"
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="mt-10 flex justify-center">
                <Button asChild variant="outline" className="rounded-full px-8 hover:bg-primary hover:text-primary-foreground group transition-all">
                    <Link href="/testimonials" className="flex items-center">
                        See More Stories <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </Button>
            </div>
        </Section>
    );
}
