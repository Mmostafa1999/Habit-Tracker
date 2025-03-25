import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

interface UserType {
    displayName?: string;
    email?: string;
    photoURL?: string;
}

interface UserAvatarProps {
    user: UserType; // Firebase user object
    size?: 'small' | 'medium' | 'large';
    className?: string;
    onClick?: () => void;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
    user,
    size = 'medium',
    className = '',
    onClick
}) => {
    const [imageError, setImageError] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Reset error state when user or photoURL changes
        setImageError(false);
        setIsLoading(false);

        const fetchProfileImage = async () => {
            // Process the photoURL to ensure it's a valid URL
            if (!user?.photoURL) {
                setImageUrl(null);
                return;
            }

            // Handle standard web URLs
            if (user.photoURL.startsWith('http://') || user.photoURL.startsWith('https://')) {
                setImageUrl(user.photoURL);
                return;
            }

            // Handle Firebase Storage URLs
            if (user.photoURL.startsWith('gs://')) {
                try {
                    setIsLoading(true);
                    const storage = getStorage();
                    const downloadURL = await getDownloadURL(ref(storage, user.photoURL));
                    setImageUrl(downloadURL);
                } catch (error) {
                    console.error('Error getting download URL from Storage:', error);
                    setImageError(true);
                    setImageUrl(null);
                } finally {
                    setIsLoading(false);
                }
                return;
            }

            // Handle firestore:// URLs by extracting the path and getting download URL
            if (user.photoURL.startsWith('firestore://')) {
                try {
                    setIsLoading(true);
                    // Convert firestore:// URL to a storage path
                    // Example: firestore://users/userId/profileImage → profile-images/userId/[filename]
                    const path = user.photoURL.replace('firestore://', '');
                    const parts = path.split('/');

                    if (parts.length >= 3 && parts[0] === 'users') {
                        const userId = parts[1];
                        // Since we don't know the exact filename, we'll use the userId for the storage path
                        const storagePath = `profile-images/${userId}`;

                        // We need to list files in this directory to get the actual file
                        // But Firebase JS SDK doesn't provide a direct way to list files
                        // Instead, we'll use a generic avatar image as fallback
                        setImageError(true);
                        setImageUrl(null);
                    } else {
                        setImageError(true);
                        setImageUrl(null);
                    }
                } catch (error) {
                    console.error('Error handling firestore:// URL:', error);
                    setImageError(true);
                    setImageUrl(null);
                } finally {
                    setIsLoading(false);
                }
                return;
            }

            // If we get here, it's an unknown URL format
            console.error('Invalid image URL scheme:', user.photoURL);
            setImageError(true);
            setImageUrl(null);
        };

        fetchProfileImage();
    }, [user, user?.photoURL]);

    const sizeClasses = {
        small: 'w-8 h-8 text-xs',
        medium: 'w-10 h-10 text-sm',
        large: 'w-16 h-16 text-xl',
    };

    // Get user initials from display name or email
    const getInitials = () => {
        if (user?.displayName) {
            return user.displayName
                .split(' ')
                .map((name: string) => name[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
        } else if (user?.email) {
            return user.email.substring(0, 2).toUpperCase();
        }
        return 'U';
    };

    const handleImageError = () => {
        console.error('Failed to load image:', imageUrl);
        setImageError(true);
    };

    const avatarClasses = `${sizeClasses[size]} rounded-full flex items-center justify-center bg-primary text-white font-medium ${className}`;

    return (
        <motion.div
            whileHover={{ scale: onClick ? 1.05 : 1 }}
            whileTap={{ scale: onClick ? 0.95 : 1 }}
            className={avatarClasses}
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            {imageUrl && !imageError ? (
                <img
                    src={imageUrl}
                    alt={user.displayName || 'User'}
                    className="w-full h-full rounded-full object-cover"
                    onError={handleImageError}
                />
            ) : (
                getInitials()
            )}
        </motion.div>
    );
};

export default UserAvatar; 