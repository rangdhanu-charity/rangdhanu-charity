"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, updateDoc, doc, addDoc, getDoc, setDoc, deleteDoc, Timestamp, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
    login: (identifier: string, password: string, isAdminLogin?: boolean) => Promise<{ success: boolean; error?: string }>;
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

                    if (JSON.stringify(prev) !== JSON.stringify(updatedUser)) {
                        sessionStorage.setItem("auth_user", JSON.stringify(updatedUser));
                        return updatedUser;
                    }
                    return prev;
                });
            }
        });

        return () => unsubscribe();
    }, [user?.id]);

    const login = async (identifier: string, password: string, isAdminLogin: boolean = false): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        try {
            if (isAdminLogin) {
                // Admin Login: Check 'admins' collection first
                const adminsRef = collection(db, "admins");
                // Check email or username in admins
                let q = query(adminsRef, where("email", "==", identifier));
                let snapshot = await getDocs(q);

                if (snapshot.empty) {
                    // Try querying by username
                    q = query(adminsRef, where("username", "==", identifier));
                    snapshot = await getDocs(q);
                }

                console.log("Admin Login Attempt:", { identifier, found: !snapshot.empty });

                let adminAuthenticated = false;
                let adminDocId = "";
                let adminData: any = {};

                if (!snapshot.empty) {
                    const adminDoc = snapshot.docs[0];
                    adminData = adminDoc.data();

                    console.log("Admin Found:", {
                        email: adminData.email,
                        hasPassword: !!adminData.password,
                        inputPasswordMatch: adminData.password === password
                    });

                    if (adminData.password === password) {
                        adminAuthenticated = true;
                        adminDocId = adminDoc.id;
                    } else {
                        console.warn("Admin Password Mismatch");
                    }
                } else {
                    console.warn("Admin Not Found in 'admins' collection");
                }

                if (adminAuthenticated) {
                    // Admin Authenticated. Now try to fetch detailed profile from 'users' if it exists.
                    // We assume the admin email links to a user profile.
                    const usersRef = collection(db, "users");
                    const userQ = query(usersRef, where("email", "==", adminData.email));
                    const userSnap = await getDocs(userQ);

                    let userProfile: any = {};
                    let userId = adminDocId; // Default to admin ID if no user profile

                    if (!userSnap.empty) {
                        const userDoc = userSnap.docs[0];
                        userProfile = userDoc.data();
                        userId = userDoc.id; // Use the User ID as the main ID
                    }

                    // Merge roles: Admin role + any roles from user profile
                    const roles = ["admin"];
                    if (userProfile.roles && Array.isArray(userProfile.roles)) {
                        userProfile.roles.forEach((r: string) => {
                            if (!roles.includes(r)) roles.push(r);
                        });
                    } else if (userProfile.role) {
                        // Backward compatibility
                        if (!roles.includes(userProfile.role)) roles.push(userProfile.role);
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
                }

                // --- EMERGENCY RECOVERY LOGIC (Runs if adminAuthenticated is false) ---
                console.warn("Attempting Emergency Recovery via 'users' collection...");

                const usersRef = collection(db, "users");
                // Check email or username in 'users'
                let userQ = query(usersRef, where("email", "==", identifier));
                let userSnap = await getDocs(userQ);
                if (userSnap.empty) {
                    userQ = query(usersRef, where("username", "==", identifier));
                    userSnap = await getDocs(userQ);
                }

                if (!userSnap.empty) {
                    const userDoc = userSnap.docs[0];
                    const userData = userDoc.data();

                    // Verify password against User record AND check for 'admin' role
                    if (userData.password === password && userData.roles && userData.roles.includes("admin")) {
                        console.log("EMERGENCY RECOVERY: Valid Admin found in 'users'. Repairing 'admins' collection...");

                        // Repair Admin Doc
                        const adminDataToRestore = {
                            email: userData.email,
                            username: userData.username,
                            password: userData.password,
                            name: userData.name,
                            role: "admin"
                        };

                        // Check if admin doc exists (maybe just password mismatch) or needs creation
                        if (!snapshot.empty) {
                            await updateDoc(doc(db, "admins", snapshot.docs[0].id), adminDataToRestore);
                        } else {
                            await addDoc(collection(db, "admins"), adminDataToRestore);
                        }

                        // Login Success via Recovery
                        const authenticatedUser: User = {
                            id: userDoc.id,
                            username: userData.username,
                            name: userData.name,
                            email: userData.email,
                            roles: userData.roles,
                            phone: userData.phone,
                            photoURL: userData.photoURL
                        };

                        setUser(authenticatedUser);
                        sessionStorage.setItem("auth_user", JSON.stringify(authenticatedUser));
                        ActivityLogService.logActivity(authenticatedUser.id, authenticatedUser.name || authenticatedUser.username, "Login", "Admin logged in via recovery");
                        router.push("/admin");
                        setIsLoading(false);
                        return { success: true };
                    }
                }

                setIsLoading(false);
                return { success: false, error: "Invalid admin credentials (Recovery failed)" };

            } else {
                // Regular User Login: Check 'users' collection
                const usersRef = collection(db, "users");
                let q = query(usersRef, where("email", "==", identifier));
                let snapshot = await getDocs(q);

                if (snapshot.empty) {
                    q = query(usersRef, where("username", "==", identifier));
                    snapshot = await getDocs(q);
                }

                console.log("User Login Attempt:", { identifier, found: !snapshot.empty });

                if (!snapshot.empty) {
                    const userDoc = snapshot.docs[0];
                    const userData = userDoc.data();

                    if (userData.password === password) {
                        // Parse Roles
                        let roles: string[] = [];
                        if (userData.roles && Array.isArray(userData.roles)) {
                            roles = userData.roles;
                        } else if (userData.role) {
                            roles = [userData.role];
                        } else {
                            roles = ["member"];
                        }

                        // STRICT SESSION MASKING: 
                        // If logging in as regular user, REMOVE 'admin' role from session
                        // even if they have it in database.
                        roles = roles.filter(r => r !== "admin");

                        // Ensure they have at least 'member' or 'moderator' to be valid
                        if (roles.length === 0) {
                            roles.push("member");
                        }

                        const authenticatedUser: User = {
                            id: userDoc.id,
                            name: userData.name,
                            email: userData.email,
                            username: userData.username,
                            roles: roles,
                            phone: userData.phone,
                            photoURL: userData.photoURL
                        };

                        setUser(authenticatedUser);
                        sessionStorage.setItem("auth_user", JSON.stringify(authenticatedUser));
                        router.push("/");
                        setIsLoading(false);
                        return { success: true };
                    } else {
                        setIsLoading(false);
                        return { success: false, error: "Invalid password" };
                    }
                } else {
                    setIsLoading(false);
                    return { success: false, error: "User not found" };
                }
            }
        } catch (error) {
            console.error("Login failed:", error);
            setIsLoading(false);
            return { success: false, error: "Login failed due to system error" };
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
                if (!snapshot2.empty) {
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
            const usersRef = collection(db, "users");
            // Default new users to 'member' role if not specified, stored in roles array
            const newUserRef = await addDoc(usersRef, {
                ...userData,
                roles: ["member"],
                createdAt: new Date().toISOString()
            });

            await updateDoc(doc(db, "registration_requests", requestId), { status: "approved" });

            // Send Welcome Notification
            await addDoc(collection(db, "notifications"), {
                userId: newUserRef.id,
                message: "Welcome! Your account has been approved. You can now access member features.",
                type: "success",
                read: false,
                createdAt: Timestamp.now()
            });

            return { success: true };
        } catch (error) {
            console.error("Approval failed:", error);
            return { success: false, error: "Approval failed" };
        }
    }

    const rejectRegistrationRequest = async (requestId: string): Promise<{ success: boolean; error?: string }> => {
        if (!user || !user.roles.includes('admin')) return { success: false, error: "Unauthorized" };
        try {
            await updateDoc(doc(db, "registration_requests", requestId), { status: "rejected" });
            // Cannot notify rejected user as they don't have an account
            return { success: true };
        } catch (error) {
            console.error("Rejection failed:", error);
            return { success: false, error: "Rejection failed" };
        }
    }

    const changePassword = async (newPassword: string, oldPassword?: string): Promise<boolean> => {
        if (!user) return false;
        try {
            // Determine collection based on whether they are logged in as admin
            // However, user.id usually points to 'users' doc. 
            // Only if they are SUPER admin without user profile it might point to admin doc.
            // For simplicity, we check both or prioritize based on roles.

            // If user has 'admin' role, we might need to update password in 'admins' collection too?
            // The constraint is: "separate folder for admin infos like password".
            // So if I am admin, my password IS in 'admins' collection.

            let success = false;

            if (user.roles.includes('admin')) {
                // Try to find admin doc
                const adminsRef = collection(db, "admins");
                const q = query(adminsRef, where("email", "==", user.email));
                const snap = await getDocs(q);

                if (!snap.empty) {
                    const adminDoc = snap.docs[0];
                    // Verify old
                    if (oldPassword && adminDoc.data().password !== oldPassword) return false;

                    await updateDoc(doc(db, "admins", adminDoc.id), { password: newPassword });
                    success = true;
                }
            }

            // Also attempt to update 'users' password if they have a user profile
            // Use user.id as it likely points to the user doc (from login logic)
            const userDocRef = doc(db, "users", user.id);
            const userSnap = await getDoc(userDocRef);

            if (userSnap.exists()) {
                if (oldPassword) {
                    // Only fail if this was the ONLY place (not admin) and it failed
                    if (userSnap.data().password === oldPassword) {
                        await updateDoc(userDocRef, { password: newPassword });
                        success = true;
                    } else if (!success) {
                        // If we didn't update admin (maybe not admin), and this failed, then fail.
                        return false;
                    }
                } else {
                    await updateDoc(userDocRef, { password: newPassword });
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
            // Update 'users' collection
            await updateDoc(doc(db, "users", user.id), data);

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

            await updateDoc(userDocRef, userData);

            // SYNC WITH ADMINS COLLECTION
            const adminsRef = collection(db, "admins");
            const q = query(adminsRef, where("email", "==", currentUserData.email));
            const adminSnap = await getDocs(q);
            const adminDoc = !adminSnap.empty ? adminSnap.docs[0] : null;

            // Determine effective Admin status
            // If passed explicitly, use it. If undefined, use current status (existence of adminDoc)
            const shouldBeAdmin = isAdmin !== undefined ? isAdmin : !!adminDoc;

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

            // Send Profile Update Notification
            await addDoc(collection(db, "notifications"), {
                userId: userId,
                message: "Your profile details or role have been updated by an administrator.",
                type: "info",
                read: false,
                createdAt: Timestamp.now()
            });

            return { success: true };
        } catch (error) {
            console.error("Error updating user:", error);
            return { success: false, error: "Failed to update user" };
        }
    }

    const requestPasswordReset = async (email: string): Promise<{ success: boolean; error?: string; code?: string }> => {
        setIsLoading(true);
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", email));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setIsLoading(false);
                return { success: false, error: "User not found" };
            }

            const userDoc = snapshot.docs[0];
            const code = Math.floor(100000 + Math.random() * 900000).toString();

            await updateDoc(doc(db, "users", userDoc.id), { resetCode: code });
            console.log(`Password reset code for ${email}: ${code}`);

            setIsLoading(false);
            return { success: true, code };
        } catch (error) {
            console.error("Reset request failed:", error);
            setIsLoading(false);
            return { success: false, error: "Failed to request reset" };
        }
    }

    const resetPasswordWithCode = async (email: string, code: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("email", "==", email));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setIsLoading(false);
                return { success: false, error: "User not found" };
            }

            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();

            if (userData.resetCode !== code) {
                setIsLoading(false);
                return { success: false, error: "Invalid code" };
            }

            await updateDoc(doc(db, "users", userDoc.id), {
                password: newPassword,
                resetCode: null
            });

            setIsLoading(false);
            return { success: true };
        } catch (error) {
            console.error("Reset failed:", error);
            setIsLoading(false);
            return { success: false, error: "Failed to reset password" };
        }
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
        <AuthContext.Provider value={{ user, login, logout, submitRegistrationRequest, getRegistrationRequests, approveRegistrationRequest, rejectRegistrationRequest, isLoading, changePassword, requestPasswordReset, resetPasswordWithCode, updateProfile, adminUpdateUser }}>
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
