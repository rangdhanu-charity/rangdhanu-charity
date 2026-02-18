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
                <div className="grid gap-12 lg:grid-cols-2">
                    {/* Contact Info */}
                    <div className="space-y-8">
                        <div className="grid gap-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <MapPin className="h-6 w-6 text-primary" />
                                    <div>
                                        <CardTitle>Visit Us</CardTitle>
                                        <CardDescription>
                                            123 Charity Lane, Dhaka 1200, Bangladesh
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <Phone className="h-6 w-6 text-primary" />
                                    <div>
                                        <CardTitle>Call Us</CardTitle>
                                        <CardDescription>
                                            +880 1234 567890
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <Mail className="h-6 w-6 text-primary" />
                                    <div>
                                        <CardTitle>Email Us</CardTitle>
                                        <CardDescription>
                                            info@rangdhanu.org
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                            </Card>
                        </div>

                        {/* Map Placeholder */}
                        <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                            Google Maps Embed Placeholder
                        </div>
                    </div>

                    {/* Contact Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Send us a Message</CardTitle>
                            <CardDescription>We will get back to you as soon as possible.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Name</label>
                                    <Input placeholder="Your Name" />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <Input type="email" placeholder="Your Email" />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Subject</label>
                                    <Input placeholder="Subject" />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Message</label>
                                    <textarea
                                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Your message here..."
                                    />
                                </div>
                                <Button type="submit" className="w-full">Send Message</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </Section>
        </div>
    );
}
