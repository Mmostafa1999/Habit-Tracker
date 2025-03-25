import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import useWindowSize from '../hooks/useWindowSize';
import Button from './ui/Button';

interface CelebrationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CelebrationModal: React.FC<CelebrationModalProps> = ({ isOpen, onClose }) => {
    const { width, height } = useWindowSize();
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowConfetti(true);
            const timer = setTimeout(() => {
                setShowConfetti(false);
            }, 5000); // Show confetti for 5 seconds

            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="bg-white dark:bg-darkTheme-secondary rounded-xl shadow-xl max-w-md w-full p-6 text-center relative overflow-hidden">
                            {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}

                            <div className="mb-4 text-5xl">🎉</div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                                Great job!
                            </h2>
                            <p className="text-gray-700 dark:text-gray-300 mb-6">
                                You have completed all your habits for today.
                            </p>

                            <div className="flex justify-center space-x-4">
                                <Button onClick={onClose} className="px-6">
                                    Continue
                                </Button>
                            </div>

                            {/* Decorative elements */}
                            <div className="absolute -top-10 -left-10 w-20 h-20 rounded-full bg-secondary/30 dark:bg-secondary/20" />
                            <div className="absolute -bottom-10 -right-10 w-20 h-20 rounded-full bg-accent/30 dark:bg-accent/20" />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default CelebrationModal; 