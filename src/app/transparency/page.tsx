import { Section } from "@/components/layout/section";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, FileText, PieChart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TransparencyPage() {
    return (
        <div className="flex flex-col min-h-screen">
            <section className="bg-muted py-20 text-center">
                <div className="container px-4">
                    <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
                        Transparency & Financials
                    </h1>
                    <p className="mx-auto max-w-[600px] text-muted-foreground md:text-lg">
                        We believe in complete transparency. Here is how your donations are utilized.
                    </p>
                </div>
            </section>

            <Section>
                <div className="grid gap-8 lg:grid-cols-2">
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Financial Breakdown (2025)</h2>
                        <p className="text-muted-foreground mb-8">
                            85% of our funds go directly to our programs. We maintain low administrative costs to ensure maximum impact.
                        </p>
                        <div className="relative h-64 w-full bg-gray-100 rounded-lg flex items-center justify-center">
                            <PieChart className="h-16 w-16 text-muted-foreground" />
                            <span className="ml-2 text-muted-foreground">Interactive Chart Placeholder</span>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold mb-4">Annual Reports</h2>
                        {[2024, 2023, 2022].map((year) => (
                            <Card key={year}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-base">Annual Report {year}</CardTitle>
                                    </div>
                                    <Button asChild size="sm" variant="outline">
                                        <Link href="#" className="flex items-center gap-2">
                                            Download <Download className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </div>
            </Section>

            <Section background="muted">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
                    <div className="space-y-4 text-left">
                        {[
                            { q: "Is my donation tax-deductible?", a: "Yes, Rangdhanu Charity Foundation is a registered nonprofit and all donations are tax-deductible." },
                            { q: "Can I sponsor a specific child?", a: "Yes, we have a sponsorship program. Please contact us for more details." },
                            { q: "How much of my donation goes to the cause?", a: "We ensure that 85% of all donations go directly to program activities." }
                        ].map((faq, index) => (
                            <Card key={index}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">{faq.q}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">{faq.a}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </Section>
        </div>
    );
}
