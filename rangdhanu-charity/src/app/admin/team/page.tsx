"use client";

import { useState } from "react";
import { useData } from "@/lib/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Plus, Trash2, User } from "lucide-react";

export default function TeamManager() {
    const { teamMembers, addTeamMember, deleteTeamMember } = useData();
    const [isAdding, setIsAdding] = useState(false);
    const [newMember, setNewMember] = useState({ name: "", role: "", image: "" });

    const handleAdd = () => {
        if (!newMember.name || !newMember.role) return;
        addTeamMember(newMember);
        setNewMember({ name: "", role: "", image: "" });
        setIsAdding(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
                <Button onClick={() => setIsAdding(!isAdding)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Team Member
                </Button>
            </div>

            {isAdding && (
                <Card>
                    <CardHeader>
                        <CardTitle>New Team Member</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                    value={newMember.name}
                                    onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                                    placeholder="Jane Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Input
                                    value={newMember.role}
                                    onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                                    placeholder="Coordinator"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Image URL (Optional)</Label>
                            <Input
                                value={newMember.image}
                                onChange={(e) => setNewMember({ ...newMember, image: e.target.value })}
                                placeholder="https://example.com/photo.jpg"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
                        <Button onClick={handleAdd}>Add Member</Button>
                    </CardFooter>
                </Card>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {teamMembers.map((member) => (
                    <Card key={member.id} className="overflow-hidden">
                        <div className="aspect-square bg-muted flex items-center justify-center">
                            {member.image ? (
                                <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                                <User className="h-12 w-12 text-muted-foreground" />
                            )}
                        </div>
                        <CardHeader>
                            <CardTitle className="text-lg">{member.name}</CardTitle>
                            <CardDescription>{member.role}</CardDescription>
                        </CardHeader>
                        <CardFooter className="justify-end">
                            <Button variant="destructive" size="sm" onClick={() => deleteTeamMember(member.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
