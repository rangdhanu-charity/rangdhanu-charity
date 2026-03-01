"use client";

import { useState, useEffect } from "react";
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Save, AlertTriangle, Info, CheckCircle2, Megaphone, Trash2, Plus, Edit, Type, EyeOff, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface BannerData {
    id?: string;
    isActive: boolean;
    message: string;
    linkUrl: string;
    linkText: string;
    theme: "info" | "warning" | "success";
    targetPage: "all" | "home" | "profile" | "donate" | "projects" | "stories" | "about";
    expiresAt?: string;
    createdAt?: any;
}

const DEFAULT_BANNER: Omit<BannerData, "id" | "createdAt"> = {
    isActive: true,
    message: "",
    linkUrl: "",
    linkText: "",
    theme: "info",
    targetPage: "all",
    expiresAt: ""
};

const PAGE_OPTIONS = [
    { value: "all", label: "All Pages (Global)" },
    { value: "home", label: "Home Page Only (/)" },
    { value: "profile", label: "Profile Interface (/profile)" },
    { value: "donate", label: "Donation Page (/donate)" },
    { value: "projects", label: "Projects Directory (/projects)" },
    { value: "stories", label: "Stories & Reports (/stories)" },
    { value: "about", label: "About Us (/about)" },
];

export default function AdminBannerPage() {
    const [banners, setBanners] = useState<BannerData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<BannerData, "id" | "createdAt">>(DEFAULT_BANNER);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "banners"), (snapshot) => {
            const fetchedBanners = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as BannerData[];

            // Sort by createdAt descending
            fetchedBanners.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(0);
                const dateB = b.createdAt?.toDate?.() || new Date(0);
                return dateB.getTime() - dateA.getTime();
            });

            setBanners(fetchedBanners);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching banners:", error);
            toast({ title: "Error", description: "Could not load banners.", variant: "destructive" });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [toast]);

    const handleOpenCreateForm = () => {
        setFormData(DEFAULT_BANNER);
        setEditingId(null);
        setIsFormOpen(true);
    };

    const handleOpenEditForm = (banner: BannerData) => {
        setFormData({
            isActive: banner.isActive,
            message: banner.message,
            linkUrl: banner.linkUrl || "",
            linkText: banner.linkText || "",
            theme: banner.theme || "info",
            targetPage: banner.targetPage || "all",
            expiresAt: banner.expiresAt || ""
        });
        setEditingId(banner.id!);
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        if (!formData.message.trim()) {
            toast({ title: "Validation Error", description: "Message cannot be empty.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            if (editingId) {
                await updateDoc(doc(db, "banners", editingId), formData);
                toast({ title: "Banner Updated", description: "Your banner details were successfully updated." });
            } else {
                await addDoc(collection(db, "banners"), {
                    ...formData,
                    createdAt: Timestamp.now()
                });
                toast({ title: "Banner Created", description: "New banner successfully deployed." });
            }
            setIsFormOpen(false);
        } catch (error) {
            console.error("Error saving banner:", error);
            toast({ title: "Error", description: "Failed to save banner.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, "banners", id), { isActive: !currentStatus });
        } catch (error) {
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to permanently delete this banner?")) return;
        try {
            await deleteDoc(doc(db, "banners", id));
            toast({ title: "Banner Deleted", description: "The banner has been permanently removed." });
        } catch (error) {
            console.error("Error deleting banner:", error);
            toast({ title: "Error", description: "Failed to delete from database.", variant: "destructive" });
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading banners...</div>;
    }

    if (isFormOpen) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{editingId ? "Edit Banner" : "Create New Banner"}</h1>
                        <p className="text-muted-foreground mt-1">Configure announcement targeting and visuals.</p>
                    </div>
                    <Button variant="outline" onClick={() => setIsFormOpen(false)}>Back to List</Button>
                </div>

                <Card className="border-2 border-primary/10 shadow-sm relative overflow-hidden">
                    <CardHeader className="bg-muted/30 pb-4 border-b">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Megaphone className="h-5 w-5 text-primary" />
                                    Banner Settings
                                </CardTitle>
                            </div>
                            <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 border px-4 py-2 rounded-full shadow-sm">
                                <Label htmlFor="banner-active" className="font-semibold cursor-pointer">
                                    {formData.isActive ? <span className="text-green-600">Active Status</span> : <span className="text-slate-400">Suspended Status</span>}
                                </Label>
                                <Switch
                                    id="banner-active"
                                    checked={formData.isActive}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                                    className="data-[state=checked]:bg-green-500"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">

                        {/* Live Preview */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Live Preview</Label>
                            <div className={`p-4 rounded-md border flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${formData.theme === 'warning' ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200' :
                                formData.theme === 'success' ? 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900 text-green-900 dark:text-green-200' :
                                    'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200'
                                }`}>
                                <div className="flex items-center gap-3 w-full">
                                    <div className="shrink-0">
                                        {formData.theme === 'warning' && <AlertTriangle className="h-5 w-5 opacity-80" />}
                                        {formData.theme === 'success' && <CheckCircle2 className="h-5 w-5 opacity-80" />}
                                        {formData.theme === 'info' && <Info className="h-5 w-5 opacity-80" />}
                                    </div>
                                    <div className="text-sm font-medium leading-normal flex-1">
                                        {formData.message || "Your announcement message will appear here."}
                                    </div>
                                    {formData.linkUrl && formData.linkText && (
                                        <div className="shrink-0">
                                            <div className={`text-xs px-3 py-1.5 rounded-full font-bold whitespace-nowrap border bg-white/50 dark:bg-black/20 ${formData.theme === 'warning' ? 'border-red-300 text-red-800 dark:text-red-300' :
                                                formData.theme === 'success' ? 'border-green-300 text-green-800 dark:text-green-300' :
                                                    'border-blue-300 text-blue-800 dark:text-blue-300'
                                                }`}>
                                                {formData.linkText}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="message">Announcement Message *</Label>
                                    <Textarea
                                        id="message"
                                        placeholder="Type the main banner text..."
                                        value={formData.message}
                                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        className="resize-none h-32"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Placement (Target Page)</Label>
                                    <RadioGroup
                                        value={formData.targetPage}
                                        onValueChange={(val: any) => setFormData({ ...formData, targetPage: val })}
                                        className="flex flex-col gap-2 mt-2"
                                    >
                                        {PAGE_OPTIONS.map((opt) => (
                                            <div key={opt.value} className="flex items-center space-x-2 rounded-md hover:bg-muted/50 cursor-pointer">
                                                <RadioGroupItem value={opt.value} id={`r-target-${opt.value}`} />
                                                <Label htmlFor={`r-target-${opt.value}`} className="flex-1 cursor-pointer text-sm">
                                                    {opt.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                                <div className="space-y-2">
                                    <Label>Design Theme</Label>
                                    <RadioGroup
                                        value={formData.theme}
                                        onValueChange={(val: any) => setFormData({ ...formData, theme: val })}
                                        className="flex flex-row gap-4 mt-2"
                                    >
                                        <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer flex-1 justify-center">
                                            <RadioGroupItem value="info" id="r-info" />
                                            <Label htmlFor="r-info" className="flex items-center gap-2 cursor-pointer">
                                                <div className="h-4 w-4 rounded-full bg-blue-500"></div>Blue
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer flex-1 justify-center">
                                            <RadioGroupItem value="warning" id="r-warning" />
                                            <Label htmlFor="r-warning" className="flex items-center gap-2 cursor-pointer">
                                                <div className="h-4 w-4 rounded-full bg-red-500"></div>Red
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer flex-1 justify-center">
                                            <RadioGroupItem value="success" id="r-success" />
                                            <Label htmlFor="r-success" className="flex items-center gap-2 cursor-pointer">
                                                <div className="h-4 w-4 rounded-full bg-green-500"></div>Green
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="expiresAt">Auto-Expire Date & Time (Optional)</Label>
                                        <Input
                                            id="expiresAt"
                                            type="datetime-local"
                                            value={formData.expiresAt || ""}
                                            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                                            className="w-full"
                                        />
                                        <p className="text-[10px] text-muted-foreground leading-tight">Banner will automatically vanish after this exact time.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-b pb-4 mt-2">
                                <div className="space-y-2">
                                    <Label htmlFor="linkUrl">Call to Action URL (Optional)</Label>
                                    <Input
                                        id="linkUrl"
                                        placeholder="e.g. /projects or https://example.com"
                                        value={formData.linkUrl}
                                        onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                                    />
                                    <p className="text-[10px] text-muted-foreground leading-tight">Leave blank to show a text-only banner without a button.</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="linkText">Button Text</Label>
                                    <Input
                                        id="linkText"
                                        placeholder="e.g. Donate Now"
                                        value={formData.linkText}
                                        onChange={(e) => setFormData({ ...formData, linkText: e.target.value })}
                                        disabled={!formData.linkUrl}
                                        className="disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end gap-3 flex-wrap">
                            <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSaving}>Cancel</Button>
                            <Button onClick={handleSave} disabled={isSaving || !formData.message.trim()} className="px-8 bg-black hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 dark:text-black">
                                {isSaving ? "Saving..." : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        {editingId ? "Update Banner" : "Deploy Banner"}
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Banner Management</h1>
                    <p className="text-muted-foreground mt-1">Manage multiple announcement banners assigned to different pages.</p>
                </div>
                <Button onClick={handleOpenCreateForm}>
                    <Plus className="mr-2 h-4 w-4" /> New Banner
                </Button>
            </div>

            <Card className="border shadow-sm">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Megaphone className="h-5 w-5 text-primary" />
                        Active & Inactive Banners
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {banners.length === 0 ? (
                        <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
                            <Type className="h-10 w-10 text-slate-300" />
                            <p>No banners found. Create one to catch your visitors' attention!</p>
                        </div>
                    ) : (
                        <div className="grid divide-y">
                            {banners.map(b => {
                                const isExpired = b.expiresAt && new Date(b.expiresAt) < new Date();
                                const pageLabel = PAGE_OPTIONS.find(o => o.value === b.targetPage)?.label || b.targetPage;

                                return (
                                    <div key={b.id} className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:bg-muted/20 transition-colors">

                                        {/* Status Switch */}
                                        <div className="shrink-0 flex items-center justify-center p-2">
                                            <Switch
                                                checked={b.isActive}
                                                onCheckedChange={() => handleToggleActive(b.id!, b.isActive)}
                                                className="data-[state=checked]:bg-green-500"
                                            />
                                        </div>

                                        {/* Content Preview */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <Badge variant="outline" className={`shrink-0 capitalize ${b.theme === 'warning' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        b.theme === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            'bg-blue-50 text-blue-700 border-blue-200'
                                                    }`}>
                                                    {b.theme}
                                                </Badge>
                                                <span className="text-xs font-semibold text-muted-foreground">• Target: {pageLabel}</span>
                                                {isExpired && <Badge variant="destructive" className="text-[10px]">Expired</Badge>}
                                                {!b.isActive && !isExpired && <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-sm font-semibold flex items-center gap-1"><EyeOff className="h-3 w-3" /> Hidden</span>}
                                                {b.isActive && !isExpired && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-sm font-semibold flex items-center gap-1"><Eye className="h-3 w-3" /> Public</span>}
                                            </div>
                                            <p className="text-sm font-medium line-clamp-2 leading-relaxed">{b.message}</p>

                                            <div className="flex items-center gap-4 mt-2">
                                                {b.linkUrl && (
                                                    <span className="text-xs text-muted-foreground truncate">🔗 {b.linkText || "Link"}</span>
                                                )}
                                                {b.expiresAt && (
                                                    <span className="text-xs text-muted-foreground opacity-80 border-l pl-4">⏳ Expires: {new Date(b.expiresAt).toLocaleString()}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditForm(b)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(b.id!)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
