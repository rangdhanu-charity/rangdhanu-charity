"use client";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Section } from "@/components/layout/section";
import { User, Mail, Calendar, Heart, Shield } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useEffect } from "react";

// Mock donation history
const DONATION_HISTORY = [
    { id: 1, date: "2023-12-15", amount: 50, project: "Education for Street Children" },
    { id: 2, date: "2024-01-20", amount: 100, project: "Winter Clothes Distribution" },
    { id: 3, date: "2024-02-10", amount: 25, project: "Unknown (General Fund)" },
];

export default function ProfilePage() {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            redirect("/login");
        }
    }, [user]);

    if (!user) return null;

    return (
        <div className="flex flex-col min-h-screen">
            <section className="bg-muted py-12">
                <div className="container px-4">
                    <div className="flex flex-col items-center md:flex-row md:items-start md:gap-8">
                        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary mb-4 md:mb-0">
                            <User className="h-12 w-12" />
                        </div>
                        <div className="text-center md:text-left space-y-2">
                            <h1 className="text-3xl font-bold">{user.name}</h1>
                            <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                                <Mail className="h-4 w-4" /> <span>{user.email}</span>
                            </div>
                            <div className="flex items-center justify-center md:justify-start gap-2">
                                <Shield className="h-4 w-4 text-secondary" />
                                <span className="capitalize font-medium text-secondary">{user.role} Account</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <Section>
                <div className="grid gap-8 md:grid-cols-2">

                    {/* Donation History */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Heart className="h-5 w-5 text-primary" /> Donation History
                            </CardTitle>
                            <CardDescription>Your past contributions to Rangdhanu.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {DONATION_HISTORY.map((donation) => (
                                    <div key={donation.id} className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-medium">{donation.project}</p>
                                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                <Calendar className="h-3 w-3" /> {donation.date}
                                            </p>
                                        </div>
                                        <span className="font-bold text-primary">${donation.amount}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6">
                                <Button asChild className="w-full">
                                    <Link href="/donate">Make a New Donation</Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Volunteer Status */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Volunteer Status</CardTitle>
                            <CardDescription>Check your application status.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900 text-center">
                                <p className="font-medium text-yellow-800 dark:text-yellow-200">No active application found.</p>
                                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">Want to join our team?</p>
                            </div>
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/volunteer">Apply as Volunteer</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </Section>
        </div>
    );
}
