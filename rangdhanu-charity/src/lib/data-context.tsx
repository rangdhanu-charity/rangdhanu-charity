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
    impactStats: { label: string; value: string | number; icon: string }[];
    // Projects
    addProject: (project: any) => Promise<void>;
    updateProject: (id: string, updatedProject: any) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    // Impact Stats (Keeping LocalStorage for now as it's simple config, or move to a 'settings' collection later if needed)
    updateImpactStat: (index: number, value: string | number) => void;
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
    const [impactStats, setImpactStats] = useState<{ label: string; value: string | number; icon: string }[]>(DEFAULT_IMPACT_STATS);
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

        setIsLoading(false);

        return () => {
            unsubProjects();
            unsubTestimonials();
            unsubTeam();
        };
    }, []);

    // Impact Stats typically might be in a 'settings' collection, but keeping local storage for now to reduce complexity 
    // unless requested to be dynamic from DB too. 
    // Let's migrate stats to a single doc in a 'settings' collection for proper real-time updates later if needed.
    // For now, preserving existing local storage logic for stats to avoid breaking too much at once.
    useEffect(() => {
        const storedStats = localStorage.getItem("impactStats");
        if (storedStats) {
            try {
                const parsed = JSON.parse(storedStats);
                if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0].icon === "string") {
                    setImpactStats(parsed);
                }
            } catch (e) { console.error(e); }
        }
    }, []);
    useEffect(() => { localStorage.setItem("impactStats", JSON.stringify(impactStats)); }, [impactStats]);


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

    // Impact Stats CRUD (Local Only for now)
    const updateImpactStat = (index: number, value: string | number) => {
        const newStats = [...impactStats];
        newStats[index] = { ...newStats[index], value };
        setImpactStats(newStats);
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
