import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Habit } from '../types';

interface HabitListProps {
    habits: Habit[];
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
}

const HabitList: React.FC<HabitListProps> = ({ habits, onToggle, onDelete }) => {
    if (habits.length === 0) {
        return (
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-gray-500 text-center py-6"
            >
                No habits yet. Add one to get started!
            </motion.p>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
        >
            <AnimatePresence>
                {habits.map((habit) => (
                    <motion.div
                        key={habit.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 shadow-sm hover:shadow transition-all"
                    >
                        <div className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                checked={habit.completed}
                                onChange={() => onToggle(habit.id)}
                                className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <div>
                                <p className={`text-sm font-medium ${habit.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                    {habit.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {habit.frequency.charAt(0).toUpperCase() + habit.frequency.slice(1)} •
                                    <span className={`ml-1 ${habit.streak > 0 ? 'text-primary font-medium' : ''}`}>
                                        Streak: {habit.streak}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => onDelete(habit.id)}
                            className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-full hover:bg-red-50"
                            aria-label="Delete habit"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </motion.div>
    );
};

export default HabitList; 