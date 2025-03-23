import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
    User,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    sendEmailVerification,
    updateProfile
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    signup: (email: string, password: string, displayName: string) => Promise<User | null>;
    login: (email: string, password: string) => Promise<User | null>;
    logout: () => Promise<void>;
    googleSignIn: () => Promise<User | null>;
    resetPassword: (email: string) => Promise<void>;
    verifyEmail: () => Promise<void>;
    updateUserProfile: (displayName: string) => Promise<void>;
    updateUserProfilePicture: (file: File) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Sign up with email and password
    async function signup(email: string, password: string, displayName: string): Promise<User | null> {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Update profile with display name
            await updateProfile(userCredential.user, { displayName });
            // Send email verification
            await sendEmailVerification(userCredential.user);
            toast.success('Account created! Please check your email for verification.');
            return userCredential.user;
        } catch (error) {
            handleAuthError(error);
            return null;
        }
    }

    // Login with email and password
    async function login(email: string, password: string): Promise<User | null> {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            toast.success('Successfully logged in!');
            return userCredential.user;
        } catch (error) {
            handleAuthError(error);
            return null;
        }
    }

    // Logout
    async function logout(): Promise<void> {
        try {
            await signOut(auth);
            toast.success('Successfully logged out');
        } catch (error) {
            handleAuthError(error);
        }
    }

    // Google Sign In
    async function googleSignIn(): Promise<User | null> {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            toast.success('Successfully signed in with Google!');
            return result.user;
        } catch (error) {
            handleAuthError(error);
            return null;
        }
    }

    // Reset Password
    async function resetPassword(email: string): Promise<void> {
        try {
            await sendPasswordResetEmail(auth, email);
            toast.success('Password reset email sent! Check your inbox.');
        } catch (error) {
            handleAuthError(error);
        }
    }

    // Send Email Verification
    async function verifyEmail(): Promise<void> {
        try {
            if (currentUser) {
                await sendEmailVerification(currentUser);
                toast.success('Verification email sent! Check your inbox.');
            } else {
                toast.error('No user is currently logged in.');
            }
        } catch (error) {
            handleAuthError(error);
        }
    }

    // Update user profile
    async function updateUserProfile(displayName: string): Promise<void> {
        try {
            if (currentUser) {
                await updateProfile(currentUser, { displayName });
                toast.success('Profile updated successfully!');
            } else {
                toast.error('No user is currently logged in.');
            }
        } catch (error) {
            handleAuthError(error);
        }
    }

    // Update user profile picture using Firebase Storage instead of base64 in Firestore
    async function updateUserProfilePicture(file: File): Promise<void> {
        try {
            if (!currentUser) {
                toast.error('No user is currently logged in.');
                return;
            }

            // Validate file size (5MB is a reasonable limit for profile pictures)
            const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSizeInBytes) {
                toast.error('File size must be less than 5MB.');
                return;
            }

            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!validTypes.includes(file.type)) {
                toast.error('File must be a JPG, PNG, or GIF image.');
                return;
            }

            // Show uploading toast
            const uploadingToast = toast.loading('Uploading profile picture...');

            try {
                // Import storage-related functions from Firebase
                const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
                const { storage } = await import('../firebase');

                // Create a storage reference
                const storageRef = ref(storage, `profile-images/${currentUser.uid}`);

                // Upload the file to Firebase Storage
                const uploadResult = await uploadBytes(storageRef, file);

                // Get the download URL
                const downloadURL = await getDownloadURL(uploadResult.ref);

                // Update the user's profile with the download URL
                await updateProfile(currentUser, { photoURL: downloadURL });

                // Update the user document in Firestore with the download URL (not the entire image)
                const userDocRef = doc(db, 'users', currentUser.uid);
                try {
                    await updateDoc(userDocRef, {
                        photoURL: downloadURL
                    });
                } catch {
                    // If the document doesn't exist yet, create it
                    await setDoc(userDocRef, {
                        photoURL: downloadURL,
                        displayName: currentUser.displayName || '',
                        email: currentUser.email || '',
                        createdAt: new Date().toISOString()
                    });
                }

                // Dismiss the loading toast and show success
                toast.dismiss(uploadingToast);
                toast.success('Profile picture updated successfully!');
            } catch (error) {
                toast.dismiss(uploadingToast);
                throw error; // Re-throw to be caught by the outer catch
            }
        } catch (error) {
            handleAuthError(error);
        }
    }

    // Handle Firebase Auth errors
    function handleAuthError(error: unknown): void {
        let message = 'An error occurred. Please try again.';

        const firebaseError = error as { code?: string; message?: string };

        if (firebaseError.code) {
            switch (firebaseError.code) {
                case 'auth/email-already-in-use':
                    message = 'This email is already registered.';
                    break;
                case 'auth/invalid-email':
                    message = 'Invalid email address.';
                    break;
                case 'auth/user-not-found':
                    message = 'No account found with this email.';
                    break;
                case 'auth/wrong-password':
                    message = 'Incorrect password.';
                    break;
                case 'auth/weak-password':
                    message = 'Password should be at least 6 characters.';
                    break;
                case 'auth/popup-closed-by-user':
                    message = 'Sign-in popup was closed before completing.';
                    break;
                case 'auth/network-request-failed':
                    message = 'Network error. Check your connection.';
                    break;
                case 'auth/too-many-requests':
                    message = 'Too many attempts. Try again later.';
                    break;
                default:
                    message = firebaseError.message || 'An error occurred. Please try again.';
            }
        }

        toast.error(message);
    }

    // Set up auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        loading,
        signup,
        login,
        logout,
        googleSignIn,
        resetPassword,
        verifyEmail,
        updateUserProfile,
        updateUserProfilePicture
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
} 