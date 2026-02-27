"use client";

import { useState, useEffect } from "react";
import { Section } from "@/components/layout/section";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function AboutTeam() {
    const [realMembers, setRealMembers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "users"));
        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            // Filter to actual registered members with names
            const validMembers = data.filter(u => u.name && u.roles);
            setRealMembers(validMembers.length > 0 ? validMembers : data);
            setIsLoading(false);
        });
        return () => unsub();
    }, []);

    // Calculate current calendar week offset
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const currentWeek = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));

    let rotatedMembers = [...realMembers];
    if (realMembers.length > 3) {
        const offset = currentWeek % realMembers.length;
        rotatedMembers = [...realMembers.slice(offset), ...realMembers.slice(0, offset)].slice(0, 3);
    }

    if (isLoading) {
        return <div className="text-center py-12">Loading team members...</div>;
    }

    return (
        <Section>
            <div className="flex flex-col items-center justify-center gap-4 text-center mb-12">
                <h2 className="text-3xl font-bold tracking-tighter">Meet Our Team</h2>
                <div className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold tracking-wide">
                    Members of the Week
                </div>
                <p className="max-w-[700px] text-muted-foreground mt-2">
                    The passionate individuals driving our mission forward.
                </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {rotatedMembers.map((member) => {
                    const primaryRole = member.roles && member.roles.length > 0 ? member.roles[0] : "Member";
                    return (
                        <Card key={member.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                            <div className="aspect-square relative bg-muted">
                                {member.photoURL ? (
                                    <Image
                                        src={member.photoURL}
                                        alt={member.name || "Member"}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground bg-gray-100 dark:bg-gray-800 text-3xl uppercase font-bold tracking-widest">
                                        {member.name ? member.name.substring(0, 2) : "UN"}
                                    </div>
                                )}
                            </div>
                            <CardHeader className="text-center bg-card z-10 relative">
                                <CardTitle className="text-xl">{member.name || "Unknown User"}</CardTitle>
                                <CardDescription className="text-primary font-medium mt-1 uppercase text-xs tracking-wider">
                                    {primaryRole}
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    );
                })}
            </div>
        </Section>
    );
}
