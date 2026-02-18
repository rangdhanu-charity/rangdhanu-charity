"use client";

import { useData } from "@/lib/data-context";
import { Section } from "@/components/layout/section";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";

export function AboutTeam() {
    const { teamMembers } = useData();

    return (
        <Section>
            <div className="flex flex-col items-center justify-center gap-4 text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tighter">Meet Our Team</h2>
                <p className="max-w-[700px] text-muted-foreground">
                    The passionate individuals driving our mission forward.
                </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {teamMembers.map((member) => (
                    <Card key={member.id} className="overflow-hidden">
                        <div className="aspect-square relative bg-muted">
                            {member.image ? (
                                <Image
                                    src={member.image}
                                    alt={member.name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground bg-gray-100 dark:bg-gray-800">
                                    {member.name}
                                </div>
                            )}
                        </div>
                        <CardHeader className="text-center">
                            <CardTitle>{member.name}</CardTitle>
                            <CardDescription>{member.role}</CardDescription>
                        </CardHeader>
                    </Card>
                ))}
            </div>
        </Section>
    );
}
