"use client";

import { Section } from "@/components/layout/section";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, Target, Eye, Heart, BarChart } from "lucide-react";
import Image from "next/image";
import { AboutTeam } from "@/components/sections/about-team";

export default function AboutPage() {

    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="relative bg-primary text-primary-foreground py-20 md:py-32 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-blue-800 opacity-90" />
                <div className="container relative z-10 px-4 md:px-6 text-center">
                    <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl mb-4">
                        About Rangdhanu
                    </h1>
                    <p className="mx-auto max-w-[700px] text-primary-foreground/80 md:text-lg">
                        Dedicated to illuminating the lives of underprivileged children through education and care.
                    </p>
                </div>
            </section>

            {/* Mission & Vision */}
            <Section>
                <div className="grid gap-12 md:grid-cols-2 lg:gap-16 items-start">
                    <div className="flex flex-col gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Target className="h-6 w-6" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tighter">Our Mission</h2>
                        <p className="text-muted-foreground text-lg">
                            To provide quality education, healthcare, and emotional support to underprivileged children,
                            empowering them to break the cycle of poverty and become responsible citizens.
                        </p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10 text-secondary-foreground">
                            <Eye className="h-6 w-6" />
                        </div>
                        <h2 className="text-3xl font-bold tracking-tighter">Our Vision</h2>
                        <p className="text-muted-foreground text-lg">
                            A world where every child, regardless of their background, has equal opportunity to learn,
                            grow, and dream without limitations.
                        </p>
                    </div>
                </div>
            </Section>

            {/* Our Story & Values */}
            <Section background="muted">
                <div className="flex flex-col gap-8 md:flex-row md:items-center md:gap-16">
                    <div className="flex-1 space-y-4">
                        <h2 className="text-3xl font-bold tracking-tighter">Our Story</h2>
                        <p className="text-muted-foreground">
                            Founded in 2020 during the global pandemic, Rangdhanu Charity Foundation started as a small initiative
                            by a group of university students who wanted to help street children with food and masks.
                            Witnessing the eagerness of these children to learn, we shifted our focus to education.
                        </p>
                        <p className="text-muted-foreground">
                            Today, we support over 1000 children across 3 districts, running 2 permanent schools and
                            supporting 5 partner schools.
                        </p>
                    </div>
                    <div className="flex-1 grid gap-4 sm:grid-cols-2">
                        {[
                            { title: "Integrity", icon: CheckCircle },
                            { title: "Compassion", icon: Heart },
                            { title: "Transparency", icon: BarChart },
                            { title: "Excellence", icon: Target },
                        ].map((value, index) => (
                            <Card key={index} className="bg-background">
                                <CardHeader className="p-4 flex flex-row items-center gap-4 space-y-0">
                                    <div className="bg-primary/10 p-2 rounded-full text-primary">
                                        <value.icon className="h-4 w-4" />
                                    </div>
                                    <CardTitle className="text-base">{value.title}</CardTitle>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </div>
            </Section>

            {/* Team Section */}
            <AboutTeam />
        </div>
    );
}
