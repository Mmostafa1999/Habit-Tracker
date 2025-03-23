import React, { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

interface ProgressChartProps {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    className?: string;
    showAnimation?: boolean;
    color?: string;
}

const ProgressChart: React.FC<ProgressChartProps> = ({
    percentage,
    size = 120,
    strokeWidth = 8,
    className = '',
    showAnimation = true,
    color,
}) => {
    // Ensure percentage is between 0 and 100
    const validPercentage = Math.min(100, Math.max(0, percentage));
    const controls = useAnimation();

    // Calculate circle properties
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (validPercentage / 100) * circumference;

    // Determine color based on percentage
    const getColor = () => {
        if (color) return color;
        
        if (validPercentage >= 100) return 'text-green-500 dark:text-green-400';
        if (validPercentage >= 75) return 'text-primary dark:text-primary-light';
        if (validPercentage >= 50) return 'text-secondary dark:text-secondary-light';
        if (validPercentage >= 25) return 'text-highlight dark:text-highlight-dark';
        return 'text-accent dark:text-accent-light';
    };

    useEffect(() => {
        if (showAnimation) {
            controls.start({
                strokeDashoffset,
                transition: { duration: 1, ease: "easeOut" }
            });
        } else {
            controls.set({ strokeDashoffset });
        }
    }, [controls, strokeDashoffset, showAnimation]);

    return (
        <div className={`relative ${className}`} style={{ width: size, height: size }}>
            {/* Background circle */}
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-gray-200 dark:text-gray-700"
                />

                {/* Progress circle */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={controls}
                    className={getColor()}
                    strokeLinecap="round"
                />
            </svg>

            {/* Percentage text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    className="text-2xl font-bold text-gray-800 dark:text-gray-200"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    {Math.round(validPercentage)}%
                </motion.span>
                {validPercentage === 100 && (
                    <motion.span
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.7, type: "spring" }}
                        className="text-sm text-green-500 dark:text-green-400 mt-1"
                    >
                        Complete!
                    </motion.span>
                )}
            </div>
        </div>
    );
};

export default ProgressChart; 