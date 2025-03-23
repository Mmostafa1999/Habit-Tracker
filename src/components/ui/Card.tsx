import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
    children: ReactNode;
    title?: string;
    className?: string;
}

const Card: React.FC<CardProps> = ({ children, title, className = '' }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className={`bg-white dark:bg-darkTheme-secondary rounded-xl shadow-custom dark:shadow-dark-custom hover:shadow-custom-hover dark:hover:shadow-dark-custom-hover transition-shadow duration-300 overflow-hidden ${className}`}
        >
            {title && (
                <div className="px-6 py-5 bg-primary dark:bg-primary-dark">
                    <h2 className="text-xl font-semibold text-white">{title}</h2>
                </div>
            )}
            <div className="px-6 py-6">{children}</div>
        </motion.div>
    );
};

export default Card; 