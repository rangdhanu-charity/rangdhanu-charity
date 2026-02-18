"use client";

import { useData } from "@/lib/data-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Section } from "@/components/layout/section";

export function HomeTestimonials() {
    const { testimonials } = useData();

    return (
        <Section background="muted">
            <div className="flex flex-col items-center justify-center gap-4 text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Voices of Change</h2>
                <p className="max-w-[700px] text-muted-foreground">
                    Hear from our donors, volunteers, and the community we serve.
                </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {testimonials.map((testimonial) => (
                    <Card key={testimonial.id} className="bg-background">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-primary/10" />
                            <div>
                                <CardTitle className="text-base">{testimonial.name}</CardTitle>
                                <CardDescription>{testimonial.role}</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">"{testimonial.content}"</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </Section>
    );
}
