import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Button from './ui/Button';

interface JournalEntryProps {
    habitId: string;
    habitName: string;
    date: Date | string;
    existingEntry?: string;
    onSave: (habitId: string, date: Date | string, entry: string) => void;
}

const JournalEntry: React.FC<JournalEntryProps> = ({
    habitId,
    habitName,
    date,
    existingEntry = '',
    onSave,
}) => {
    const [entry, setEntry] = useState(existingEntry);
    const [isEditing, setIsEditing] = useState(!existingEntry);

    const handleSave = () => {
        onSave(habitId, date, entry);
        setIsEditing(false);
    };

    const formattedDate = typeof date === 'string'
        ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
        : date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-darkTheme-secondary rounded-lg shadow-sm p-4 mb-4"
        >
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{habitName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{formattedDate}</p>
                </div>
                {!isEditing && existingEntry && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="text-primary dark:text-primary-light hover:text-primary-dark text-sm font-medium"
                    >
                        Edit
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-3">
                    <textarea
                        value={entry}
                        onChange={(e) => setEntry(e.target.value)}
                        placeholder="Write your thoughts about this habit today..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkTheme-accent dark:text-white resize-none min-h-[100px]"
                    />
                    <div className="flex space-x-2">
                        <Button onClick={handleSave}>Save</Button>
                        {existingEntry && (
                            <Button variant="outline" onClick={() => {
                                setEntry(existingEntry);
                                setIsEditing(false);
                            }}>
                                Cancel
                            </Button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-gray-50 dark:bg-darkTheme-accent rounded-lg p-3">
                    {existingEntry ? (
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{existingEntry}</p>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 italic text-sm">
                            No journal entry yet. Click to add your thoughts.
                        </p>
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default JournalEntry; 