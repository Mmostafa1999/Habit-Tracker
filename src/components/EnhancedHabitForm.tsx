import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Category } from '../types';
import Button from './ui/Button';
import Input from './ui/Input';

interface EnhancedHabitFormProps {
    categories: Category[];
    onAddHabit: (habit: {
        name: string;
        description: string;
        frequency: 'daily' | 'weekly' | 'monthly';
        category?: string;
        reminderEnabled: boolean;
        reminderTime?: string;
        startDate: Date;
        weeklySchedule?: number[];
    }) => void;
    onCancel?: () => void;
}

const EnhancedHabitForm: React.FC<EnhancedHabitFormProps> = ({
    categories,
    onAddHabit,
    onCancel,
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [reminderTime, setReminderTime] = useState('09:00');
    const [startDate, setStartDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [weeklySchedule, setWeeklySchedule] = useState<number[]>([1, 3, 5]); // Default to Mon, Wed, Fri
    const [validationError, setValidationError] = useState<string | null>(null);

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        console.log('Form submission attempt');
        console.log('Current frequency:', frequency);
        console.log('Current weeklySchedule:', weeklySchedule);

        // Validate form
        if (name.trim() === '') {
            setValidationError('Habit name is required');
            console.log('Validation failed: Empty name');
            return;
        }

        if (frequency === 'weekly' && weeklySchedule.length === 0) {
            setValidationError('Please select at least one day for the weekly schedule');
            console.log('Validation failed: No days selected for weekly schedule');
            return;
        }

        if (reminderEnabled && !reminderTime) {
            setValidationError('Please set a reminder time');
            console.log('Validation failed: No reminder time set');
            return;
        }

        if (!startDate) {
            setValidationError('Please select a start date');
            console.log('Validation failed: No start date selected');
            return;
        }

        const habitData = {
            name: name.trim(),
            description: description.trim(),
            frequency,
            category: categoryId,
            reminderEnabled,
            reminderTime: reminderEnabled ? reminderTime : undefined,
            startDate: new Date(startDate),
            weeklySchedule: frequency === 'weekly' ? weeklySchedule : undefined,
        };

        console.log('Submitting habit data:', habitData);
        console.log('weeklySchedule being passed:', habitData.weeklySchedule);

        onAddHabit(habitData);

        // Reset form
        setName('');
        setDescription('');
        setFrequency('daily');
        setCategoryId(undefined);
        setReminderEnabled(false);
        setReminderTime('09:00');
        setStartDate(new Date().toISOString().split('T')[0]);
        setWeeklySchedule([1, 3, 5]); // Reset to default
    };

    return (
        <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit}
            className="space-y-4"
        >
            {validationError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
                    {validationError}
                </div>
            )}

            <Input
                label="Habit Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Morning Meditation"
                required
            />

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Description (optional)
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your habit and why it's important to you"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkTheme-accent dark:text-white resize-none min-h-[80px]"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Frequency
                    </label>
                    <select
                        value={frequency}
                        onChange={(e) => {
                            const newFrequency = e.target.value as 'daily' | 'weekly' | 'monthly';
                            console.log('Frequency changed to:', newFrequency);
                            setFrequency(newFrequency);
                        }}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkTheme-accent dark:text-white"
                    >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Category (optional)
                    </label>
                    <select
                        value={categoryId || ''}
                        onChange={(e) => setCategoryId(e.target.value || undefined)}
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkTheme-accent dark:text-white"
                    >
                        <option value="">No Category</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Start Date
                </label>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkTheme-accent dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    You can only start a habit today or in the future
                </p>
            </div>

            <div className="bg-gray-50 dark:bg-darkTheme-accent p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Enable Daily Reminder
                    </label>
                    <div className="relative inline-block w-10 mr-2 align-middle select-none">
                        <input
                            type="checkbox"
                            id="toggle"
                            checked={reminderEnabled}
                            onChange={() => setReminderEnabled(!reminderEnabled)}
                            className="sr-only"
                        />
                        <label
                            htmlFor="toggle"
                            className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in ${reminderEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                        >
                            <span
                                className={`block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in ${reminderEnabled ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                            />
                        </label>
                    </div>
                </div>

                {reminderEnabled && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            Reminder Time
                        </label>
                        <input
                            type="time"
                            value={reminderTime}
                            onChange={(e) => setReminderTime(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkTheme-accent dark:text-white"
                        />
                    </div>
                )}
            </div>

            <div className="flex space-x-3 pt-2">
                <Button
                    type="submit"
                    fullWidth
                    disabled={frequency === 'weekly' && weeklySchedule.length === 0}
                >
                    Add Habit
                </Button>
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel} fullWidth>
                        Cancel
                    </Button>
                )}
            </div>
        </motion.form>
    );
};

export default EnhancedHabitForm; 