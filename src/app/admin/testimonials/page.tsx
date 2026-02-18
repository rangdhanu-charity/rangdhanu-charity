"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Plus, Trash2, Edit } from "lucide-react";

export default function TestimonialsManager() {
    const { testimonials, addTestimonial, deleteTestimonial } = useData();
    const [isAdding, setIsAdding] = useState(false);
    const [newTestimonial, setNewTestimonial] = useState({ name: "", role: "", content: "" });

    const handleAdd = () => {
        if (!newTestimonial.name || !newTestimonial.content) return;
        addTestimonial(newTestimonial);
        setNewTestimonial({ name: "", role: "", content: "" });
        setIsAdding(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Testimonials</h1>
                <Button onClick={() => setIsAdding(!isAdding)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Testimonial
                </Button>
            </div>

            {isAdding && (
                <Card>
                    <CardHeader>
                        <CardTitle>New Testimonial</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                    value={newTestimonial.name}
                                    onChange={(e) => setNewTestimonial({ ...newTestimonial, name: e.target.value })}
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Input
                                    value={newTestimonial.role}
                                    onChange={(e) => setNewTestimonial({ ...newTestimonial, role: e.target.value })}
                                    placeholder="Donor / Volunteer"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Message</Label>
                            <Textarea
                                value={newTestimonial.content}
                                onChange={(e) => setNewTestimonial({ ...newTestimonial, content: e.target.value })}
                                placeholder="Their testimonial..."
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                        <Button onClick={handleAdd}>Add Testimonial</Button>
                    </CardFooter>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {testimonials.map((testimonial) => (
                    <Card key={testimonial.id}>
                        <CardHeader>
                            <CardTitle>{testimonial.name}</CardTitle>
                            <CardDescription>{testimonial.role}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground italic">"{testimonial.content}"</p>
                        </CardContent>
                        <CardFooter className="justify-end">
                            <Button variant="destructive" size="sm" onClick={() => deleteTestimonial(testimonial.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
