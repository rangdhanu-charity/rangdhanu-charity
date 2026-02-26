"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, User, ArrowRight, ShieldCheck, Mail, Phone } from "lucide-react";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export function HomeDonateModal({ children }: { children: React.ReactNode }) {
    const { toast } = useToast();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        contact: "",
        amount: "",
        method: "bkash",
        transactionId: "",
        date: new Date().toISOString().split('T')[0],
        notes: ""
    });

    const handlePublicDonationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await addDoc(collection(db, "donation_requests"), {
                userId: "guest",
                userName: formData.name || "Anonymous Guest",
                userEmail: formData.contact,
                amount: Number(formData.amount),
                type: "one-time",
                method: formData.method,
                transactionId: formData.method === "cash" ? "" : formData.transactionId,
                date: formData.date,
                notes: formData.notes,
                status: "pending",
                createdAt: Timestamp.now(),
                isGuest: true
            });

            toast({
                title: "Thank You!",
                description: "Your donation request has been received. Our team will verify it shortly."
            });

            setIsOpen(false);
            setFormData({
                name: "",
                contact: "",
                amount: "",
                method: "bkash",
                transactionId: "",
                date: new Date().toISOString().split('T')[0],
                notes: ""
            });
        } catch (error) {
            console.error("Error submitting guest donation:", error);
            toast({
                title: "Submission Failed",
                description: "There was an error processing your request. Please try again or contact support.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl flex items-center gap-2">
                        <Heart className="h-6 w-6 text-primary fill-primary" /> Make a Donation
                    </DialogTitle>
                    <DialogDescription>
                        Choose how you would like to support Rangdhanu Charity Foundation today.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 p-4 mt-4 bg-muted/30 rounded-lg border border-muted">
                    <div>
                        <h3 className="text-sm font-semibold mb-2 flex flex-row items-center gap-2"><span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs">1</span> Transfer your donation</h3>
                        <p className="text-xs text-muted-foreground mb-2">First, send your donation to one of the following accounts:</p>
                        <ul className="text-sm space-y-1 text-muted-foreground bg-background p-3 rounded border">
                            <li><strong className="text-foreground">bKash/Nagad:</strong> +880 1829-965153 (Mohammad Ful Mia)</li>
                            <li><strong className="text-foreground">Dutch Bangla:</strong> 2261510170962</li>
                            <li><strong className="text-foreground">Cash:</strong> In Person</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold mb-2 flex flex-row items-center gap-2 mt-4"><span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span> Fill out this form</h3>
                        <p className="text-xs text-muted-foreground">After transferring, securely log your donation below and submit. Our team will verify the transaction.</p>
                        <p className="text-xs text-muted-foreground mt-2 font-medium bg-blue-50/50 p-2 rounded border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50">
                            You can track the live status (Pending, Approved, or Rejected) of your donation payment in the <strong>Public Donation Track</strong> tab.
                        </p>
                    </div>
                </div>

                <Tabs defaultValue="one-time" className="mt-4">
                    <TabsList className="grid w-full grid-cols-2 text-xs sm:text-sm">
                        <TabsTrigger value="one-time">One-time donation</TabsTrigger>
                        <TabsTrigger value="monthly">Monthly Member</TabsTrigger>
                    </TabsList>

                    <TabsContent value="one-time" className="space-y-4 pt-4">
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md border border-blue-100 dark:border-blue-900 mb-4">
                            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                                <strong>Note for Members:</strong> If you are a registered member making a one-time contribution, please <button type="button" onClick={() => router.push("/login?redirect=/profile?action=donate")} className="underline font-medium hover:text-blue-900 dark:hover:text-blue-200">log in first</button> to donate from your profile so it's recorded in your history. Public donations here cannot be linked to your account later.
                            </p>
                        </div>
                        <form onSubmit={handlePublicDonationSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="guest-name">Full Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="guest-name"
                                            placeholder="Your name"
                                            className="pl-9"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="guest-contact">Email or Phone</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="guest-contact"
                                            placeholder="Contact info"
                                            className="pl-9"
                                            value={formData.contact}
                                            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-muted/10 rounded-lg border border-muted/50">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="guest-amount">Amount (৳)</Label>
                                        <Input
                                            id="guest-amount"
                                            type="number"
                                            placeholder="500"
                                            min="10"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="guest-method">Payment Method</Label>
                                        <select
                                            id="guest-method"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={formData.method}
                                            onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                                        >
                                            <option value="bkash">bKash</option>
                                            <option value="nagad">Nagad</option>
                                            <option value="dbbl">Dutch Bangla Bank</option>
                                            <option value="cash">Cash (In-person)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="guest-date">Payment Date</Label>
                                <Input
                                    id="guest-date"
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>

                            {formData.method !== "cash" && (
                                <div className="space-y-2">
                                    <Label htmlFor="guest-trx">Transaction ID (TrxID) / Last 4 digits</Label>
                                    <Input
                                        id="guest-trx"
                                        placeholder="e.g. 9BCA12345 or 1234"
                                        value={formData.transactionId}
                                        onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                                        required={formData.method !== "cash"}
                                    />
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? "Submitting Request..." : "Submit Donation Transfer"}
                            </Button>
                        </form>
                    </TabsContent>

                    <TabsContent value="monthly" className="pt-4 space-y-4">
                        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 border rounded-xl text-center space-y-4 shadow-sm">
                            <div className="h-16 w-16 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                <ShieldCheck className="h-8 w-8 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Monthly Memberships</h3>
                                <p className="text-sm text-muted-foreground mt-2">
                                    To log a monthly membership subscription, you must be a registered member.
                                    Members are liable to pay a minimum of 100 BDT each month by the 10th.
                                </p>
                            </div>

                            <Button
                                onClick={() => router.push("/login?redirect=/profile?action=donate")}
                                className="w-full mt-4"
                                size="lg"
                            >
                                Login to Donate <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>

                            <p className="text-xs text-muted-foreground mt-4">
                                Not a member yet?{" "}
                                <Button variant="link" className="p-0 h-auto text-xs" onClick={() => router.push('/register')}>
                                    Register here
                                </Button>
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
