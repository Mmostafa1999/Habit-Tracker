import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { format, addMonths, subMonths, isSameDay, startOfMonth, getDay, getDaysInMonth, isBefore } from 'date-fns';

interface CalendarViewProps {
    className?: string;
    completedDays?: number[];
    partiallyCompletedDays?: number[];
    onDayClick?: (date: Date) => void;
    selectedDate?: Date;
    validStartDates?: Date[];
    isDarkMode?: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({
    className = '',
    completedDays = [],
    partiallyCompletedDays = [],
    onDayClick,
    selectedDate,
    validStartDates = [],
    isDarkMode = false
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const today = new Date();

    // Navigate to previous month
    const prevMonth = useCallback(() => {
        setCurrentDate(subMonths(currentDate, 1));
    }, [currentDate]);

    // Navigate to next month
    const nextMonth = useCallback(() => {
        setCurrentDate(addMonths(currentDate, 1));
    }, [currentDate]);

    // Get current month and year
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const currentDay = today.getDate();

    // Get days in month
    const daysInMonth = getDaysInMonth(currentDate);

    // Get first day of month (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfMonth = getDay(startOfMonth(currentDate));

    // Create array of day names
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    // Create array of days as Date objects
    const days = Array.from({ length: daysInMonth }, (_, i) => {
        return new Date(currentYear, currentMonth, i + 1);
    });

    // Add empty cells for days before first day of month
    const emptyCells = Array.from({ length: firstDayOfMonth }, () => null);

    // Combine empty cells and days
    const allCells = [...emptyCells, ...days];

    // Format the current month and year
    const monthYearString = format(currentDate, 'MMMM yyyy');

    // Get day name for today
    const todayName = format(today, 'EEEE');

    // Handle day click
    const handleDayClick = (date: Date) => {
        if (onDayClick) {
            onDayClick(date);
        }
    };

    return (
        <div className={`${className}`}>
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                    <button
                        onClick={prevMonth}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-accent text-gray-500 dark:text-gray-400"
                        aria-label="Previous month"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mx-2">{monthYearString}</h4>
                    <button
                        onClick={nextMonth}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-accent text-gray-500 dark:text-gray-400"
                        aria-label="Next month"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <div className="text-sm text-primary dark:text-primary-light font-medium">
                    {todayName}, {currentDay}
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {dayNames.map((day, index) => (
                    <div key={index} className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {allCells.map((day, index) => {
                    if (day === null) {
                        return <div key={`empty-${index}`} className="h-14" />;
                    }

                    const dayNum = day.getDate();
                    const isToday = isSameDay(day, today);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isCompleted = completedDays.includes(dayNum);
                    const isPartiallyCompleted = partiallyCompletedDays.includes(dayNum);

                    // Check if this day is before any habit's start date
                    const isBeforeAnyHabitStartDate = validStartDates.length > 0 &&
                        validStartDates.every(startDate => {
                            // Create a normalized copy of day that's at the start of day
                            const normalizedDay = new Date(day);
                            normalizedDay.setHours(0, 0, 0, 0);

                            // Create a normalized copy of startDate
                            const normalizedStartDate = new Date(startDate);
                            normalizedStartDate.setHours(0, 0, 0, 0);

                            return isBefore(normalizedDay, normalizedStartDate);
                        });

                    // Determine if day should be disabled
                    const isDisabled = isBeforeAnyHabitStartDate;

                    return (
                        <motion.div
                            key={`day-${day.toISOString()}`}
                            whileHover={{ scale: isDisabled ? 1.0 : 1.05 }}
                            whileTap={{ scale: isDisabled ? 1.0 : 0.95 }}
                            onClick={() => !isDisabled && handleDayClick(day)}
                            className={`
                                h-14 rounded-lg flex flex-col items-center justify-center cursor-pointer
                                ${isToday
                                    ? 'bg-primary text-white ring-2 ring-primary ring-offset-2 dark:ring-offset-darkTheme-primary'
                                    : isSelected
                                        ? 'bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary-light ring-1 ring-primary dark:ring-primary-light'
                                        : ''}
                                ${isCompleted && !isToday && !isSelected ? 'bg-secondary text-gray-800 dark:text-gray-800' : ''}
                                ${isPartiallyCompleted && !isToday && !isSelected ? 'bg-highlight text-gray-800 dark:text-gray-800' : ''}
                                ${!isToday && !isSelected && !isCompleted && !isPartiallyCompleted && !isDisabled ? 'hover:bg-gray-100 dark:hover:bg-darkTheme-accent hover:text-gray-900 dark:hover:text-gray-200' : ''}
                                ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}
                            `}
                        >
                            <span className="text-xs font-medium mb-1">
                                {format(day, 'EEE')}
                            </span>
                            <span className={`text-sm font-bold ${isToday ? 'text-white' : isSelected ? (isDarkMode ? 'text-primary-light' : 'text-primary') : ''}`}>
                                {dayNum}
                            </span>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView; 