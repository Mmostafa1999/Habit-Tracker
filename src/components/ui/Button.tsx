import React, { ButtonHTMLAttributes } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'google';
    isLoading?: boolean;
    fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    isLoading = false,
    fullWidth = false,
    className = '',
    disabled,
    ...props
}) => {
    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-dark dark:bg-primary-dark dark:hover:bg-primary',
        secondary: 'bg-secondary text-gray-800 hover:bg-secondary-dark dark:bg-secondary-dark dark:text-white dark:hover:bg-secondary',
        outline: 'border border-primary text-primary hover:bg-primary hover:text-white dark:border-primary-light dark:text-primary-light dark:hover:bg-primary-dark',
        danger: 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-600',
        google: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-darkTheme-accent dark:border-gray-600 dark:text-gray-200 dark:hover:bg-dark-primary'
    };

    const baseClasses = 'flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    const focusRingClasses = {
        primary: 'focus:ring-primary dark:focus:ring-primary-light',
        secondary: 'focus:ring-secondary dark:focus:ring-secondary-light',
        outline: 'focus:ring-primary dark:focus:ring-primary-light',
        danger: 'focus:ring-red-500',
        google: 'focus:ring-gray-400 dark:focus:ring-gray-500'
    };

    const widthClass = fullWidth ? 'w-full' : '';
    const disabledClass = (disabled || isLoading) ? 'opacity-70 cursor-not-allowed' : '';

    return (
        <motion.button
            whileHover={{ scale: (disabled || isLoading) ? 1 : 1.02 }}
            whileTap={{ scale: (disabled || isLoading) ? 1 : 0.98 }}
            className={`${baseClasses} ${variantClasses[variant]} ${focusRingClasses[variant]} ${widthClass} ${disabledClass} ${className}`}
            disabled={disabled || isLoading}
            {...(props as HTMLMotionProps<'button'>)}
        >
            {isLoading ? (
                <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading...</span>
                </div>
            ) : (
                children
            )}
        </motion.button>
    );
};

export default Button; 