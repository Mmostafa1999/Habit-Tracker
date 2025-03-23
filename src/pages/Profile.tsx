import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import UserAvatar from '../components/ui/UserAvatar';
import toast from 'react-hot-toast';
import { ref, uploadBytesResumable, getDownloadURL, UploadTask, listAll, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';
import { updateProfile } from 'firebase/auth';

// Define a custom error type that includes the code property
interface FirebaseError extends Error {
    code?: string;
}

const Profile: React.FC = () => {
    const { currentUser, verifyEmail, updateUserProfile } = useAuth();
    const [displayName, setDisplayName] = useState('');
    const [initialDisplayName, setInitialDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const uploadTaskRef = useRef<UploadTask | null>(null);
    const [compressImage, setCompressImage] = useState(true);
    const [uploadAttempts, setUploadAttempts] = useState(0);

    // Set initial values when currentUser changes
    useEffect(() => {
        if (currentUser) {
            setDisplayName(currentUser.displayName || '');
            setInitialDisplayName(currentUser.displayName || '');
        }
    }, [currentUser]);

    // Cleanup upload task on component unmount
    useEffect(() => {
        return () => {
            // Cancel upload if component unmounts during upload
            if (uploadTaskRef.current) {
                uploadTaskRef.current.cancel();
            }
        };
    }, []);

    // Function to validate if any changes were made
    const hasChanges = (): boolean => {
        return initialDisplayName !== displayName || selectedFile !== null;
    }

    // Function to delete old profile images (keep only 3 most recent)
    const cleanupOldProfileImages = async (userId: string, excludeUrl?: string) => {
        try {
            // Get reference to the user's profile images folder
            const profileImagesRef = ref(storage, `profile-images/${userId}`);

            // List all items in the folder
            const result = await listAll(profileImagesRef);

            // If we have more than 3 images (or 2 plus the current one we're preserving)
            const maxImages = excludeUrl ? 3 : 2;
            if (result.items.length > maxImages) {
                console.log(`Found ${result.items.length} profile images, cleaning up old ones...`);

                // Get URLs for all images
                const urlPromises = result.items.map(item => getDownloadURL(item));
                const urls = await Promise.all(urlPromises);

                // Map items to {ref, url, timestamp} based on filename
                const itemsWithMetadata = result.items.map((item, index) => {
                    // Extract timestamp from item name or use index as fallback
                    let timestamp = 0;
                    const name = item.name;
                    const matches = name.match(/profile_(\d+)_/);
                    if (matches && matches[1]) {
                        timestamp = parseInt(matches[1], 10);
                    }

                    return {
                        ref: item,
                        url: urls[index],
                        timestamp: timestamp || index
                    };
                });

                // Sort by timestamp (newest first)
                itemsWithMetadata.sort((a, b) => b.timestamp - a.timestamp);

                // Keep the newest 3 (or exclude current one)
                const itemsToDelete = itemsWithMetadata
                    .slice(maxImages)
                    .filter(item => !excludeUrl || item.url !== excludeUrl);

                // Delete old images
                for (const item of itemsToDelete) {
                    try {
                        await deleteObject(item.ref);
                        console.log(`Deleted old profile image: ${item.ref.name}`);
                    } catch (error) {
                        console.error(`Failed to delete old profile image: ${item.ref.name}`, error);
                    }
                }
            }
        } catch (error) {
            console.error('Error cleaning up old profile images:', error);
            // Don't throw the error, as this is a background cleanup task
        }
    };

    // Function to validate file size and type with additional checks
    const validateFile = (file: File): { valid: boolean; error?: string } => {
        // Validate file existence
        if (!file) {
            return {
                valid: false,
                error: 'No file selected.'
            };
        }

        // Validate file size (5MB limit for Firebase Storage)
        const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSizeInBytes) {
            const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
            return {
                valid: false,
                error: `File size must be less than 5MB. Current size: ${sizeInMB}MB`
            };
        }

        // Validate minimum file size (prevent empty files)
        if (file.size < 100) { // 100 bytes minimum
            return {
                valid: false,
                error: 'File appears to be empty or corrupted.'
            };
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            return {
                valid: false,
                error: 'File must be a JPG, PNG, or GIF image.'
            };
        }

        // Validate filename (to avoid potential issues)
        if (file.name.length > 100) {
            return {
                valid: false,
                error: 'Filename is too long. Please rename your file before uploading.'
            };
        }

        // Check for special characters in filename that might cause issues
        const invalidCharsRegex = /[<>:"/\\|?*]/g; // Removed control characters
        if (invalidCharsRegex.test(file.name)) {
            return {
                valid: false,
                error: 'Filename contains invalid characters. Please rename your file before uploading.'
            };
        }

        return { valid: true };
    };

    // Function to compress image before upload
    const compressImageFile = async (file: File): Promise<File> => {
        if (!compressImage || !file.type.includes('image/')) {
            return file; // Return original file if compression is disabled or not an image
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;

                img.onload = () => {
                    // Create canvas for compression
                    const canvas = document.createElement('canvas');

                    // Calculate new dimensions (max 1200px width or height while maintaining aspect ratio)
                    let width = img.width;
                    let height = img.height;
                    const maxSize = 1200;

                    if (width > height && width > maxSize) {
                        height = Math.round((height * maxSize) / width);
                        width = maxSize;
                    } else if (height > maxSize) {
                        width = Math.round((width * maxSize) / height);
                        height = maxSize;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Get compressed image quality based on original file size
                    let quality = 0.7; // Default quality
                    if (file.size > 3 * 1024 * 1024) quality = 0.6; // Larger files get more compression
                    if (file.size < 1 * 1024 * 1024) quality = 0.8; // Smaller files get less compression

                    // Convert to blob
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Compression failed'));
                                return;
                            }

                            // Create a new File from the blob
                            const compressedFile = new File([blob], file.name, {
                                type: file.type,
                                lastModified: Date.now(),
                            });

                            console.log(`Compressed from ${(file.size / 1024 / 1024).toFixed(2)}MB to ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
                            resolve(compressedFile);
                        },
                        file.type,
                        quality
                    );
                };
                img.onerror = () => reject(new Error('Failed to load image for compression'));
            };
            reader.onerror = () => reject(new Error('Failed to read file for compression'));
        });
    };

    // Function to check internet connectivity
    const checkInternetConnection = async (): Promise<boolean> => {
        try {
            // Use a more reliable method with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

            try {
                // Try multiple endpoints in case one is blocked
                const endpoints = [
                    'https://www.google.com/favicon.ico',
                    'https://www.cloudflare.com/favicon.ico',
                    'https://www.microsoft.com/favicon.ico'
                ];

                // Try each endpoint until one succeeds
                for (const endpoint of endpoints) {
                    try {
                        await fetch(endpoint, {
                            mode: 'no-cors',
                            cache: 'no-cache',
                            method: 'HEAD',
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);
                        return true;
                    } catch {
                        // Try next endpoint
                        console.log(`Failed to connect to ${endpoint}, trying next...`);
                    }
                }

                // If we get here, all endpoints failed
                clearTimeout(timeoutId);
                return false;
            } catch (err) {
                clearTimeout(timeoutId);
                if (err instanceof Error && err.name === 'AbortError') {
                    console.error('Network connectivity check timed out');
                } else {
                    console.error('Network connectivity check failed:', err);
                }
                return false;
            }
        } catch (error) {
            console.error('Network connectivity check failed:', error);
            return navigator.onLine; // Fallback to browser's online status
        }
    };

    // Function to handle profile picture upload with progress tracking
    const uploadProfilePicture = async (file: File): Promise<string> => {
        console.log('Starting profile picture upload...');

        if (!currentUser) {
            throw new Error('No user is currently logged in.');
        }

        // Check for Firebase Storage access issues
        try {
            const testRef = ref(storage, '.test_write_access');
            const testBytes = new Uint8Array([0, 1, 2, 3]);
            await uploadBytesResumable(testRef, testBytes).cancel();
            console.log('Firebase Storage connection verified');
        } catch (error) {
            // If this fails with a specific CORS error, we can inform the user
            if (error instanceof Error && error.toString().includes('CORS')) {
                console.error('Firebase Storage CORS issue detected:', error);
                throw new Error('Connection to storage service is blocked. This may be a network restriction issue.');
            }
        }

        // Check internet connectivity before starting upload
        const isConnected = await checkInternetConnection();
        if (!isConnected) {
            throw new Error('No internet connection. Please check your network and try again.');
        }

        try {
            // Try to compress the image before uploading
            const fileToUpload = await compressImageFile(file);

            return new Promise((resolve, reject) => {
                // Add upload timeout detection
                const uploadTimeoutId = setTimeout(() => {
                    // Cancel the upload if it takes too long
                    if (uploadTaskRef.current) {
                        console.error('Upload timed out after 60 seconds');
                        uploadTaskRef.current.cancel();
                        uploadTaskRef.current = null;
                        reject(new Error('Upload timed out. Please try again with a smaller image or check your internet connection.'));
                    }
                }, 60000); // 60 second timeout

                // Create a network connectivity checker that runs every 5 seconds
                let networkCheckerId: number | null = window.setInterval(async () => {
                    const isStillConnected = await checkInternetConnection();
                    if (!isStillConnected && uploadTaskRef.current) {
                        console.error('Network connection lost during upload');
                        clearInterval(networkCheckerId!);
                        networkCheckerId = null;

                        // Pause the upload rather than cancel it completely
                        try {
                            uploadTaskRef.current.pause();
                            toast.error('Upload paused due to network issues. Upload will resume when connection is restored.');

                            // Start checking for connection restoration
                            const reconnectCheckerId = window.setInterval(async () => {
                                const connectionRestored = await checkInternetConnection();
                                if (connectionRestored && uploadTaskRef.current) {
                                    clearInterval(reconnectCheckerId);
                                    toast.success('Connection restored. Resuming upload...');
                                    uploadTaskRef.current.resume();
                                }
                            }, 3000);

                            // Clear the reconnection checker after 2 minutes if not reconnected
                            setTimeout(() => {
                                clearInterval(reconnectCheckerId);
                                if (uploadTaskRef.current && uploadTaskRef.current.snapshot.state === 'paused') {
                                    uploadTaskRef.current.cancel();
                                    uploadTaskRef.current = null;
                                    setUploading(false);
                                    setUploadProgress(0);
                                    reject(new Error('Network connection could not be restored. Please try again later.'));
                                }
                            }, 120000); // 2 minutes timeout for reconnection
                        } catch (error) {
                            console.error('Error handling network disconnect:', error);
                        }
                    }
                }, 5000);

                try {
                    // Create a storage reference with a unique filename
                    const fileName = `profile_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                    const storageRef = ref(storage, `profile-images/${currentUser.uid}/${fileName}`);

                    // Create metadata
                    const metadata = {
                        contentType: fileToUpload.type,
                        customMetadata: {
                            originalName: file.name,
                            uploadedBy: currentUser.uid,
                            uploadedAt: new Date().toISOString(),
                            compressed: compressImage ? 'true' : 'false'
                        }
                    };

                    // Create the upload task using uploadBytesResumable with metadata
                    const uploadTask = uploadBytesResumable(storageRef, fileToUpload, metadata);
                    uploadTaskRef.current = uploadTask;

                    // Set up progress monitoring
                    uploadTask.on(
                        'state_changed',
                        // Progress observer
                        (snapshot) => {
                            const progress = Math.round(
                                (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                            );
                            console.log(`Upload progress: ${progress}%`);
                            setUploadProgress(progress);

                            // Check if upload is stuck (no progress for 10 seconds)
                            if (progress > 0 && progress < 100) {
                                const currentBytes = snapshot.bytesTransferred;

                                setTimeout(() => {
                                    // If still uploading and bytes haven't changed
                                    if (uploadTaskRef.current &&
                                        uploadTaskRef.current.snapshot.bytesTransferred === currentBytes &&
                                        uploadTaskRef.current.snapshot.state === 'running') {
                                        console.warn('Upload appears to be stuck, checking network...');
                                        checkInternetConnection().then(isConnected => {
                                            if (!isConnected) {
                                                toast.error('Network seems unstable. Upload may be delayed.');
                                            }
                                        });
                                    }
                                }, 10000); // Check after 10 seconds of no progress
                            }
                        },
                        // Error observer
                        (error: unknown) => {
                            clearTimeout(uploadTimeoutId);
                            clearInterval(networkCheckerId!);
                            networkCheckerId = null;
                            console.error('Upload failed:', error);
                            setUploadProgress(0);

                            // Check for specific Firebase Storage errors
                            let errorMessage = 'Failed to upload image.';
                            if (error instanceof Error) { // Check if error is an instance of Error
                                const firebaseError = error as FirebaseError; // Type assertion
                                if (firebaseError.code) { // Access code property safely
                                    switch (firebaseError.code) {
                                        case 'storage/unauthorized':
                                            errorMessage = 'You don\'t have permission to upload files.';
                                            break;
                                        case 'storage/canceled':
                                            errorMessage = 'Upload was canceled.';
                                            break;
                                        case 'storage/retry-limit-exceeded':
                                            errorMessage = 'Upload failed due to network issues. Please try again later.';
                                            break;
                                        case 'storage/invalid-checksum':
                                            errorMessage = 'Upload failed due to file corruption. Please try again with a different file.';
                                            break;
                                        case 'storage/server-file-wrong-size':
                                            errorMessage = 'Upload failed due to a size mismatch. Please try again.';
                                            break;
                                        case 'storage/quota-exceeded':
                                            errorMessage = 'Storage quota exceeded. Please contact support.';
                                            break;
                                        case 'storage/unknown':
                                        default:
                                            errorMessage = 'An error occurred during upload. Please try again.';
                                            break;
                                    }
                                }
                            }

                            reject(new Error(errorMessage));
                        },
                        // Completion observer
                        async () => {
                            try {
                                clearTimeout(uploadTimeoutId);
                                clearInterval(networkCheckerId!);
                                networkCheckerId = null;
                                console.log('Upload completed, getting download URL...');
                                // Get download URL after upload completes
                                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                                console.log('Got download URL:', downloadURL);

                                // Update the user's profile with the download URL
                                await updateProfile(currentUser, { photoURL: downloadURL });
                                console.log('User profile updated with new photo URL');

                                // Reset upload task ref
                                uploadTaskRef.current = null;

                                // Clean up old profile images (keep the most recent ones)
                                try {
                                    await cleanupOldProfileImages(currentUser.uid, downloadURL);
                                } catch (error) {
                                    console.error('Error during cleanup of old profile images:', error);
                                    // Don't throw the error as the upload was successful
                                }

                                // Resolve the promise with the download URL
                                resolve(downloadURL);
                            } catch (error) {
                                console.error('Error getting download URL or updating profile:', error);
                                reject(error);
                            }
                        }
                    );
                } catch (error) {
                    clearTimeout(uploadTimeoutId);
                    if (networkCheckerId) {
                        clearInterval(networkCheckerId);
                        networkCheckerId = null;
                    }
                    console.error('Error starting upload:', error);
                    reject(error);
                }
            });
        } catch (compressionError) {
            console.error('Compression failed, uploading original file:', compressionError);

            // Fall back to original upload if compression fails
            return new Promise((resolve, reject) => {
                // Add upload timeout detection for fallback upload
                const uploadTimeoutId = setTimeout(() => {
                    if (uploadTaskRef.current) {
                        console.error('Fallback upload timed out after 60 seconds');
                        uploadTaskRef.current.cancel();
                        uploadTaskRef.current = null;
                        reject(new Error('Upload timed out. Please try again with a smaller image or check your internet connection.'));
                    }
                }, 60000); // 60 second timeout

                // Create a network connectivity checker for fallback upload
                let networkCheckerId: number | null = window.setInterval(async () => {
                    const isStillConnected = await checkInternetConnection();
                    if (!isStillConnected && uploadTaskRef.current) {
                        console.error('Network connection lost during fallback upload');
                        clearInterval(networkCheckerId!);
                        networkCheckerId = null;

                        // Pause the upload rather than cancel it completely
                        try {
                            uploadTaskRef.current.pause();
                            toast.error('Upload paused due to network issues. Upload will resume when connection is restored.');

                            // Start checking for connection restoration
                            const reconnectCheckerId = window.setInterval(async () => {
                                const connectionRestored = await checkInternetConnection();
                                if (connectionRestored && uploadTaskRef.current) {
                                    clearInterval(reconnectCheckerId);
                                    toast.success('Connection restored. Resuming upload...');
                                    uploadTaskRef.current.resume();
                                }
                            }, 3000);

                            // Clear the reconnection checker after 2 minutes if not reconnected
                            setTimeout(() => {
                                clearInterval(reconnectCheckerId);
                                if (uploadTaskRef.current && uploadTaskRef.current.snapshot.state === 'paused') {
                                    uploadTaskRef.current.cancel();
                                    uploadTaskRef.current = null;
                                    setUploading(false);
                                    setUploadProgress(0);
                                    reject(new Error('Network connection could not be restored. Please try again later.'));
                                }
                            }, 120000); // 2 minutes timeout for reconnection
                        } catch (error) {
                            console.error('Error handling network disconnect in fallback upload:', error);
                        }
                    }
                }, 5000);

                // Create a storage reference with a unique filename
                const fileName = `profile_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
                const storageRef = ref(storage, `profile-images/${currentUser.uid}/${fileName}`);

                // Create metadata
                const metadata = {
                    contentType: file.type,
                    customMetadata: {
                        originalName: file.name,
                        uploadedBy: currentUser.uid,
                        uploadedAt: new Date().toISOString(),
                        compressed: 'false',
                        fallback: 'true'
                    }
                };

                // Create the upload task using uploadBytesResumable with metadata
                const uploadTask = uploadBytesResumable(storageRef, file, metadata);
                uploadTaskRef.current = uploadTask;

                // Set up progress monitoring
                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        const progress = Math.round(
                            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                        );
                        setUploadProgress(progress);

                        // Check if upload is stuck (no progress for 10 seconds)
                        if (progress > 0 && progress < 100) {
                            const currentBytes = snapshot.bytesTransferred;

                            setTimeout(() => {
                                // If still uploading and bytes haven't changed
                                if (uploadTaskRef.current &&
                                    uploadTaskRef.current.snapshot.bytesTransferred === currentBytes &&
                                    uploadTaskRef.current.snapshot.state === 'running') {
                                    console.warn('Fallback upload appears to be stuck, checking network...');
                                    checkInternetConnection().then(isConnected => {
                                        if (!isConnected) {
                                            toast.error('Network seems unstable. Upload may be delayed.');
                                        }
                                    });
                                }
                            }, 10000); // Check after 10 seconds of no progress
                        }
                    },
                    (error: unknown) => {
                        clearTimeout(uploadTimeoutId);
                        clearInterval(networkCheckerId!);
                        networkCheckerId = null;
                        setUploadProgress(0);

                        // Check for specific Firebase Storage errors
                        let errorMessage = 'Failed to upload image.';
                        if (error instanceof Error) { // Check if error is an instance of Error
                            const firebaseError = error as FirebaseError; // Type assertion
                            if (firebaseError.code) { // Access code property safely
                                switch (firebaseError.code) {
                                    case 'storage/unauthorized':
                                        errorMessage = 'You don\'t have permission to upload files.';
                                        break;
                                    case 'storage/canceled':
                                        errorMessage = 'Upload was canceled.';
                                        break;
                                    case 'storage/retry-limit-exceeded':
                                        errorMessage = 'Upload failed due to network issues. Please try again later.';
                                        break;
                                    case 'storage/invalid-checksum':
                                        errorMessage = 'Upload failed due to file corruption. Please try again with a different file.';
                                        break;
                                    case 'storage/server-file-wrong-size':
                                        errorMessage = 'Upload failed due to a size mismatch. Please try again.';
                                        break;
                                    case 'storage/quota-exceeded':
                                        errorMessage = 'Storage quota exceeded. Please contact support.';
                                        break;
                                    case 'storage/unknown':
                                    default:
                                        errorMessage = 'An error occurred during upload. Please try again.';
                                        break;
                                }
                            }
                        }

                        reject(new Error(errorMessage));
                    },
                    async () => {
                        try {
                            clearTimeout(uploadTimeoutId);
                            clearInterval(networkCheckerId!);
                            networkCheckerId = null;
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            await updateProfile(currentUser, { photoURL: downloadURL });
                            uploadTaskRef.current = null;

                            // Clean up old profile images (keep the most recent ones)
                            try {
                                await cleanupOldProfileImages(currentUser.uid, downloadURL);
                            } catch (error) {
                                console.error('Error during cleanup of old profile images:', error);
                                // Don't throw the error as the upload was successful
                            }

                            resolve(downloadURL);
                        } catch (error) {
                            reject(error);
                        }
                    }
                );
            });
        }
    };

    // Add a cancel upload function
    const cancelUpload = () => {
        if (uploadTaskRef.current) {
            uploadTaskRef.current.cancel();
            uploadTaskRef.current = null;
            setUploading(false);
            setUploadProgress(0);
            toast.error('Upload canceled');
        }
    };

    // Function to update profile with base64 image as a fallback
    const updateProfileWithBase64 = async (file: File, maxSizeKB: number = 100): Promise<string> => {
        if (!currentUser) {
            throw new Error('No user is currently logged in.');
        }

        return new Promise((resolve, reject) => {
            // Read file as data URL (base64)
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const base64String = event.target?.result as string;

                    // Check if the base64 string is too large
                    // Calculate approximate size: base64 is ~4/3 the size of binary
                    const approximateSizeKB = Math.round((base64String.length * 3 / 4) / 1024);

                    if (approximateSizeKB > maxSizeKB) {
                        reject(new Error(`Image is too large for direct update (${approximateSizeKB}KB). Please select a smaller image.`));
                        return;
                    }

                    // Update profile with the data URL directly
                    await updateProfile(currentUser, { photoURL: base64String });
                    console.log('Profile updated with base64 image');
                    resolve(base64String);
                } catch (error) {
                    console.error('Error updating profile with base64:', error);
                    reject(error);
                }
            };
            reader.onerror = () => {
                reject(new Error('Failed to read image file.'));
            };
            reader.readAsDataURL(file);
        });
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if any changes were made
        if (!hasChanges()) {
            toast.error('No changes detected');
            setMessage('No changes detected');
            return;
        }

        setLoading(true);
        setMessage(null);
        setError(null);
        let profileUpdated = false;
        let pictureUpdated = false;

        try {
            // Update display name if changed
            if (displayName !== initialDisplayName) {
                console.log('Updating display name...');
                await updateUserProfile(displayName);
                profileUpdated = true;
            }

            // Update profile picture if selected
            if (selectedFile) {
                try {
                    setUploading(true);
                    console.log('Starting profile picture upload process...');

                    // Add a safety timeout to prevent indefinite loading
                    const uploadTimeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => {
                            reject(new Error('Upload timed out. Please try again.'));
                        }, 30000); // 30 second safety timeout
                    });

                    // Validate the file again to be sure
                    const validation = validateFile(selectedFile);
                    if (!validation.valid) {
                        throw new Error(validation.error || '');
                    }

                    // Race between upload and timeout
                    await Promise.race([
                        uploadProfilePicture(selectedFile),
                        uploadTimeoutPromise
                    ]);

                    pictureUpdated = true;

                    // Clear selected file after successful upload
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error
                        ? error.message
                        : 'Failed to upload profile picture';

                    console.error('Profile picture upload error:', error);

                    // Ensure we reset the upload state
                    if (uploadTaskRef.current) {
                        try {
                            uploadTaskRef.current.cancel();
                            uploadTaskRef.current = null;
                        } catch (e) {
                            console.error('Error canceling upload task:', e);
                        }
                    }

                    // Increment upload attempts
                    setUploadAttempts(prevAttempts => prevAttempts + 1);

                    // If we've already tried Firebase Storage and it failed, try direct base64 approach
                    if (uploadAttempts >= 1 && selectedFile && selectedFile.size < 200 * 1024) { // Only try with small images (<200KB)
                        toast.loading('Trying alternative upload method...');
                        try {
                            await updateProfileWithBase64(selectedFile);
                            pictureUpdated = true;
                            setSelectedFile(null);
                            setPreviewUrl(null);
                            if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                            }
                            toast.success('Profile picture updated using alternative method');
                            return; // Don't throw, we succeeded with the alternative method
                        } catch (base64Error) {
                            console.error('Base64 upload fallback failed:', base64Error);
                            const fallbackError = base64Error instanceof Error
                                ? base64Error.message
                                : 'Alternative upload method also failed';
                            toast.error(fallbackError);
                            setError(`${errorMessage}. ${fallbackError}`);
                        }
                    } else {
                        toast.error(errorMessage);
                        setError(errorMessage);
                    }
                } finally {
                    setUploading(false);
                    setUploadProgress(0);
                }
            }

            // Set success message based on what was updated
            if (profileUpdated && pictureUpdated) {
                setMessage('Profile and picture updated successfully!');
                toast.success('Profile and picture updated successfully!');
            } else if (profileUpdated) {
                setMessage('Profile updated successfully!');
                toast.success('Profile updated successfully!');
            } else if (pictureUpdated) {
                setMessage('Profile picture updated successfully!');
                toast.success('Profile picture updated successfully!');
            }

            // Update initial values to reflect new state
            setInitialDisplayName(displayName);
        } catch (error) {
            console.error('Error updating profile:', error);
            // Don't show general error if we've already shown a specific one
            if (!error) {
                const errorMessage = 'Failed to update profile. Please try again.';
                toast.error(errorMessage);
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyEmail = async () => {
        try {
            setLoading(true);
            setMessage(null);
            setError(null);
            await verifyEmail();
            setMessage('Verification email sent! Please check your inbox.');
        } catch (error) {
            console.error('Error sending verification email:', error);
            toast.error('Failed to send verification email. Please try again.');
            setError('Failed to send verification email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            console.log('File selected:', file.name, file.type, `${(file.size / (1024 * 1024)).toFixed(2)}MB`);

            // Validate file
            const validation = validateFile(file);
            if (!validation.valid) {
                setError(validation.error || null);
                toast.error(validation.error || '');
                // Clear the file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                return;
            }

            setSelectedFile(file);
            setError(null);

            // Create a preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.onerror = () => {
                setError('Failed to preview the image. The file may be corrupted.');
                toast.error('Failed to preview the image.');
                setSelectedFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const removeSelectedImage = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Your Profile
                    </h2>
                </div>

                <Card>
                    {message && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mb-6 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800"
                        >
                            {message}
                        </motion.div>
                    )}

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800"
                        >
                            {error}
                        </motion.div>
                    )}

                    <div className="mb-8">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Account Information</h3>
                        <div className="bg-gray-50 dark:bg-darkTheme-accent p-4 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                <span className="font-medium">Email:</span> {currentUser?.email}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                <span className="font-medium">Email verified:</span>{' '}
                                {currentUser?.emailVerified ? (
                                    <span className="text-green-600 dark:text-green-400">Yes</span>
                                ) : (
                                    <span className="text-red-600 dark:text-red-400">No</span>
                                )}
                            </p>
                            {!currentUser?.emailVerified && (
                                <Button
                                    variant="outline"
                                    onClick={handleVerifyEmail}
                                    isLoading={loading}
                                    className="mt-3 text-sm py-2"
                                >
                                    Send verification email
                                </Button>
                            )}
                        </div>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Update Profile</h3>

                        <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-darkTheme-accent relative">
                                    {previewUrl ? (
                                        <img
                                            src={previewUrl}
                                            alt="Profile preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        currentUser ? (
                                            <UserAvatar
                                                user={{
                                                    ...currentUser,
                                                    email: currentUser.email ?? undefined,
                                                    displayName: currentUser.displayName ?? undefined,
                                                    photoURL: currentUser.photoURL ?? undefined,
                                                }}
                                                size="large"
                                                className="w-full h-full"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                                No User
                                            </div>
                                        )
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 rounded-full">
                                            <svg className="animate-spin h-8 w-8 text-white mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            {uploadProgress > 0 && (
                                                <span className="text-xs text-white">{uploadProgress}%</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={uploading ? cancelUpload : triggerFileInput}
                                    className={`absolute bottom-0 right-0 ${uploading ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary-dark'} text-white p-1.5 rounded-full shadow-md transition-colors`}
                                    disabled={loading}
                                >
                                    {uploading ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                                        </svg>
                                    )}
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/jpeg,image/png,image/gif"
                                    className="hidden"
                                    disabled={uploading || loading}
                                />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    Upload a new profile picture
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                                    JPG, PNG or GIF, max 5MB
                                </p>
                                {previewUrl && (
                                    <div className="space-y-2">
                                        <button
                                            type="button"
                                            onClick={removeSelectedImage}
                                            className="text-xs text-red-600 dark:text-red-400 hover:underline"
                                            disabled={uploading || loading}
                                        >
                                            Remove selected image
                                        </button>

                                        <div className="flex items-center mt-2">
                                            <input
                                                type="checkbox"
                                                id="compress-image"
                                                checked={compressImage}
                                                onChange={(e) => setCompressImage(e.target.checked)}
                                                className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                                disabled={uploading || loading}
                                            />
                                            <label htmlFor="compress-image" className="text-xs text-gray-600 dark:text-gray-400">
                                                Optimize image (reduces file size)
                                            </label>
                                        </div>
                                    </div>
                                )}
                                {uploading && (
                                    <div className="mt-2">
                                        <div className="flex items-center">
                                            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                                <div
                                                    className="bg-primary h-2 rounded-full"
                                                    style={{ width: `${uploadProgress}%` }}
                                                ></div>
                                            </div>
                                            <span className="ml-2 text-xs">{uploadProgress}%</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={cancelUpload}
                                            className="text-xs text-red-600 dark:text-red-400 hover:underline mt-1"
                                        >
                                            Cancel upload
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Input
                            label="Display Name"
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Enter your display name"
                            disabled={loading || uploading}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            isLoading={loading || uploading}
                            disabled={loading || uploading || !hasChanges()}
                        >
                            {loading || uploading ? `Updating${uploadProgress > 0 ? ` (${uploadProgress}%)` : '...'}` : 'Update Profile'}
                        </Button>
                    </form>

                    {error && (
                        <Button
                            type="button"
                            variant="outline"
                            fullWidth
                            onClick={() => {
                                // Reset error state
                                setError(null);
                                setMessage(null);

                                // If there was an upload in progress, ensure it's canceled
                                if (uploadTaskRef.current) {
                                    uploadTaskRef.current.cancel();
                                    uploadTaskRef.current = null;
                                }

                                setUploading(false);
                                setUploadProgress(0);
                            }}
                            className="mt-3"
                        >
                            Try Again
                        </Button>
                    )}
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default Profile; 