import React, { ReactNode, useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import DarkModeToggle from '../ui/DarkModeToggle';
import UserAvatar from '../ui/UserAvatar';
import ProgressChart from '../ui/ProgressChart';
import CalendarView from '../ui/CalendarView';
import { db } from '../../firebase';
import { collection, getDocs, query } from 'firebase/firestore';
import { format } from 'date-fns';
import { Habit } from '../../types';

interface DashboardLayoutProps {
    children: ReactNode;
    progressPercentage?: number;
    selectedDate?: Date;
    onDateSelect?: (date: Date) => void;
    validStartDates?: Date[];
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    children,
    progressPercentage,
    selectedDate: propSelectedDate,
    onDateSelect,
    validStartDates = []
}) => {
    const { currentUser, logout } = useAuth();
    const { darkMode } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [completedDays, setCompletedDays] = useState<number[]>([]);
    const [partiallyCompletedDays, setPartiallyCompletedDays] = useState<number[]>([]);
    const [calculatedProgress, setCalculatedProgress] = useState(0);
    const [internalSelectedDate, setInternalSelectedDate] = useState<Date>(propSelectedDate || new Date());

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', icon: '📋', label: 'All Habits' },
        { path: '/statistics', icon: '📊', label: 'Statistics' },
        { path: '/journal', icon: '📝', label: 'Journal' },
        { path: '/achievements', icon: '🏆', label: 'Achievements' },
        { path: '/profile', icon: '👤', label: 'Profile' },
        { path: '/ai-assistant', icon: '🤖', label: 'AI Assistant' },
    ];

    const firstName = currentUser?.displayName?.split(' ')[0] || 'There';

    // Define fetchCalendarData function
    const fetchCalendarData = useCallback(async () => {
        if (!currentUser) return;

        try {
            const today = new Date();
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            const endOfMonth = new Date(currentYear, currentMonth + 1, 0);

            const habitsQuery = query(
                collection(db, 'users', currentUser.uid, 'habits')
            );

            const habitsSnapshot = await getDocs(habitsQuery);
            const habits: Habit[] = [];

            habitsSnapshot.forEach((doc) => {
                habits.push({ id: doc.id, ...doc.data() } as Habit);
            });

            // Process completion history for calendar
            const daysInMonth = endOfMonth.getDate();
            const completed: number[] = [];
            const partial: number[] = [];

            // Process each day in the month
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(currentYear, currentMonth, day);
                const dateStr = date.toISOString().split('T')[0];

                // Get habits that should be active on this date based on their start date and schedule
                const relevantHabits = habits.filter(habit => {
                    // Don't include habits that start after this date
                    // Ensure startDate is a Date object (it could be a string)
                    const habitStartDate = new Date(habit.startDate);
                    habitStartDate.setHours(0, 0, 0, 0);

                    if (date < habitStartDate) {
                        return false;
                    }

                    // Check createdAt timestamp - don't show habits before they were created
                    if (habit.createdAt) {
                        const creationDate = new Date(habit.createdAt);
                        creationDate.setHours(0, 0, 0, 0);
                        if (date < creationDate) {
                            return false;
                        }
                    }

                    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

                    // Daily habits
                    if (habit.frequency === 'daily') {
                        return true;
                    }

                    // Weekly habits
                    if (habit.frequency === 'weekly') {
                        // If there's no weeklySchedule, make sure we don't crash
                        if (!habit.weeklySchedule || !Array.isArray(habit.weeklySchedule) || habit.weeklySchedule.length === 0) {
                            return true; // Default to showing every day if no schedule
                        }

                        // Check if this day is in the weekly schedule
                        return habit.weeklySchedule.includes(dayOfWeek);
                    }

                    // Monthly habits
                    if (habit.frequency === 'monthly') {
                        const habitStartDay = habitStartDate.getDate();
                        return date.getDate() === habitStartDay;
                    }

                    return false;
                });

                if (relevantHabits.length === 0) continue;

                // Count completed habits for this day using the completionHistory
                const completedHabits = relevantHabits.filter(habit => {
                    return habit.completionHistory?.some(
                        record => new Date(record.date).toISOString().split('T')[0] === dateStr && record.completed
                    );
                });

                const completionRate = completedHabits.length / relevantHabits.length;

                if (completionRate === 1) {
                    completed.push(day);
                } else if (completionRate > 0) {
                    partial.push(day);
                }
            }

            setCompletedDays(completed);
            setPartiallyCompletedDays(partial);

            // Calculate today's progress if not provided
            if (progressPercentage === undefined) {
                const today = new Date().toISOString().split('T')[0];

                // Get habits that should be active today
                const todayHabits = habits.filter(habit => {
                    const habitStartDate = new Date(habit.startDate);
                    habitStartDate.setHours(0, 0, 0, 0);

                    const currentDate = new Date();
                    currentDate.setHours(0, 0, 0, 0);

                    if (currentDate < habitStartDate) {
                        return false;
                    }

                    // Check createdAt timestamp - don't show habits before they were created
                    if (habit.createdAt) {
                        const creationDate = new Date(habit.createdAt);
                        creationDate.setHours(0, 0, 0, 0);
                        if (currentDate < creationDate) {
                            return false;
                        }
                    }

                    const dayOfWeek = currentDate.getDay();

                    if (habit.frequency === 'daily') {
                        return true;
                    }

                    if (habit.frequency === 'weekly') {
                        // If there's no weeklySchedule, make sure we don't crash
                        if (!habit.weeklySchedule || !Array.isArray(habit.weeklySchedule) || habit.weeklySchedule.length === 0) {
                            return true; // Default to showing every day if no schedule
                        }
                        return habit.weeklySchedule.includes(dayOfWeek);
                    }

                    if (habit.frequency === 'monthly') {
                        const habitStartDay = habitStartDate.getDate();
                        return currentDate.getDate() === habitStartDay;
                    }

                    return false;
                });

                if (todayHabits.length > 0) {
                    const completedToday = todayHabits.filter(habit => {
                        return habit.completionHistory?.some(
                            record => new Date(record.date).toISOString().split('T')[0] === today && record.completed
                        );
                    });

                    setCalculatedProgress((completedToday.length / todayHabits.length) * 100);
                }
            }
        } catch (error) {
            console.error('Error fetching calendar data:', error);
        }
    }, [currentUser, progressPercentage]);

    // Fetch calendar data
    useEffect(() => {
        fetchCalendarData();
    }, [fetchCalendarData]);

    // Update internal state when prop changes
    useEffect(() => {
        if (propSelectedDate) {
            setInternalSelectedDate(propSelectedDate);
        }
    }, [propSelectedDate]);

    // Get current date for calendar
    const currentDate = new Date();
    const currentMonthName = format(currentDate, 'MMMM yyyy');

    // Handle calendar day click
    const handleDayClick = (date: Date) => {
        setInternalSelectedDate(date);
        if (onDateSelect) {
            onDateSelect(date);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-50 dark:bg-darkTheme-primary text-gray-900 dark:text-darkTheme-text">
            {/* Mobile Menu Button */}
            <div className="md:hidden bg-white dark:bg-darkTheme-secondary p-4 flex items-center justify-between shadow-sm">
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
                <Link to="/" className="flex items-center">
                    <svg
                        className="h-8 w-8 text-primary dark:text-primary-light mr-2"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM16.24 16.83L11 13.69V7H12.5V12.87L17 15.5L16.24 16.83Z"
                            fill="currentColor"
                        />
                    </svg>
                    <span className="text-xl font-bold text-primary dark:text-primary-light">Habit Tracker</span>
                </Link>
                <div className="flex items-center">
                    <DarkModeToggle />
                    <button
                        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                        className="ml-2 p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Menu */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden bg-white dark:bg-darkTheme-secondary shadow-md overflow-hidden"
                    >
                        <nav className="p-4">
                            <ul className="space-y-2">
                                {navItems.map((item) => (
                                    <li key={item.path}>
                                        <Link
                                            to={item.path}
                                            className={`flex items-center w-full p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-darkTheme-accent transition-colors`}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            <span className="mr-3 text-xl">{item.icon}</span>
                                            <span className="font-medium">{item.label}</span>
                                        </Link>
                                    </li>
                                ))}
                                <li>
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className="flex items-center w-full p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-accent transition-colors"
                                    >
                                        <span className="mr-3 text-xl">👋</span>
                                        <span className="font-medium">Sign Out</span>
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Left Sidebar - Desktop */}
            <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="hidden md:flex w-64 bg-white dark:bg-darkTheme-secondary shadow-md z-10 flex-col"
            >
                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                    <Link to="/" className="flex items-center">
                        <svg
                            className="h-8 w-8 text-primary dark:text-primary-light mr-2"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM16.24 16.83L11 13.69V7H12.5V12.87L17 15.5L16.24 16.83Z"
                                fill="currentColor"
                            />
                        </svg>
                        <span className="text-xl font-bold text-primary dark:text-primary-light">Habit Tracker</span>
                    </Link>
                </div>

                <nav className="flex-1 p-4">
                    <ul className="space-y-2">
                        {navItems.map((item) => (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    className={`flex items-center w-full p-3 rounded-lg transition-colors
                                        ${location.pathname === item.path
                                            ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light font-medium'
                                            : 'hover:bg-gray-100 dark:hover:bg-darkTheme-accent text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-gray-100'}`}
                                >
                                    <span className="mr-3 text-xl">{item.icon}</span>
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-accent transition-colors"
                    >
                        <span className="mr-3 text-xl">👋</span>
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </motion.div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar - Desktop */}
                <motion.header
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="hidden md:block bg-white dark:bg-darkTheme-secondary shadow-sm z-10"
                >
                    <div className="flex items-center justify-between px-6 py-4">
                        <div>
                            <h1 className="text-xl font-semibold">
                                Hi There, <span className="text-primary dark:text-primary-light">{firstName}</span>
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back to your habits</p>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="relative hidden md:block">
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-darkTheme-accent focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-primary-light w-64 transition-all"
                                />
                                <svg
                                    className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    ></path>
                                </svg>
                            </div>

                            <DarkModeToggle />

                            <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-darkTheme-accent hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
                                <svg
                                    className="h-6 w-6 text-gray-500 dark:text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                    ></path>
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    ></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </motion.header>

                {/* Main Content and Right Sidebar */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Main Content Area */}
                    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-darkTheme-primary">
                        {children}
                    </main>

                    {/* Right Sidebar - Desktop */}
                    <motion.div
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="hidden lg:block w-80 bg-white dark:bg-darkTheme-secondary p-6 overflow-y-auto shadow-md"
                    >
                        <div className="flex flex-col items-center mb-8">
                            {currentUser ? (
                                <UserAvatar
                                    user={{
                                        ...currentUser,
                                        email: currentUser.email ?? undefined,
                                        displayName: currentUser.displayName ?? undefined,
                                        photoURL: currentUser.photoURL ?? undefined,
                                    }}
                                    size="large"
                                    onClick={() => {
                                        navigate('/profile');
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                    No User
                                </div>
                            )}
                            <h3 className="mt-4 font-semibold text-lg dark:text-gray-200">
                                {currentUser?.displayName || 'User'}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {currentUser?.email}
                            </p>
                        </div>

                        <div className="mb-8">
                            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Today's Progress</h4>
                            <div className="flex justify-center">
                                <ProgressChart
                                    percentage={progressPercentage !== undefined ? progressPercentage : calculatedProgress}
                                    showAnimation={true}
                                />
                            </div>
                            <p className="text-center mt-2 text-sm text-gray-500 dark:text-gray-400">
                                {Math.round(progressPercentage !== undefined ? progressPercentage : calculatedProgress)}% of habits completed
                            </p>
                        </div>

                        <div>
                            <CalendarView
                                completedDays={completedDays}
                                partiallyCompletedDays={partiallyCompletedDays}
                                onDayClick={handleDayClick}
                                selectedDate={internalSelectedDate}
                                validStartDates={validStartDates}
                                isDarkMode={darkMode}
                            />
                        </div>
                    </motion.div>

                    {/* Mobile Sidebar */}
                    <AnimatePresence>
                        {isMobileSidebarOpen && (
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="fixed inset-0 z-50 bg-black bg-opacity-50 lg:hidden"
                                onClick={() => setIsMobileSidebarOpen(false)}
                            >
                                <motion.div
                                    initial={{ x: '100%' }}
                                    animate={{ x: 0 }}
                                    exit={{ x: '100%' }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                    className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-darkTheme-secondary p-6 overflow-y-auto shadow-md"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Your Profile</h3>
                                        <button
                                            onClick={() => setIsMobileSidebarOpen(false)}
                                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="flex flex-col items-center mb-8">
                                        {currentUser ? (
                                            <UserAvatar
                                                user={{
                                                    ...currentUser,
                                                    email: currentUser.email ?? undefined,
                                                    displayName: currentUser.displayName ?? undefined,
                                                    photoURL: currentUser.photoURL ?? undefined, // Added to fix the type issue
                                                }}
                                                size="large"
                                                onClick={() => {
                                                    setIsMobileSidebarOpen(false);
                                                    navigate('/profile');
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                                No User
                                            </div>
                                        )}
                                        <h3 className="mt-4 font-semibold text-lg dark:text-gray-200">
                                            {currentUser?.displayName || 'User'}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {currentUser?.email}
                                        </p>
                                    </div>

                                    <div className="mb-8">
                                        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">Today's Progress</h4>
                                        <div className="flex justify-center">
                                            <ProgressChart
                                                percentage={progressPercentage !== undefined ? progressPercentage : calculatedProgress}
                                                showAnimation={true}
                                                size={100}
                                            />
                                        </div>
                                        <p className="text-center mt-2 text-sm text-gray-500 dark:text-gray-400">
                                            {Math.round(progressPercentage !== undefined ? progressPercentage : calculatedProgress)}% of habits completed
                                        </p>
                                    </div>

                                    <div>
                                        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4">{currentMonthName}</h4>
                                        <CalendarView
                                            completedDays={completedDays}
                                            partiallyCompletedDays={partiallyCompletedDays}
                                            onDayClick={handleDayClick}
                                            selectedDate={internalSelectedDate}
                                            validStartDates={validStartDates}
                                            isDarkMode={darkMode}
                                        />
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default DashboardLayout; 