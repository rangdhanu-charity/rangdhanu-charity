"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageCropper } from "@/components/image-cropper";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/lib/settings-context";
import { Camera, Trash2, ImageIcon, CheckCircle2 } from "lucide-react";

export default function LogoPage() {
    const { settings, updateSettings } = useSettings();
    const { toast } = useToast();

    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [previewURL, setPreviewURL] = useState<string>("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync preview from settings
    useEffect(() => {
        setPreviewURL(settings.orgLogoURL || "");
    }, [settings.orgLogoURL]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setSelectedImage(reader.result as string);
            setIsCropperOpen(true);
        };
        reader.readAsDataURL(file);
        // Reset input so same file can be picked again
        e.target.value = "";
    };

    const handleCropComplete = async (croppedBlob: Blob) => {
        setIsUploading(true);
        try {
            const apiKey = process.env.NEXT_PUBLIC_IMGBB_API_KEY;
            if (!apiKey) {
                toast({ title: "Configuration Error", description: "ImgBB API key is missing.", variant: "destructive" });
                return;
            }

            // Resize blob to max 200×200 for a compact logo file
            const resizedBlob = await resizeTo200(croppedBlob);

            const formData = new FormData();
            formData.append("image", resizedBlob, "org-logo.webp");

            const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: "POST",
                body: formData
            });
            const data = await response.json();

            if (data.success) {
                const url = data.data.url as string;
                await updateSettings({ orgLogoURL: url });
                setPreviewURL(url);
                setIsCropperOpen(false);
                setSelectedImage("");
                toast({ title: "Logo Updated", description: "Organisation logo saved successfully." });
            } else {
                toast({ title: "Upload Failed", description: data.error?.message || "ImgBB upload failed.", variant: "destructive" });
            }
        } catch (err) {
            console.error("Logo upload error:", err);
            toast({ title: "Error", description: "Failed to upload logo.", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemove = async () => {
        if (!confirm("Remove the organisation logo? The navbar will revert to the default icon.")) return;
        try {
            await updateSettings({ orgLogoURL: "" });
            setPreviewURL("");
            toast({ title: "Logo Removed", description: "Reverted to default icon." });
        } catch {
            toast({ title: "Error", description: "Failed to remove logo.", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Organisation Logo</h2>
                <p className="text-muted-foreground">Upload your organisation logo. It will appear in the navbar across the entire site.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Upload Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Camera className="h-5 w-5 text-primary" />
                            Upload Logo
                        </CardTitle>
                        <CardDescription>
                            Upload a JPEG or PNG file. It will be auto-optimised to a small size suitable for the navbar.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-6">
                        {/* Preview circle */}
                        <div
                            className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-purple-500 to-pink-500 text-white cursor-pointer ring-4 ring-primary/20 hover:ring-primary/60 transition-all"
                            onClick={() => fileInputRef.current?.click()}
                            title="Click to upload logo"
                        >
                            {previewURL ? (
                                <img
                                    src={previewURL}
                                    alt="Organisation Logo"
                                    className="h-full w-full rounded-full object-cover"
                                />
                            ) : (
                                <ImageIcon className="h-10 w-10 opacity-80" />
                            )}
                            <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow">
                                <Camera className="h-4 w-4" />
                            </div>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        <div className="flex gap-3">
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                <Camera className="mr-2 h-4 w-4" />
                                {isUploading ? "Uploading…" : previewURL ? "Change Logo" : "Upload Logo"}
                            </Button>
                            {previewURL && (
                                <Button variant="destructive" onClick={handleRemove} disabled={isUploading}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Info card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            How it works
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <p>• Upload any JPEG, PNG, or WebP image of your logo.</p>
                        <p>• The image will be cropped to a square, then automatically resized to <strong>200×200 px</strong> for fast loading.</p>
                        <p>• The logo is saved to the cloud and instantly appears in the navbar for all users — no redeploy needed.</p>
                        <p>• If no logo is uploaded, the default coloured heart icon is shown instead.</p>
                        <p>• The same logo appears in both the <strong>desktop</strong> navbar and the <strong>mobile</strong> slide-in menu.</p>
                    </CardContent>
                </Card>
            </div>

            <ImageCropper
                open={isCropperOpen}
                imageSrc={selectedImage}
                onClose={() => { setIsCropperOpen(false); setSelectedImage(""); }}
                onCropComplete={handleCropComplete}
                isUploading={isUploading}
            />
        </div>
    );
}

// Helper: resize a Blob to max 200×200 px before upload
async function resizeTo200(blob: Blob): Promise<Blob> {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const size = 200;
            const canvas = document.createElement("canvas");
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(img, 0, 0, size, size);
            canvas.toBlob(
                (resized) => resolve(resized || blob),
                "image/webp",
                0.85 // 85% quality — sharp enough for a small logo
            );
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(blob); };
        img.src = url;
    });
}
