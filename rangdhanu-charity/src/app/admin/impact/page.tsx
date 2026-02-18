"use client";

import { useState, useEffect } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Save } from "lucide-react";
import { getIcon } from "@/lib/icons";

export default function ImpactStatsManager() {
    const { impactStats, updateImpactStat } = useData();
    const [stats, setStats] = useState(impactStats);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setStats(impactStats);
    }, [impactStats]);

    const handleChange = (index: number, value: string) => {
        const newStats = [...stats];
        newStats[index] = { ...newStats[index], value };
        setStats(newStats);
    };

    const handleSave = () => {
        setIsSaving(true);
        stats.forEach((stat, index) => {
            updateImpactStat(index, stat.value);
        });
        setTimeout(() => {
            setIsSaving(false);
            alert("Impact stats updated successfully!"); // Replace with toast if available
        }, 500);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Impact Stats</h1>
                <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {stats.map((stat, index) => {
                    const Icon = getIcon(stat.icon);
                    return (
                        <Card key={index}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {stat.label}
                                </CardTitle>
                                <Icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Input
                                        value={stat.value}
                                        onChange={(e) => handleChange(index, e.target.value)}
                                        className="text-2xl font-bold"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Edit the value displayed on the home page.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
