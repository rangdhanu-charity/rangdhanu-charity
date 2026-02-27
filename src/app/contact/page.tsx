"use client";

import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Mail, MapPin, Phone } from "lucide-react";

export default function ContactPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <section className="bg-primary text-primary-foreground py-20 text-center">
                <div className="container px-4">
                    <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
                        Contact Us
                    </h1>
                    <p className="mx-auto max-w-[600px] text-primary-foreground/80 md:text-lg">
                        We are here to help. Reach out to us for any queries or support.
                    </p>
                </div>
            </section>

            <Section>
                <div className="max-w-4xl mx-auto">
                    <div className="grid gap-6 md:grid-cols-3">
                        <Card className="text-center">
                            <CardHeader className="flex flex-col items-center gap-2">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <MapPin className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle>Visit Us</CardTitle>
                                <CardDescription className="w-full">
                                    Meghna - 3515, Cumilla, Bangladesh
                                </CardDescription>
                            </CardHeader>
                        </Card>
                        <Card className="text-center">
                            <CardHeader className="flex flex-col items-center gap-2">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <Phone className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle>Call Us</CardTitle>
                                <CardDescription className="w-full">
                                    +880 1829-965153
                                </CardDescription>
                            </CardHeader>
                        </Card>
                        <Card className="text-center">
                            <CardHeader className="flex flex-col items-center gap-2">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <Mail className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle>Email Us</CardTitle>
                                <CardDescription className="w-full">
                                    info@rangdhanu.org
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                </div>
            </Section>
        </div>
    );
}
