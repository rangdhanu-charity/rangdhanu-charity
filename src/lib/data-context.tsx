"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PROJECTS as DEFAULT_PROJECTS, TESTIMONIALS as DEFAULT_TESTIMONIALS, TEAM_MEMBERS as DEFAULT_TEAM_MEMBERS, IMPACT_STATS as DEFAULT_IMPACT_STATS } from "@/lib/data";

interface DataContextType {
    projects: any[];
    testimonials: any[];
    teamMembers: any[];
    impactStats: { id: string; label: string; value: string | number; icon: string }[];
    // Projects
    addProject: (project: any) => Promise<void>;
    updateProject: (id: string, updatedProject: any) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    // Impact Stats (Keeping LocalStorage for now as it's simple config, or move to a 'settings' collection later if needed)
    updateImpactStat: (id: string, value: string | number) => void;
    // Testimonials
    addTestimonial: (testimonial: any) => Promise<void>;
    deleteTestimonial: (id: string) => Promise<void>;
    // Team
    addTeamMember: (member: any) => Promise<void>;
    deleteTeamMember: (id: string) => Promise<void>;
    isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
    const [projects, setProjects] = useState<any[]>([]);
    const [testimonials, setTestimonials] = useState<any[]>([]);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [impactStats, setImpactStats] = useState<{ id: string; label: string; value: string | number; icon: string }[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize/Sync Data
    useEffect(() => {
        setIsLoading(true);

        // Projects Listener
        const qProjects = query(collection(db, "projects"));
        const unsubProjects = onSnapshot(qProjects, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // If empty (first run), we could seed data, but for now we just show empty or what's there
            // To prevent empty state on first load for demo:
            if (data.length === 0 && !localStorage.getItem("seeded_projects")) {
                // Optional: Seed default projects if needed, or just let user add them.
                // For now, let's stick to valid DB data.
                setProjects(DEFAULT_PROJECTS);
            } else {
                setProjects(data.length > 0 ? data : DEFAULT_PROJECTS);
            }
        }, (error) => {
            console.error("Error fetching projects:", error);
            setProjects(DEFAULT_PROJECTS); // Fallback
        });

        // Testimonials Listener
        const qTestimonials = query(collection(db, "testimonials"));
        const unsubTestimonials = onSnapshot(qTestimonials, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTestimonials(data.length > 0 ? data : DEFAULT_TESTIMONIALS);
        }, (error) => {
            console.error("Error fetching testimonials:", error);
            setTestimonials(DEFAULT_TESTIMONIALS);
        });

        // Team Listener
        const qTeam = query(collection(db, "team"));
        const unsubTeam = onSnapshot(qTeam, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTeamMembers(data.length > 0 ? data : DEFAULT_TEAM_MEMBERS);
        }, (error) => {
            console.error("Error fetching team:", error);
            setTeamMembers(DEFAULT_TEAM_MEMBERS);
        });

        // Impact Stats Listener
        const qStats = query(collection(db, "stats"));
        const unsubStats = onSnapshot(qStats, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string; label: string; value: string | number; icon: string }));
            // Sort by creation or label if needed, for consistency
            setImpactStats(data.length > 0 ? data : DEFAULT_IMPACT_STATS.map((s, i) => ({ ...s, id: `default-${i}` })));
        }, (error) => {
            console.error("Error fetching stats:", error);
            setImpactStats(DEFAULT_IMPACT_STATS.map((s, i) => ({ ...s, id: `default-${i}` })));
        });

        setIsLoading(false);

        return () => {
            unsubProjects();
            unsubTestimonials();
            unsubTeam();
            unsubStats();
        };
    }, []);

    // LocalStorage effect removed as we are now using Firestore


    // Project CRUD
    const addProject = async (project: any) => {
        try {
            await addDoc(collection(db, "projects"), project);
        } catch (e) {
            console.error("Error adding project: ", e);
            alert("Failed to add project. Check console/permissions.");
        }
    };
    const updateProject = async (id: string, updatedProject: any) => {
        try {
            await updateDoc(doc(db, "projects", id), updatedProject);
        } catch (e) {
            console.error("Error updating project: ", e);
        }
    };
    const deleteProject = async (id: string) => {
        try {
            await deleteDoc(doc(db, "projects", id));
        } catch (e) {
            console.error("Error deleting project: ", e);
        }
    };

    // Impact Stats CRUD
    const updateImpactStat = async (id: string, value: string | number) => {
        try {
            // Find the doc with this ID
            await updateDoc(doc(db, "stats", id), { value });
        } catch (e) {
            console.error("Error updating stat: ", e);
        }
    };

    // Testimonial CRUD
    const addTestimonial = async (testimonial: any) => {
        try {
            await addDoc(collection(db, "testimonials"), testimonial);
        } catch (e) {
            console.error(e);
        }
    };
    const deleteTestimonial = async (id: string) => {
        try {
            await deleteDoc(doc(db, "testimonials", id));
        } catch (e) {
            console.error(e);
        }
    };

    // Team CRUD
    const addTeamMember = async (member: any) => {
        try {
            await addDoc(collection(db, "team"), member);
        } catch (e) {
            console.error(e);
        }
    };
    const deleteTeamMember = async (id: string) => {
        try {
            await deleteDoc(doc(db, "team", id));
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <DataContext.Provider
            value={{
                projects,
                testimonials,
                teamMembers,
                impactStats,
                addProject,
                updateProject,
                deleteProject,
                updateImpactStat,
                addTestimonial,
                deleteTestimonial,
                addTeamMember,
                deleteTeamMember,
                isLoading
            }}
        >
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
}
