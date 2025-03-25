import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Category } from '../types';
import Button from './ui/Button';

interface EnhancedHabitFormProps {
    onAddHabit: (habitData: {
        name: string;
        description: string;
        frequency: 'daily' | 'weekly' | 'monthly';
        category?: string;
        reminderEnabled: boolean;
        reminderTime?: string;
        startDate: Date;
        weeklySchedule?: number[];
    }) => void;
    onCancel: () => void;
    categories: Category[];
}

const EnhancedHabitForm: React.FC<EnhancedHabitFormProps> = ({
    onAddHabit,
    onCancel,
    categories
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [category, setCategory] = useState<string | undefined>(undefined);
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [reminderTime, setReminderTime] = useState('09:00');
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [weeklySchedule, setWeeklySchedule] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri by default

    const days = [
        { value: 0, label: 'Sun' },
        { value: 1, label: 'Mon' },
        { value: 2, label: 'Tue' },
        { value: 3, label: 'Wed' },
        { value: 4, label: 'Thu' },
        { value: 5, label: 'Fri' },
        { value: 6, label: 'Sat' }
    ];

    const handleDayToggle = (dayValue: number) => {
        if (weeklySchedule.includes(dayValue)) {
            setWeeklySchedule(weeklySchedule.filter(d => d !== dayValue));
        } else {
            setWeeklySchedule([...weeklySchedule, dayValue].sort());
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() === '') return;

        onAddHabit({
            name,
            description,
            frequency,
            category,
            reminderEnabled,
            reminderTime: reminderEnabled ? reminderTime : undefined,
            startDate,
            weeklySchedule: frequency === 'weekly' ? weeklySchedule : undefined
        });

        // Reset form fields
        setName('');
        setDescription('');
        setFrequency('daily');
        setCategory(undefined);
        setReminderEnabled(false);
        setReminderTime('09:00');
        setStartDate(new Date());
        setWeeklySchedule([1, 2, 3, 4, 5]);
    };

    return (
        <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit}
            className="space-y-4"
        >
            {/* Name and Description */}
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <label htmlFor="habit-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Habit Name *
                    </label>
                    <input
                        id="habit-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="What habit do you want to build?"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-800 dark:text-white transition-colors"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="habit-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description (optional)
                    </label>
                    <textarea
                        id="habit-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add details about your habit..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-800 dark:text-white transition-colors"
                        rows={2}
                    />
                </div>
            </div>

            {/* Frequency and Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="habit-frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Frequency *
                    </label>
                    <select
                        id="habit-frequency"
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-800 dark:text-white transition-colors"
                    >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="habit-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category (optional)
                    </label>
                    <select
                        id="habit-category"
                        value={category || ""}
                        onChange={(e) => setCategory(e.target.value || undefined)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-800 dark:text-white transition-colors"
                    >
                        <option value="">No Category</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Start Date */}
            <div>
                <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date *
                </label>
                <input
                    id="start-date"
                    type="date"
                    value={startDate.toISOString().split('T')[0]}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-800 dark:text-white transition-colors"
                />
            </div>

            {/* Weekly Schedule (only show if frequency is weekly) */}
            {frequency === 'weekly' && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Weekly Schedule
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {days.map((day) => (
                            <button
                                key={day.value}
                                type="button"
                                onClick={() => handleDayToggle(day.value)}
                                className={`px-3 py-1.5 text-sm rounded-full ${weeklySchedule.includes(day.value)
                                        ? 'bg-primary text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                {day.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Reminder */}
            <div>
                <div className="flex items-center mb-2">
                    <input
                        type="checkbox"
                        id="reminder-enabled"
                        checked={reminderEnabled}
                        onChange={(e) => setReminderEnabled(e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="reminder-enabled" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                        Enable reminder
                    </label>
                </div>

                {reminderEnabled && (
                    <div>
                        <label htmlFor="reminder-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Reminder Time
                        </label>
                        <input
                            id="reminder-time"
                            type="time"
                            value={reminderTime}
                            onChange={(e) => setReminderTime(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-gray-800 dark:text-white transition-colors"
                        />
                    </div>
                )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-3">
                <Button
                    variant="outline"
                    onClick={onCancel}
                    className="px-4 py-2"
                    type="button"
                >
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    type="submit"
                    className="px-4 py-2"
                    disabled={!name.trim()}
                >
                    Add Habit
                </Button>
            </div>
        </motion.form>
    );
};

export default EnhancedHabitForm; 