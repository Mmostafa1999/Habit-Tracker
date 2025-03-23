import React, { useState } from 'react';
import { motion } from 'framer-motion';

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
            {user?.photoURL && !imageError ? (
                <img
                    src={user.photoURL}
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