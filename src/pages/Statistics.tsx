import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import { Habit } from '../types';

const Statistics: React.FC = () => {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { currentUser } = useAuth();

    useEffect(() => {
        const fetchHabits = async () => {
            if (!currentUser) return;

            try {
                setLoading(true);
                const habitsQuery = query(
                    collection(db, 'users', currentUser.uid, 'habits'),
                    orderBy('createdAt', 'desc')
                );

                const habitsSnapshot = await getDocs(habitsQuery);
                const habitsList: Habit[] = [];

                habitsSnapshot.forEach((doc) => {
                    habitsList.push({ id: doc.id, ...doc.data() } as Habit);
                });

                setHabits(habitsList);
                setError(null);
            } catch (error) {
                console.error('Error fetching habits:', error);
                setError('Failed to load habits. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchHabits();
    }, [currentUser]);

    // Calculate statistics
    const totalHabits = habits.length;
    const completedHabits = habits.filter(habit => habit.completed).length;
    const completionRate = totalHabits > 0 ? (completedHabits / totalHabits) * 100 : 0;

    // Get habit with longest streak
    const habitWithLongestStreak = habits.reduce(
        (prev, current) => (current.streak > (prev?.streak || 0) ? current : prev),
        habits[0]
    );

    // Calculate completion history for the last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
    }).reverse();

    const dailyCompletionData = last7Days.map(date => {
        const completedCount = habits.filter(habit => {
            if (!habit.completionHistory) return false;
            return habit.completionHistory.some(
                record => new Date(record.date).toISOString().split('T')[0] === date && record.completed
            );
        }).length;

        return {
            date,
            completed: completedCount,
            total: habits.filter(h => h.frequency === 'daily').length,
        };
    });

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Statistics
                    </h2>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800"
                    >
                        {error}
                    </motion.div>
                )}

                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary dark:border-primary-light"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Overview Card */}
                        <Card>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Overview</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-darkTheme-accent p-4 rounded-lg text-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Habits</p>
                                    <p className="text-3xl font-bold text-primary dark:text-primary-light mt-1">{totalHabits}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-darkTheme-accent p-4 rounded-lg text-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</p>
                                    <p className="text-3xl font-bold text-primary dark:text-primary-light mt-1">
                                        {Math.round(completionRate)}%
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-darkTheme-accent p-4 rounded-lg text-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Completed Today</p>
                                    <p className="text-3xl font-bold text-primary dark:text-primary-light mt-1">{completedHabits}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-darkTheme-accent p-4 rounded-lg text-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Longest Streak</p>
                                    <p className="text-3xl font-bold text-primary dark:text-primary-light mt-1">
                                        {habitWithLongestStreak?.streak || 0}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* Streak Leaders Card */}
                        <Card>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Streak Leaders</h3>
                            {habits.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                    No habits to display
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {habits
                                        .sort((a, b) => b.streak - a.streak)
                                        .slice(0, 5)
                                        .map(habit => (
                                            <div
                                                key={habit.id}
                                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-darkTheme-accent rounded-lg"
                                            >
                                                <div>
                                                    <h4 className="font-medium text-gray-800 dark:text-gray-200">{habit.name}</h4>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {habit.frequency.charAt(0).toUpperCase() + habit.frequency.slice(1)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center text-primary dark:text-primary-light">
                                                    <svg className="w-5 h-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                                    </svg>
                                                    <span className="font-bold">{habit.streak}</span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </Card>

                        {/* Weekly Progress Card */}
                        <Card className="md:col-span-2">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Weekly Progress</h3>
                            <div className="h-64 flex items-end justify-between px-4">
                                {dailyCompletionData.map((day, index) => {
                                    const percentage = day.total > 0 ? (day.completed / day.total) * 100 : 0;
                                    const date = new Date(day.date);
                                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                                    const dayDate = date.getDate();

                                    return (
                                        <div key={day.date} className="flex flex-col items-center">
                                            <div className="relative w-12 flex justify-center">
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${Math.max(percentage, 5)}%` }}
                                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                                    className={`w-8 rounded-t-md ${percentage >= 100
                                                        ? 'bg-green-500 dark:bg-green-600'
                                                        : percentage >= 50
                                                            ? 'bg-primary dark:bg-primary-dark'
                                                            : 'bg-secondary dark:bg-secondary-dark'
                                                        }`}
                                                />
                                                {day.completed > 0 && (
                                                    <div className="absolute top-0 left-0 w-full flex justify-center -mt-6">
                                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                                            {day.completed}/{day.total}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                                                <div>{dayName}</div>
                                                <div>{dayDate}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Statistics; 