"use client";

import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function VolunteerPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <section className="relative bg-secondary text-secondary-foreground py-20 text-center">
                <div className="container px-4">
                    <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
                        Become a Volunteer
                    </h1>
                    <p className="mx-auto max-w-[600px] text-secondary-foreground/80 md:text-lg">
                        Join our team of dedicated individuals working to bring positive change.
                    </p>
                </div>
            </section>

            <Section>
                <div className="grid gap-12 lg:grid-cols-2">
                    {/* Volunteer Info */}
                    <div className="space-y-8">
                        <h2 className="text-3xl font-bold tracking-tighter">Why Volunteer?</h2>
                        <div className="grid gap-6">
                            {[
                                { title: "Make a Difference", desc: "Directly impact the lives of underprivileged children." },
                                { title: "Personal Growth", desc: "Develop new skills and gain valuable experience." },
                                { title: "Community", desc: "Connect with like-minded individuals who share your passion." },
                            ].map((item, index) => (
                                <div key={index} className="flex gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <CheckCircle className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{item.title}</h3>
                                        <p className="text-muted-foreground">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Application Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Volunteer Application</CardTitle>
                            <CardDescription>Fill out the form below to get started.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form className="space-y-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Full Name</label>
                                    <Input placeholder="John Doe" />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Email Address</label>
                                    <Input type="email" placeholder="john@example.com" />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Phone Number</label>
                                    <Input type="tel" placeholder="+880 1234 567890" />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Area of Interest</label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                        <option>Education Support</option>
                                        <option>Event Management</option>
                                        <option>Fundraising</option>
                                        <option>Social Media</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Availability</label>
                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                        <option>Full-time</option>
                                        <option>Part-time</option>
                                        <option>Weekends only</option>
                                    </select>
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Skills (Optional)</label>
                                    <Input placeholder="e.g. Graphic Design, Teaching" />
                                </div>
                                <Button type="submit" className="w-full mt-4">Submit Application</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </Section>
        </div>
    );
}
