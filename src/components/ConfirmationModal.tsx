import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './ui/Button';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isLoading = false,
}) => {
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
                            <div className="mb-4 text-4xl">⚠️</div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                                {title}
                            </h2>
                            <p className="text-gray-700 dark:text-gray-300 mb-6">
                                {message}
                            </p>

                            <div className="flex justify-center space-x-4">
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    className="px-6"
                                    disabled={isLoading}
                                >
                                    {cancelText}
                                </Button>
                                <Button
                                    onClick={onConfirm}
                                    className="px-6 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                                    isLoading={isLoading}
                                >
                                    {confirmText}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ConfirmationModal; 