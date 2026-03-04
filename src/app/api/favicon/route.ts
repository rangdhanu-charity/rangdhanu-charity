import { NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// GET /api/favicon — redirects to the current org logo, or returns 404
export async function GET() {
    try {
        const docRef = doc(db, "system_settings", "general");
        const snap = await getDoc(docRef);
        const logoURL: string = snap.exists() ? (snap.data()?.orgLogoURL || "") : "";

        if (logoURL) {
            // Redirect browser to the actual image URL
            return NextResponse.redirect(logoURL, { status: 302 });
        }
    } catch (e) {
        console.error("favicon route error:", e);
    }
    // Fallback: 204 No Content (browser will keep previous favicon)
    return new NextResponse(null, { status: 204 });
}
