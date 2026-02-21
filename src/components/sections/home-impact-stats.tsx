"use client";

import { useData } from "@/lib/data-context";
import { Section } from "@/components/layout/section";
import { getIcon } from "@/lib/icons";

export function HomeImpactStats() {
    const { impactStats } = useData();

    return (
        <Section background="muted">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
                {impactStats.map((stat, index) => {
                    const Icon = getIcon(stat.icon);
                    return (
                        <div key={stat.id} className="flex flex-col items-center gap-2 p-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Icon className="h-6 w-6" />
                            </div>
                            <h3 className="text-3xl font-bold tracking-tighter">{stat.value}</h3>
                            <p className="text-sm text-muted-foreground">{stat.label}</p>
                        </div>
                    );
                })}
            </div>
        </Section>
    );
}
