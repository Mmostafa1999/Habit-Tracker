import React from 'react';
import { motion } from 'framer-motion';
import { Achievement } from '../types';

interface AchievementBadgeProps {
    achievement: Achievement;
    onClick?: () => void;
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({ achievement, onClick }) => {
    const { name, description, icon, unlocked } = achievement;

    return (
        <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className={`relative p-4 rounded-lg cursor-pointer transition-all duration-200 ${unlocked
                    ? 'bg-white dark:bg-darkTheme-secondary shadow-custom dark:shadow-dark-custom'
                    : 'bg-gray-100 dark:bg-darkTheme-accent opacity-60'
                }`}
            onClick={onClick}
        >
            <div className="flex flex-col items-center text-center">
                <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${unlocked
                            ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                        }`}
                >
                    <span className="text-2xl">{icon}</span>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">{name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>

                {unlocked && (
                    <div className="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Unlocked
                    </div>
                )}

                {!unlocked && (
                    <div className="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        Locked
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default AchievementBadge; 