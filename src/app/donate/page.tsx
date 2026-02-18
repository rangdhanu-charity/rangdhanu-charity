"use client";

import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";
import { CheckCircle, CreditCard, Lock } from "lucide-react";

const AMOUNTS = [10, 25, 50, 100, 250];

export default function DonatePage() {
    const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
    const [customAmount, setCustomAmount] = useState("");
    const [isMonthly, setIsMonthly] = useState(false);

    const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomAmount(e.target.value);
        setSelectedAmount(null);
    };

    const handleAmountSelect = (amount: number) => {
        setSelectedAmount(amount);
        setCustomAmount("");
    };

    return (
        <div className="flex flex-col min-h-screen">
            <section className="bg-primary text-primary-foreground py-16 text-center">
                <div className="container px-4">
                    <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-4">
                        Donate to Rangdhanu
                    </h1>
                    <p className="mx-auto max-w-[600px] text-primary-foreground/80">
                        Your contribution helps us provide education and support to children in need.
                    </p>
                </div>
            </section>

            <Section>
                <div className="mx-auto max-w-lg">
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Donation Amount</CardTitle>
                            <CardDescription>Choose an amount to donate securely.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Monthly Toggle */}
                            <div className="flex justify-center mb-6">
                                <div className="flex items-center p-1 bg-muted rounded-lg">
                                    <button
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${!isMonthly ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                                        onClick={() => setIsMonthly(false)}
                                    >
                                        One-time
                                    </button>
                                    <button
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${isMonthly ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                                        onClick={() => setIsMonthly(true)}
                                    >
                                        Monthly
                                    </button>
                                </div>
                            </div>

                            {/* Amount Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                {AMOUNTS.map((amount) => (
                                    <button
                                        key={amount}
                                        onClick={() => handleAmountSelect(amount)}
                                        className={`h-12 border rounded-md font-medium transition-all ${selectedAmount === amount
                                                ? "border-primary bg-primary/5 ring-1 ring-primary text-primary"
                                                : "hover:border-primary/50"
                                            }`}
                                    >
                                        ${amount}
                                    </button>
                                ))}
                                <div className="relative col-span-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input
                                        type="number"
                                        placeholder="Custom"
                                        value={customAmount}
                                        onChange={handleCustomAmountChange}
                                        className={`h-12 pl-6 ${selectedAmount === null ? "border-primary ring-1 ring-primary" : ""}`}
                                    />
                                </div>
                            </div>

                            {/* Donation Form mock */}
                            <div className="space-y-4 pt-4 border-t">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Full Name</label>
                                    <Input placeholder="John Doe" />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Email Address</label>
                                    <Input type="email" placeholder="john@example.com" />
                                </div>

                                <div className="rounded-md bg-muted p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                                        <span className="text-sm font-medium">Card Payment</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">Stripe Secure</span>
                                </div>
                            </div>

                            <Button className="w-full bg-gradient-to-r from-blue-600 to-pink-500 hover:opacity-90" size="lg">
                                Donate {selectedAmount ? `$${selectedAmount}` : customAmount ? `$${customAmount}` : ""}
                            </Button>

                            <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground">
                                <Lock className="h-3 w-3" />
                                <span>Secure 256-bit SSL Encrypted payment.</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </Section>
        </div>
    );
}
