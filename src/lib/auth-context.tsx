"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, setDoc, onSnapshot, collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, sendPasswordResetEmail, updatePassword, deleteUser, updateEmail } from "firebase/auth";
import { ActivityLogService } from "@/lib/activity-log-service";

// Roles can be 'admin', 'moderator', 'member'
type UserRole = "admin" | "moderator" | "member";

export interface User {
    id: string;
    username: string;
    name: string;
    email: string;
    roles: string[]; // Changed from single role to array
    phone?: string;
    photoURL?: string;
    createdAt?: any;
}

interface AuthContextType {
    user: User | null;
    login: (identifier: string, isPassword?: string, isAdminLogin?: boolean) => Promise<{ success: boolean; error?: string }>;
    loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
    logout: () => void;
    submitRegistrationRequest: (data: any) => Promise<{ success: boolean; error?: string }>;
    getRegistrationRequests: () => Promise<any[]>;
    approveRegistrationRequest: (requestId: string, data: any) => Promise<{ success: boolean; error?: string }>;
    rejectRegistrationRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
    isLoading: boolean;
    changePassword: (newPassword: string, oldPassword?: string) => Promise<boolean>;
    requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string; code?: string }>;
    resetPasswordWithCode: (email: string, code: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
    updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
    adminUpdateUser: (userId: string, data: Partial<User> & { password?: string, isAdmin?: boolean }) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check session storage for existing session
        const storedUser = sessionStorage.getItem("auth_user");
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                // Migration for legacy user objects without 'roles'
                if (!parsedUser.roles || !Array.isArray(parsedUser.roles)) {
                    parsedUser.roles = parsedUser.role ? [parsedUser.role] : ["member"];
                }
                setUser(parsedUser);
            } catch (e) {
                console.error("Failed to parse stored user", e);
                sessionStorage.removeItem("auth_user");
            }
        }
        setIsLoading(false);
    }, []);

    // Real-time synchronization for the currently logged-in user
    useEffect(() => {
        const currentUserId = user?.id;
        if (!currentUserId) return;

        const userDocRef = doc(db, "users", currentUserId);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data();

                setUser(prev => {
                    if (!prev) return prev;

                    const updatedUser: User = {
                        ...prev,
                        ...userData,
                        id: docSnap.id,
                        roles: Array.isArray(userData.roles) ? userData.roles :
                            (userData.role ? [userData.role] : (prev.roles || ["member"]))
                    };

                    // Only update session storage if meaningful data changed, ignore lastActiveAt ping
                    const prevForCompare = { ...prev, lastActiveAt: undefined };
                    const nextForCompare = { ...updatedUser, lastActiveAt: undefined };

                    if (JSON.stringify(prevForCompare) !== JSON.stringify(nextForCompare)) {
                        sessionStorage.setItem("auth_user", JSON.stringify(updatedUser));
                        return updatedUser;
                    }
                    return prev;
                });
            }
        });

        return () => unsubscribe();
    }, [user?.id]);

    // Track User Online Presence
    useEffect(() => {
        if (!user?.id) return;

        const updatePresence = async () => {
            try {
                const userDocRef = doc(db, "users", user.id);
                // Also update the admins collection safely if they are an admin
                if (user.roles.includes("admin")) {
                    const adminsRef = collection(db, "admins");
                    const q = query(adminsRef, where("email", "==", user.email || ""));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        await updateDoc(doc(db, "admins", snap.docs[0].id), { lastActiveAt: Date.now() });
                    }
                }
                await updateDoc(userDocRef, { lastActiveAt: Date.now() });
            } catch (error) {
                console.error("Failed to update user presence", error);
            }
        };

        // Ping immediately on mount/login
        updatePresence();

        // Ping every 5 minutes (300000 ms) while session is active
        const intervalId = setInterval(updatePresence, 300000);

        return () => clearInterval(intervalId);
    }, [user?.id]);

    // --- GOOGLE AUTHENTICATION ---
    const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const fbUser = result.user;

            // 1. Check if user exists in our active Firestore users collection
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", fbUser.email));
            const snapshot = await getDocs(q);

            let userData: any;
            let userId = "";

            if (snapshot.empty) {
                // If they are not in the active database, check if they were explicitly banned
                const bannedRef = collection(db, "banned_emails");
                const bannedQ = query(bannedRef, where("email", "==", fbUser.email));
                const bannedSnap = await getDocs(bannedQ);

                if (!bannedSnap.empty) {
                    // Sign them out of Firebase Auth silently
                    try { await auth.signOut(); } catch (e) { /* ignore */ }
                    setIsLoading(false);
                    return { success: false, error: "Your account was removed by an administrator. Please submit a new membership request or contact an admin to regain access." };
                }

                // Otherwise, normal Membership Gatekeeping: Reject auto-registration
                if (fbUser) {
                    try {
                        await deleteUser(fbUser);
                    } catch (e) {
                        console.error("Failed to delete unauthorized Firebase Auth user", e);
                    }
                }
                setIsLoading(false);
                return { success: false, error: "Your account has not been registered or approved by an admin yet." };
            } else {
                const userDoc = snapshot.docs[0];
                userData = userDoc.data();
                userId = userDoc.id;
            }

            // Parse roles securely
            let roles: string[] = ["member"]; // Default minimum
            if (userData.roles && Array.isArray(userData.roles)) {
                roles = userData.roles;
            } else if (userData.role) {
                roles = [userData.role];
            }

            // Strict checking: Google Login never starts an Admin session unless explicitly caught
            // For now, strip admin role during regular Google login to be safe unless they are in admins db
            // (We will allow admin via standard email/password form to be safest)
            roles = roles.filter(r => r !== "admin");
            if (roles.length === 0) roles.push("member");

            const authenticatedUser: User = {
                id: userId,
                name: userData.name || fbUser.displayName,
                email: userData.email,
                username: userData.username,
                roles: roles,
                phone: userData.phone || "",
                photoURL: userData.photoURL || fbUser.photoURL || ""
            };

            setUser(authenticatedUser);
            sessionStorage.setItem("auth_user", JSON.stringify(authenticatedUser));
            router.push("/profile");
            setIsLoading(false);
            return { success: true };

        } catch (error: any) {
            setIsLoading(false);
            if (error.code === 'auth/popup-closed-by-user') {
                return { success: false, error: "" }; // Silent fail if user simply closed the window
            }
            console.error("Google Login failed:", error);
            return { success: false, error: error.message || "Google Login failed" };
        }
    };

    // --- EMAIL / PASSWORD LOGINS ---
    const login = async (identifier: string, password?: string, isAdminLogin: boolean = false): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        try {
            // Because identifier can be an email OR a username, we must resolve it to an email for Firebase Auth.
            let emailToUse = identifier;

            if (!identifier.includes("@")) {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("username", "==", identifier));
                const snap = await getDocs(q);
                if (snap.empty) {
                    setIsLoading(false);
                    return { success: false, error: "Username not found" };
                }
                emailToUse = snap.docs[0].data().email;
            }

            if (!password) {
                setIsLoading(false);
                return { success: false, error: "Password is required" };
            }

            // Check if the email is banned (previously deleted member)
            if (!isAdminLogin) {
                const bannedRef = collection(db, "banned_emails");
                const bannedQ = query(bannedRef, where("email", "==", emailToUse));
                const bannedSnap = await getDocs(bannedQ);
                if (!bannedSnap.empty) {
                    setIsLoading(false);
                    return { success: false, error: "Your account was removed by an administrator. Please submit a new membership request or contact an admin to regain access." };
                }
            }

            // Attempt true Firebase authentication first, ONLY IF we have an email
            let firebaseAuthSuccess = false;
            if (emailToUse) {
                try {
                    await signInWithEmailAndPassword(auth, emailToUse, password);
                    firebaseAuthSuccess = true;
                    console.log("Firebase Auth Sign-In Successful");
                } catch (authError: any) {
                    console.warn("Firebase Auth failed (might be legacy user):", authError.message);
                    // We don't fail immediately because they might be a legacy plaintext user not yet migrated to Auth
                }
            } else {
                console.log("No email provided, falling back directly to Firestore DB authentication");
            }

            // Now, regardless of auth provider success, we verify their roles in Firestore
            if (isAdminLogin) {
                const adminsRef = collection(db, "admins");
                const q = query(adminsRef, where("email", "==", emailToUse));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    setIsLoading(false);
                    return { success: false, error: "Admin account not found" };
                }

                const adminDoc = snapshot.docs[0];
                const adminData = adminDoc.data();

                // Gather user profile if exists (we do this BEFORE password check so we can use the most recent password from users collection, not the stale admins collection)
                const usersRef = collection(db, "users");
                const userQ = query(usersRef, where("email", "==", emailToUse));
                const userSnap = await getDocs(userQ);

                let userProfile: any = {};
                let userId = adminDoc.id;

                if (!userSnap.empty) {
                    userProfile = userSnap.docs[0].data();
                    userId = userSnap.docs[0].id;
                }

                // MODIFIED: Always verify against Firestore password if it exists to enforce database-side resets
                // Prioritize userProfile.password because that's where change requests go
                const activePassword = userProfile.password || adminData.password;

                if (activePassword && activePassword !== password) {
                    setIsLoading(false);
                    return { success: false, error: "Invalid admin credentials" };
                }

                if (!firebaseAuthSuccess && !activePassword) {
                    setIsLoading(false);
                    return { success: false, error: "Invalid admin credentials" };
                }

                if (!firebaseAuthSuccess) {
                    console.log("Legacy Admin Authenticated via Firestore.");
                }

                const roles = ["admin"];
                if (userProfile.roles && Array.isArray(userProfile.roles)) {
                    userProfile.roles.forEach((r: string) => {
                        if (!roles.includes(r)) roles.push(r);
                    });
                }

                const authenticatedUser: User = {
                    id: userId,
                    username: adminData.username || userProfile.username || identifier,
                    name: userProfile.name || adminData.name || "Admin",
                    email: adminData.email,
                    roles: roles,
                    phone: userProfile.phone || adminData.phone,
                    photoURL: userProfile.photoURL || adminData.photoURL
                };

                setUser(authenticatedUser);
                sessionStorage.setItem("auth_user", JSON.stringify(authenticatedUser));
                ActivityLogService.logActivity(authenticatedUser.id, authenticatedUser.name || authenticatedUser.username, "Login", "Admin logged in");
                router.push("/admin");
                setIsLoading(false);
                return { success: true };

            } else {
                // Regular User Check
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("email", "==", emailToUse));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    setIsLoading(false);
                    return { success: false, error: "User profile not found in database" };
                }

                const userDoc = snapshot.docs[0];
                const userData = userDoc.data();

                // MODIFIED: Always verify against Firestore password if it exists to enforce database-side resets
                if (userData.password && userData.password !== password) {
                    setIsLoading(false);
                    return { success: false, error: "Invalid password" };
                }

                if (!firebaseAuthSuccess && !userData.password) {
                    setIsLoading(false);
                    return { success: false, error: "Invalid password" };
                }

                if (!firebaseAuthSuccess) {
                    console.log("Legacy User Authenticated via Firestore.");
                }

                let roles: string[] = [];
                if (userData.roles && Array.isArray(userData.roles)) {
                    roles = userData.roles;
                } else if (userData.role) {
                    roles = [userData.role];
                }

                // Strip admin role from basic login
                roles = roles.filter(r => r !== "admin");
                if (roles.length === 0) roles.push("member");

                const authenticatedUser: User = {
                    id: userDoc.id,
                    name: userData.name,
                    email: userData.email,
                    username: userData.username,
                    roles: roles,
                    phone: userData.phone,
                    photoURL: userData.photoURL
                };

                // FIX 1: If user signed in via Firebase Auth successfully, sync the password
                // they just used into Firestore so the admin Members tab stays up-to-date,
                // and the legacy plaintext fallback can no longer accept an outdated password.
                // FIX 1: If user signed in via Firebase Auth successfully OR explicitly via Firestore only (no email),
                // sync the password they just used into Firestore so the admin Members tab stays up-to-date,
                // and the legacy plaintext fallback can no longer accept an outdated password.
                if (firebaseAuthSuccess || !emailToUse) {
                    try {
                        await updateDoc(userDoc.ref, { password });
                    } catch (e) {
                        console.warn("Could not sync password to Firestore:", e);
                    }
                }

                setUser(authenticatedUser);
                sessionStorage.setItem("auth_user", JSON.stringify(authenticatedUser));
                router.push("/profile");
                setIsLoading(false);
                return { success: true };
            }

        } catch (error: any) {
            console.error("Login failed:", error);
            setIsLoading(false);
            return { success: false, error: error.message || "Login failed due to system error" };
        }
    };

    const submitRegistrationRequest = async (data: any): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        try {
            const usersRef = collection(db, "users");

            // Only check email uniqueness if email is provided
            if (data.email) {
                const q = query(usersRef, where("email", "==", data.email));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    setIsLoading(false);
                    return { success: false, error: "User with this email already exists" };
                }

                const requestsRef = collection(db, "registration_requests");
                const q2 = query(requestsRef, where("email", "==", data.email));
                const snapshot2 = await getDocs(q2);

                const hasPending = snapshot2.docs.some(doc => doc.data().status === "pending");
                if (hasPending) {
                    setIsLoading(false);
                    return { success: false, error: "A request with this email is already pending" };
                }
            }

            const requestsRef = collection(db, "registration_requests");

            // Check username uniqueness in 'users'
            const q3 = query(usersRef, where("username", "==", data.username));
            const snapshot3 = await getDocs(q3);
            if (!snapshot3.empty) {
                setIsLoading(false);
                return { success: false, error: "Username already taken" };
            }

            await addDoc(requestsRef, {
                ...data,
                status: "pending",
                createdAt: new Date().toISOString()
            });
            setIsLoading(false);
            return { success: true };
        } catch (error) {
            console.error("Submission failed:", error);
            setIsLoading(false);
            return { success: false, error: "Submission failed" };
        }
    }

    const getRegistrationRequests = async () => {
        if (!user || (!user.roles.includes('admin') && !user.roles.includes('moderator'))) return [];
        try {
            const requestsRef = collection(db, "registration_requests");
            const q = query(requestsRef, where("status", "==", "pending"));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error fetching requests:", error);
            return [];
        }
    }

    const approveRegistrationRequest = async (requestId: string, userData: any): Promise<{ success: boolean; error?: string }> => {
        if (!user || !user.roles.includes('admin')) return { success: false, error: "Unauthorized" };
        try {
            // Prevent double-submissions!
            const requestRef = doc(db, "registration_requests", requestId);
            const requestSnap = await getDoc(requestRef);
            if (!requestSnap.exists() || requestSnap.data().status !== "pending") {
                return { success: false, error: "This request has already been processed." };
            }

            const usersRef = collection(db, "users");
            // Generate temporary password
            const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);

            // Default new users to 'member' role if not specified, stored in roles array
            const newUserRef = await addDoc(usersRef, {
                ...userData,
                password: tempPassword,
                roles: ["member"],
                createdAt: new Date().toISOString()
            });

            await updateDoc(requestRef, { status: "approved" });

            // Send In-App Welcome Notification
            await addDoc(collection(db, "notifications"), {
                userId: newUserRef.id,
                message: "Welcome! Your account has been approved. You can now access member features.",
                type: "success",
                read: false,
                createdAt: Timestamp.now()
            });

            // Send actual Zoho Email Notification
            if (userData.email) {
                try {
                    await fetch('/api/email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: userData.email,
                            subject: 'Welcome to Rangdhanu Charity - Account Approved',
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                    <h2>Welcome to Rangdhanu Charity, ${userData.name || 'Member'}!</h2>
                                    <p>Your membership registration has been approved by our team.</p>
                                    <p>You can now log in to the portal using your email or username.</p>
                                    <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                        <p style="margin: 0;"><strong>Username:</strong> ${userData.username}</p>
                                        <p style="margin: 5px 0 0 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
                                    </div>
                                    <p><em>Please secure your account by changing this password in your profile settings after logging in, or simply link your Google account.</em></p>
                                    <p>Thank you for joining our mission.</p>
                                </div>
                            `
                        })
                    });
                } catch (emailError) {
                    console.error("Failed to send welcome email via Zoho API:", emailError);
                    // We don't fail the whole approval process if just the email fails
                }
            }

            return { success: true };
        } catch (error) {
            console.error("Approval failed:", error);
            return { success: false, error: "Approval failed" };
        }
    }

    const rejectRegistrationRequest = async (requestId: string): Promise<{ success: boolean; error?: string }> => {
        if (!user || !user.roles.includes('admin')) return { success: false, error: "Unauthorized" };
        try {
            const requestSnap = await getDoc(doc(db, "registration_requests", requestId));
            const requestData = requestSnap.exists() ? requestSnap.data() : null;

            await updateDoc(doc(db, "registration_requests", requestId), { status: "rejected" });

            // Send rejection email if the request had an email
            if (requestData?.email) {
                try {
                    await fetch('/api/email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: requestData.email,
                            subject: 'Membership Application Update - Rangdhanu Charity',
                            html: `
                                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                                    <h2>Application Status Update</h2>
                                    <p>Dear ${requestData.name || 'Applicant'},</p>
                                    <p>Thank you for your interest in joining Rangdhanu Charity. After careful review, we were unable to approve your membership application at this time.</p>
                                    <p>If you believe this is a mistake or would like more information, please contact us directly.</p>
                                    <p>Best regards,<br/><strong>Team Rangdhanu</strong></p>
                                </div>
                            `
                        })
                    });
                } catch (e) {
                    console.error("Failed to send rejection email:", e);
                }
            }

            return { success: true };
        } catch (error) {
            console.error("Rejection failed:", error);
            return { success: false, error: "Rejection failed" };
        }
    }

    const changePassword = async (newPassword: string, oldPassword?: string): Promise<boolean> => {
        if (!user) return false;
        try {
            let success = false;

            // 1. Attempt to update 'users' password if they have a user profile (Primary Source of Truth)
            const userDocRef = doc(db, "users", user.id);
            const userSnap = await getDoc(userDocRef);

            if (userSnap.exists()) {
                if (oldPassword && userSnap.data().password !== oldPassword) {
                    return false; // Old password doesn't match primary database
                }
                await updateDoc(userDocRef, { password: newPassword });
                success = true;
            }

            // 2. Also attempt to update Firebase Auth if logged in there natively
            if (auth.currentUser) {
                try {
                    // Must import updatePassword dynamically to avoid top-level issues if not used
                    const { updatePassword: fUpdatePassword } = await import("firebase/auth");
                    await fUpdatePassword(auth.currentUser, newPassword);
                } catch (e) {
                    console.warn("Could not sync to Firebase Auth directly. Might require re-authentication.", e);
                }
            }

            // 3. Sync to 'admins' collection if applicable (Secondary Legacy Source of Truth)
            if (user.roles.includes('admin') || user.email) {
                const adminsRef = collection(db, "admins");
                const q = query(adminsRef, where("email", "==", user.email));
                const snap = await getDocs(q);

                if (!snap.empty) {
                    const adminDoc = snap.docs[0];
                    // If the primary user document failed or didn't exist, we use the admins doc as fallback truth
                    if (!success && oldPassword && adminDoc.data().password !== oldPassword) {
                        return false;
                    }

                    // Force sync the legacy admin doc
                    await updateDoc(doc(db, "admins", adminDoc.id), { password: newPassword });
                    success = true;
                }
            }

            return success;
        } catch (e) {
            console.error("Error changing password:", e);
            return false;
        }
    };

    const updateProfile = async (data: Partial<User>): Promise<{ success: boolean; error?: string }> => {
        if (!user) return { success: false, error: "Not authenticated" };
        try {
            // Check username uniqueness if username is being changed
            if (data.username && data.username !== user.username) {
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("username", "==", data.username));
                const snap = await getDocs(q);
                // Make sure the found doc (if any) is not the current user
                const takenByOther = snap.docs.some(d => d.id !== user.id);
                if (takenByOther) {
                    return { success: false, error: "Username already taken. Please choose a different username." };
                }
            }

            // Update 'users' collection
            await updateDoc(doc(db, "users", user.id), data);

            // FIX 5: If email is being changed, sync it to Firebase Authentication
            if (data.email && data.email !== user.email) {
                const currentFbUser = auth.currentUser;
                if (currentFbUser) {
                    try {
                        await updateEmail(currentFbUser, data.email);
                    } catch (authErr: any) {
                        console.warn("Could not update Firebase Auth email (may need re-authentication):", authErr.message);
                        // Don't fail the whole operation — Firestore is updated
                    }
                }
            }

            // If admin, maybe update 'admins' name/phone if those exist there?
            if (user.roles.includes('admin')) {
                const adminsRef = collection(db, "admins");
                const q = query(adminsRef, where("email", "==", user.email));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const { roles, ...adminSafeData } = data; // Don't write roles to admin doc usually, or do we?
                    // Admin doc has password, username, email. Maybe name/phone.
                    await updateDoc(doc(db, "admins", snap.docs[0].id), adminSafeData);
                }
            }

            const updatedUser = { ...user, ...data };
            setUser(updatedUser);
            sessionStorage.setItem("auth_user", JSON.stringify(updatedUser));

            return { success: true };
        } catch (error) {
            console.error("Error updating profile:", error);
            return { success: false, error: "Failed to update profile" };
        }
    }

    const adminUpdateUser = async (userId: string, data: Partial<User> & { password?: string, isAdmin?: boolean }): Promise<{ success: boolean; error?: string }> => {
        console.log("adminUpdateUser CALLED:", { userId, isAdmin: data.isAdmin, hasPassword: !!data.password });

        if (!user || !user.roles.includes("admin")) return { success: false, error: "Unauthorized" };
        try {
            // Update User Doc first
            const { isAdmin, ...userData } = data;
            const userDocRef = doc(db, "users", userId);

            // Fetch current user to get email/current data for Admin sync
            const currentUserSnap = await getDoc(userDocRef);
            if (!currentUserSnap.exists()) return { success: false, error: "User not found" };
            const currentUserData = currentUserSnap.data();

            if (userData.username && userData.username !== currentUserData.username) {
                // Check username uniqueness in 'users'
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("username", "==", userData.username));
                const snap = await getDocs(q);
                if (!snap.empty) return { success: false, error: "Username already taken" };
            }

            // Check email uniqueness if email is being changed
            if (userData.email && userData.email !== currentUserData.email) {
                const usersRef = collection(db, "users");
                const qEmail = query(usersRef, where("email", "==", userData.email));
                const snapEmail = await getDocs(qEmail);
                if (!snapEmail.empty) return { success: false, error: "Email is already in use by another user" };
            }

            await updateDoc(userDocRef, userData);

            // SYNC WITH ADMINS COLLECTION
            const adminsRef = collection(db, "admins");
            const q = query(adminsRef, where("email", "==", currentUserData.email));
            const adminSnap = await getDocs(q);
            const adminDoc = !adminSnap.empty ? adminSnap.docs[0] : null;

            // Determine effective Admin status
            // If explicit isAdmin is passed, use it. Otherwise, check if 'admin' is in the incoming roles array.
            // If roles array isn't being updated, fall back to whether they currently have an admin doc.
            let shouldBeAdmin = false;
            if (isAdmin !== undefined) {
                shouldBeAdmin = isAdmin;
            } else if (userData.roles) {
                shouldBeAdmin = userData.roles.includes("admin");
            } else {
                shouldBeAdmin = !!adminDoc;
            }

            if (shouldBeAdmin) {
                // Determine Password to Save
                let passwordToSave = data.password; // First choice: explicitly set new password

                if (!passwordToSave) {
                    if (adminDoc) {
                        // If updating existing admin and no new password, KEEP EXISTING checking adminDoc data
                        passwordToSave = adminDoc.data().password;
                    }

                    // If still no password (new admin or adminDoc had none?), fallback to user data
                    if (!passwordToSave) {
                        passwordToSave = currentUserData.password || "admin123";
                    }
                }

                // Prepare Admin Data
                const adminDataToSave = {
                    email: data.email || currentUserData.email,
                    username: data.username || currentUserData.username || currentUserData.email.split('@')[0],
                    password: passwordToSave,
                    name: data.name || currentUserData.name,
                    role: "admin"
                };

                console.log("Syncing Admin Data:", {
                    email: adminDataToSave.email,
                    passwordSource: data.password ? "Input" : (adminDoc ? "ExistingAdmin" : "User/Default"),
                    isNew: !adminDoc
                });

                if (adminDoc) {
                    // Update existing admin doc
                    await updateDoc(doc(db, "admins", adminDoc.id), adminDataToSave);
                } else {
                    // Create new admin doc
                    console.log("Creating NEW Admin Doc for:", adminDataToSave.email);
                    const newAdminRef = await addDoc(adminsRef, adminDataToSave);
                    console.log("Admin Doc Created ID:", newAdminRef.id);
                }
            } else {
                // Should NOT be admin
                if (adminDoc) {
                    await deleteDoc(doc(db, "admins", adminDoc.id));
                }
            }

            // Send In-App Profile Update Notification
            await addDoc(collection(db, "notifications"), {
                userId: userId,
                message: "Your profile details or role have been updated by an administrator.",
                type: "info",
                read: false,
                createdAt: Timestamp.now()
            });
            // NOTE: Email notification is handled separately by the admin UI (with checkbox)
            // to avoid sending duplicate emails.

            return { success: true };
        } catch (error) {
            console.error("Error updating user:", error);
            return { success: false, error: "Failed to update user" };
        }
    }

    const requestPasswordReset = async (email: string): Promise<{ success: boolean; error?: string; code?: string }> => {
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setIsLoading(false);
            return { success: true };
        } catch (error: any) {
            console.error("Reset request failed:", error);
            setIsLoading(false);
            return { success: false, error: error.message || "Failed to request reset" };
        }
    }

    const resetPasswordWithCode = async (email: string, code: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
        // Firebase Auth natively handles password resets via emailed links.
        // We deprecate this manual code entry path.
        return { success: false, error: "Please use the password reset link sent to your email to securely change your password." };
    }

    const logout = () => {
        if (user && (user.roles.includes("admin") || user.roles.includes("moderator"))) {
            ActivityLogService.logActivity(user.id, user.name || user.username, "Logout", "Admin logged out");
        }
        setUser(null);
        sessionStorage.removeItem("auth_user");
        router.push("/login");
    };

    return (
        <AuthContext.Provider value={{
            user, login, loginWithGoogle, logout, submitRegistrationRequest, getRegistrationRequests,
            approveRegistrationRequest, rejectRegistrationRequest, isLoading, changePassword,
            requestPasswordReset, resetPasswordWithCode, updateProfile, adminUpdateUser
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
