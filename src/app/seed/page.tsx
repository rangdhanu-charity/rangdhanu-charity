"use client";

import { useEffect, useState } from "react";
import { collection, writeBatch, doc, getDocs, query, where, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PROJECTS, TESTIMONIALS, TEAM_MEMBERS, IMPACT_STATS } from "@/lib/data";

export default function SeedPage() {
    const [status, setStatus] = useState<string>("Initializing...");
    const [loading, setLoading] = useState<boolean>(true);

    const seedData = async () => {
        try {
            setStatus("Checking existing data...");
            const batch = writeBatch(db);
            let operationsCount = 0;

            // Projects
            const projectsRef = collection(db, "projects");
            const projectsSnapshot = await getDocs(projectsRef);
            if (projectsSnapshot.empty) {
                setStatus("Seeding projects...");
                PROJECTS.forEach((project) => {
                    const docRef = doc(projectsRef); // Auto-ID
                    // remove id from object if it exists to avoid confusion, or keep it if needed for reference, 
                    // but Firestore IDs are better. Let's start fresh.
                    const { id, ...data } = project;
                    batch.set(docRef, data);
                    operationsCount++;
                });
            } else {
                setStatus((prev) => prev + " Projects already exist. Skipping. ");
            }

            // Testimonials
            const testimonialsRef = collection(db, "testimonials");
            const testimonialsSnapshot = await getDocs(testimonialsRef);
            if (testimonialsSnapshot.empty) {
                setStatus((prev) => prev + " Seeding testimonials...");
                TESTIMONIALS.forEach((item) => {
                    const docRef = doc(testimonialsRef);
                    const { id, ...data } = item;
                    batch.set(docRef, data);
                    operationsCount++;
                });
            }

            // Team Members
            const teamRef = collection(db, "team");
            const teamSnapshot = await getDocs(teamRef);
            if (teamSnapshot.empty) {
                setStatus((prev) => prev + " Seeding team members...");
                TEAM_MEMBERS.forEach((item) => {
                    const docRef = doc(teamRef);
                    const { id, ...data } = item;
                    batch.set(docRef, data);
                    operationsCount++;
                });
            }

            // Impact Stats (New collection 'stats')
            // We'll store them as individual documents with ID matching their label or just auto-ID
            const statsRef = collection(db, "stats");
            const statsSnapshot = await getDocs(statsRef);
            if (statsSnapshot.empty) {
                setStatus((prev) => prev + " Seeding impact stats...");
                IMPACT_STATS.forEach((item) => {
                    const docRef = doc(statsRef);
                    batch.set(docRef, item);
                    operationsCount++;
                });
            }

            // Create Default Admin User
            const usersRef = collection(db, "users");
            const qAdmin = query(usersRef, where("role", "==", "admin"));
            const adminSnapshot = await getDocs(qAdmin);

            if (adminSnapshot.empty) {
                setStatus((prev) => prev + " Creating default admin user...");
                await addDoc(usersRef, {
                    name: "System Admin",
                    username: "admin",
                    email: "admin@rangdhanu.org",
                    role: "admin",
                    password: "admin", // Default password
                    createdAt: new Date().toISOString()
                });
                operationsCount++;
            } else {
                setStatus((prev) => prev + " Admin user already exists. ");
            }


            if (operationsCount > 0) {
                await batch.commit();
                setStatus((prev) => prev + " Done! Seeded " + operationsCount + " documents.");
            } else {
                setStatus((prev) => prev + " Nothing to seed.");
            }

        } catch (error) {
            console.error("Seeding error:", error);
            setStatus("Error: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8">
            <h1 className="text-2xl font-bold mb-4">Database Seeder</h1>
            <div className="p-4 border rounded bg-muted w-full max-w-lg">
                <p className="whitespace-pre-wrap">{status}</p>
            </div>
            <button
                onClick={seedData}
                disabled={!loading && status.includes("Done")}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
            >
                {loading ? "Ready to Seed" : "Retry Seeding"}
            </button>
            {/* Auto-start mechanism if needed, but manual button is safer for now */}
            <script dangerouslySetInnerHTML={{ __html: `// Auto-run logic could go here` }} />
        </div>
    );
}
