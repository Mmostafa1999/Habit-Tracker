import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Habit, Category } from '../types';
import Button from './ui/Button';
import Input from './ui/Input';

interface HabitEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    habit: Habit | null;
    categories: Category[];
    onSave: (habitId: string, updatedData: Partial<Habit>) => Promise<void>;
}

const HabitEditModal: React.FC<HabitEditModalProps> = ({
    isOpen,
    onClose,
    habit,
    categories,
    onSave,
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [reminderTime, setReminderTime] = useState('');
    const [weeklySchedule, setWeeklySchedule] = useState<number[]>([1, 3, 5]);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Days of the week
    const daysOfWeek = [
        { value: 0, label: 'Sun' },
        { value: 1, label: 'Mon' },
        { value: 2, label: 'Tue' },
        { value: 3, label: 'Wed' },
        { value: 4, label: 'Thu' },
        { value: 5, label: 'Fri' },
        { value: 6, label: 'Sat' },
    ];

    // Toggle a day in the weekly schedule
    const toggleDay = (dayValue: number) => {
        if (weeklySchedule.includes(dayValue)) {
            setWeeklySchedule(weeklySchedule.filter(day => day !== dayValue));
        } else {
            setWeeklySchedule([...weeklySchedule, dayValue].sort());
        }
    };

    // Reset form when habit changes
    useEffect(() => {
        if (habit) {
            setName(habit.name || '');
            setDescription(habit.description || '');
            setFrequency(habit.frequency || 'daily');
            setCategoryId(habit.category);
            setReminderEnabled(!!habit.reminderEnabled);
            setReminderTime(habit.reminderTime || '');
            setWeeklySchedule(habit.weeklySchedule || [1, 3, 5]); // Default to Mon, Wed, Fri if not set

            // Format the start date to YYYY-MM-DD
            const habitStartDate = habit.startDate instanceof Date
                ? habit.startDate.toISOString().split('T')[0]
                : new Date(habit.startDate).toISOString().split('T')[0];
            setStartDate(habitStartDate);
        }
    }, [habit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!habit) return;

        if (!name.trim()) {
            setError('Habit name is required');
            return;
        }

        if (frequency === 'weekly' && weeklySchedule.length === 0) {
            setError('Please select at least one day for weekly habits');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Create base habit data
            const baseHabitData: Partial<Habit> = {
                name,
                description,
                frequency,
                category: categoryId,
                reminderEnabled,
                reminderTime: reminderEnabled ? reminderTime : undefined,
                // Don't update startDate if it would be before the current day (for existing habits)
                startDate: startDate ? new Date(startDate) : undefined,
            };

            // Only include weeklySchedule field for weekly habits
            const updatedData = frequency === 'weekly'
                ? { ...baseHabitData, weeklySchedule }
                : baseHabitData;

            console.log('Updating habit with data:', updatedData);

            await onSave(habit.id, updatedData);
            onClose();
        } catch (err) {
            console.error('Error updating habit:', err);
            setError('Failed to update habit. Please try again.');
        } finally {
            setLoading(false);
        }
    };

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
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-white dark:bg-darkTheme-secondary rounded-xl shadow-xl max-w-md w-full p-6 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                    Edit Habit
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Input
                                    label="Habit Name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter habit name"
                                    required
                                />

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Description (Optional)
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Enter a description"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-light focus:border-transparent bg-white dark:bg-darkTheme-accent text-gray-900 dark:text-gray-100"
                                        rows={3}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Frequency
                                    </label>
                                    <select
                                        value={frequency}
                                        onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-light focus:border-transparent bg-white dark:bg-darkTheme-accent text-gray-900 dark:text-gray-100"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>

                                {/* Weekly Schedule */}
                                {frequency === 'weekly' && (
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Schedule (select days)
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {daysOfWeek.map((day) => (
                                                <button
                                                    key={day.value}
                                                    type="button"
                                                    onClick={() => toggleDay(day.value)}
                                                    className={`
                                                        px-3 py-2 rounded-full text-sm font-medium transition-colors
                                                        ${weeklySchedule.includes(day.value)
                                                            ? 'bg-primary text-white'
                                                            : 'bg-gray-100 text-gray-700 dark:bg-darkTheme-accent dark:text-gray-300'
                                                        }
                                                    `}
                                                >
                                                    {day.label}
                                                </button>
                                            ))}
                                        </div>
                                        {weeklySchedule.length === 0 && (
                                            <p className="text-sm text-red-500 mt-1">Please select at least one day</p>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Category
                                    </label>
                                    <select
                                        value={categoryId || ''}
                                        onChange={(e) => setCategoryId(e.target.value || undefined)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-light focus:border-transparent bg-white dark:bg-darkTheme-accent text-gray-900 dark:text-gray-100"
                                    >
                                        <option value="">No Category</option>
                                        {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                                {category.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]} // Prevent selecting dates before today
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-light focus:border-transparent bg-white dark:bg-darkTheme-accent text-gray-900 dark:text-gray-100"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        You can only update a habit to start today or in the future
                                    </p>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="reminderEnabled"
                                        checked={reminderEnabled}
                                        onChange={(e) => setReminderEnabled(e.target.checked)}
                                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                                    />
                                    <label htmlFor="reminderEnabled" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                        Enable Reminder
                                    </label>
                                </div>

                                {reminderEnabled && (
                                    <Input
                                        label="Reminder Time"
                                        type="time"
                                        value={reminderTime}
                                        onChange={(e) => setReminderTime(e.target.value)}
                                        required={reminderEnabled}
                                    />
                                )}

                                <div className="flex justify-end space-x-3 pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={onClose}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        isLoading={loading}
                                        disabled={frequency === 'weekly' && weeklySchedule.length === 0}
                                    >
                                        Save Changes
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default HabitEditModal; 