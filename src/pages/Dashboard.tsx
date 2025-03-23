import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import EnhancedHabitForm from '../components/EnhancedHabitForm';
import CategoryManager from '../components/CategoryManager';
import Button from '../components/ui/Button';
import { Habit, Category } from '../types';
import { useNavigate } from 'react-router-dom';
import CelebrationModal from '../components/CelebrationModal';
import HabitEditModal from '../components/HabitEditModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { format, getDay } from 'date-fns';

const Dashboard: React.FC = () => {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddingHabit, setIsAddingHabit] = useState(false);
    const [isManagingCategories, setIsManagingCategories] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [habitToDelete, setHabitToDelete] = useState<string | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    // Fetch habits and categories from Firestore
    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser) return;

            try {
                setLoading(true);

                // Fetch categories first
                const categoriesSnapshot = await getDocs(
                    collection(db, 'users', currentUser.uid, 'categories')
                );

                const categoriesList: Category[] = [];
                categoriesSnapshot.forEach((doc) => {
                    categoriesList.push({ id: doc.id, ...doc.data() } as Category);
                });

                // Sort categories by order
                categoriesList.sort((a, b) => (a.order || 0) - (b.order || 0));
                setCategories(categoriesList);

                // Then fetch habits
                const habitsQuery = query(
                    collection(db, 'users', currentUser.uid, 'habits'),
                    orderBy('order', 'asc')
                );

                const habitsSnapshot = await getDocs(habitsQuery);
                const habitsList: Habit[] = [];

                habitsSnapshot.forEach((doc) => {
                    habitsList.push({ id: doc.id, ...doc.data() } as Habit);
                });

                setHabits(habitsList);
                setError(null);
            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Failed to load habits. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUser]);

    // Add a new habit
    const addHabit = async (habitData: {
        name: string;
        description: string;
        frequency: 'daily' | 'weekly' | 'monthly';
        category?: string;
        reminderEnabled: boolean;
        reminderTime?: string;
        startDate: Date;
        weeklySchedule?: number[];
    }) => {
        if (!currentUser) return;

        try {
            setError(null); // Clear any previous errors

            console.log('Adding habit with frequency:', habitData.frequency);
            console.log('weeklySchedule data:', habitData.weeklySchedule);

            // Create the base habit object
            const habitBase = {
                name: habitData.name,
                description: habitData.description || '',
                frequency: habitData.frequency,
                category: habitData.category, // Already optional in the type
                completed: false,
                streak: 0,
                startDate: habitData.startDate,
                createdAt: new Date(), // Store creation timestamp
                reminderEnabled: habitData.reminderEnabled,
                reminderTime: habitData.reminderEnabled ? habitData.reminderTime : undefined,
                order: habits.length,
                completionHistory: []
            };

            // Only add weeklySchedule for weekly habits
            const newHabit = habitData.frequency === 'weekly'
                ? { ...habitBase, weeklySchedule: habitData.weeklySchedule }
                : habitBase;

            console.log('Adding new habit:', newHabit);

            try {
                const docRef = await addDoc(
                    collection(db, 'users', currentUser.uid, 'habits'),
                    newHabit
                );

                console.log('Habit added successfully with ID:', docRef.id);

                // Now add the id to create a complete Habit object
                const habitWithId: Habit = {
                    id: docRef.id,
                    ...newHabit
                };

                setHabits([...habits, habitWithId]);
                setIsAddingHabit(false);
            } catch (firestoreError) {
                console.error('Firestore error adding habit:', firestoreError);
                console.error('Error details:', JSON.stringify(firestoreError));
                throw firestoreError;
            }
        } catch (error) {
            console.error('Error adding habit:', error);
            setError('Failed to add habit. Please try again.');
        }
    };

    // Toggle habit completion
    const toggleHabit = async (id: string) => {
        if (!currentUser) return;

        const habitIndex = habits.findIndex((habit) => habit.id === id);
        if (habitIndex === -1) return;

        const habit = habits[habitIndex];
        const selectedDateStr = selectedDate.toISOString().split('T')[0];

        // Check if the habit was completed on the selected date
        const existingRecord = habit.completionHistory?.find(
            record => new Date(record.date).toISOString().split('T')[0] === selectedDateStr
        );

        const wasCompletedOnSelectedDate = existingRecord?.completed || false;

        // Create updated habit (but don't change the global completed flag)
        const updatedHabit = { ...habit };

        // Calculate if this completion would affect streak
        const isToday = new Date().toISOString().split('T')[0] === selectedDateStr;

        // Only update streak when toggling today's completion
        if (isToday) {
            // Update streak
            if (!wasCompletedOnSelectedDate) {
                updatedHabit.streak += 1;
                updatedHabit.lastCompletedDate = selectedDateStr;
            } else {
                updatedHabit.streak = Math.max(0, updatedHabit.streak - 1);
            }
        }

        // Update completion history
        const completionHistory = [...(habit.completionHistory || [])];
        const recordIndex = completionHistory.findIndex(
            record => new Date(record.date).toISOString().split('T')[0] === selectedDateStr
        );

        if (recordIndex >= 0) {
            // Update existing record for selected date
            completionHistory[recordIndex].completed = !wasCompletedOnSelectedDate;
        } else {
            // Add new record for selected date
            completionHistory.push({
                date: selectedDateStr,
                completed: true,
            });
        }

        updatedHabit.completionHistory = completionHistory;

        // Set the global 'completed' flag only based on today's completion status
        const today = new Date().toISOString().split('T')[0];
        const todayRecord = completionHistory.find(
            record => new Date(record.date).toISOString().split('T')[0] === today
        );
        updatedHabit.completed = todayRecord?.completed || false;

        // Update state
        const updatedHabits = [...habits];
        updatedHabits[habitIndex] = updatedHabit;
        setHabits(updatedHabits);

        // Recalculate progress percentage
        const filteredHabits = filterHabitsByDate(updatedHabits);

        // Update in Firestore
        try {
            await updateDoc(
                doc(db, 'users', currentUser.uid, 'habits', id),
                {
                    completed: updatedHabit.completed,
                    streak: updatedHabit.streak,
                    lastCompletedDate: updatedHabit.lastCompletedDate,
                    completionHistory: updatedHabit.completionHistory,
                }
            );

            // Check if all habits are completed for the selected date
            const allCompletedForSelectedDate = filteredHabits.every(h => {
                const record = h.completionHistory?.find(
                    r => new Date(r.date).toISOString().split('T')[0] === selectedDateStr
                );
                return record?.completed || false;
            });

            if (allCompletedForSelectedDate && filteredHabits.length > 0 && isToday) {
                setShowCelebration(true);
            }
        } catch (error) {
            console.error('Error updating habit:', error);
            setError('Failed to update habit. Please try again.');
        }
    };

    // Delete a habit
    const deleteHabit = async (id: string) => {
        if (!currentUser) return;

        try {
            setIsDeleting(true);
            await deleteDoc(doc(db, 'users', currentUser.uid, 'habits', id));
            setHabits(habits.filter((habit) => habit.id !== id));
            setHabitToDelete(null);
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error('Error deleting habit:', error);
            setError('Failed to delete habit. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    // Open delete confirmation modal
    const confirmDeleteHabit = (id: string) => {
        setHabitToDelete(id);
        setIsDeleteModalOpen(true);
    };

    // Add a category
    const addCategory = async (category: Omit<Category, 'id'>) => {
        if (!currentUser) return;

        try {
            const docRef = await addDoc(
                collection(db, 'users', currentUser.uid, 'categories'),
                category
            );

            setCategories([...categories, { id: docRef.id, ...category }]);
        } catch (error) {
            console.error('Error adding category:', error);
            setError('Failed to add category. Please try again.');
        }
    };

    // Update a category
    const updateCategory = async (category: Category) => {
        if (!currentUser) return;

        try {
            await updateDoc(
                doc(db, 'users', currentUser.uid, 'categories', category.id),
                {
                    name: category.name,
                    color: category.color,
                }
            );

            setCategories(categories.map(c =>
                c.id === category.id ? category : c
            ));
        } catch (error) {
            console.error('Error updating category:', error);
            setError('Failed to update category. Please try again.');
        }
    };

    // Delete a category
    const deleteCategory = async (id: string) => {
        if (!currentUser) return;

        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'categories', id));

            // Remove category from habits
            const habitsWithCategory = habits.filter(habit => habit.category === id);

            if (habitsWithCategory.length > 0) {
                const updatePromises = habitsWithCategory.map(habit =>
                    updateDoc(doc(db, 'users', currentUser.uid, 'habits', habit.id), {
                        category: null
                    })
                );

                await Promise.all(updatePromises);

                // Update local state
                setHabits(habits.map(habit =>
                    habit.category === id ? { ...habit, category: undefined } : habit
                ));
            }

            setCategories(categories.filter(c => c.id !== id));
        } catch (error) {
            console.error('Error deleting category:', error);
            setError('Failed to delete category. Please try again.');
        }
    };

    // Handle journal entry
    const handleJournalClick = (habitId: string) => {
        navigate(`/journal?habitId=${habitId}`);
    };

    // Handle edit habit
    const handleEditClick = (habit: Habit) => {
        setEditingHabit(habit);
    };

    // Update habit
    const updateHabit = async (habitId: string, updatedData: Partial<Habit>) => {
        if (!currentUser) return;

        try {
            await updateDoc(
                doc(db, 'users', currentUser.uid, 'habits', habitId),
                updatedData
            );

            // Update local state
            setHabits(habits.map(habit =>
                habit.id === habitId ? { ...habit, ...updatedData } : habit
            ));
        } catch (error) {
            console.error('Error updating habit:', error);
            throw new Error('Failed to update habit');
        }
    };

    // Group habits by category
    const habitsByCategory = habits.reduce((acc, habit) => {
        const categoryId = habit.category || 'uncategorized';
        if (!acc[categoryId]) {
            acc[categoryId] = [];
        }
        acc[categoryId].push(habit);
        return acc;
    }, {} as Record<string, Habit[]>);

    // Helper function to check if a habit should be shown on a specific date
    const shouldShowHabitOnDate = (habit: Habit, date: Date): boolean => {
        // Convert dates to start of day for accurate comparisons (remove time portion)
        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);

        // Ensure startDate is a Date object (it could be a string)
        const startDate = new Date(habit.startDate);
        startDate.setHours(0, 0, 0, 0);

        // Check createdAt timestamp - don't show habits before they were created
        if (habit.createdAt) {
            const creationDate = new Date(habit.createdAt);
            creationDate.setHours(0, 0, 0, 0);

            // Don't show habits on dates before they were created
            if (selectedDate < creationDate) {
                return false;
            }
        }

        // Don't show habits before their start date
        if (selectedDate < startDate) {
            return false;
        }

        const dayOfWeek = getDay(selectedDate); // 0 = Sunday, 1 = Monday, etc.

        // Daily habits show on every day after their start date
        if (habit.frequency === 'daily') {
            return true;
        }

        // Weekly habits show only on scheduled days after their effective start date
        if (habit.frequency === 'weekly') {
            // If there's no weeklySchedule, make sure we don't crash
            if (!habit.weeklySchedule || !Array.isArray(habit.weeklySchedule) || habit.weeklySchedule.length === 0) {
                console.log(`Weekly habit "${habit.name}" has no schedule, showing daily`);
                return true; // Default to showing every day if no schedule
            }

            // Check if the current day of week is in the weekly schedule
            return habit.weeklySchedule.includes(dayOfWeek);
        }

        // Monthly habits show on the same day of month after their start date
        if (habit.frequency === 'monthly') {
            return selectedDate.getDate() === startDate.getDate();
        }

        return true;
    };

    // Filter habits based on selected date and weekly schedule
    const filterHabitsByDate = (habitsToFilter: Habit[]): Habit[] => {
        return habitsToFilter.filter(habit => shouldShowHabitOnDate(habit, selectedDate));
    };

    // Get filtered habits for the selected date for display
    const filteredHabits = filterHabitsByDate(habits);
    const totalHabits = filteredHabits.length;

    // Calculate progress percentage for TODAY only, regardless of selected date
    const todayStr = new Date().toISOString().split('T')[0];
    const todayHabits = habits.filter(habit => shouldShowHabitOnDate(habit, new Date()));
    const todayCompletedCount = todayHabits.filter(habit => {
        const record = habit.completionHistory?.find(
            r => new Date(r.date).toISOString().split('T')[0] === todayStr
        );
        return record?.completed || false;
    }).length;

    const progressPercentage = todayHabits.length > 0
        ? (todayCompletedCount / todayHabits.length) * 100
        : 0;

    // Get current date
    const today = new Date();
    const dayName = format(today, 'EEEE');

    // Calculate valid dates for the calendar (dates on or after the earliest habit start date)
    const getValidDates = (): Date[] => {
        if (habits.length === 0) return [];

        // Get effective start dates (considering both startDate and createdAt)
        const effectiveDates = habits.map(habit => {
            // Get the habit's start date
            const startDate = typeof habit.startDate === 'string'
                ? new Date(habit.startDate)
                : new Date(habit.startDate);

            // Normalize to start of day
            startDate.setHours(0, 0, 0, 0);

            // If createdAt is available, use the later of startDate or createdAt
            if (habit.createdAt) {
                const creationDate = typeof habit.createdAt === 'string'
                    ? new Date(habit.createdAt)
                    : new Date(habit.createdAt);

                // Normalize to start of day
                creationDate.setHours(0, 0, 0, 0);

                // Return the later date - habits shouldn't appear before they were created,
                // even if the startDate is earlier
                return creationDate > startDate ? creationDate : startDate;
            }

            return startDate;
        });

        // Return array of all effective dates (will be used to disable dates before any habit starts)
        return effectiveDates;
    };

    // Add a function to handle date selection
    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
    };

    return (
        <DashboardLayout
            progressPercentage={progressPercentage}
            onDateSelect={handleDateSelect}
            selectedDate={selectedDate}
            validStartDates={getValidDates()}
        >
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {dayName}
                    </h2>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsAddingHabit(true)}
                        className="flex items-center px-4 py-2 bg-primary text-white rounded-lg shadow-sm hover:bg-primary-dark transition-colors"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        New Habit
                    </motion.button>
                </div>

                <AnimatePresence>
                    {isAddingHabit && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card className="mb-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Add New Habit</h3>
                                    <button
                                        onClick={() => setIsAddingHabit(false)}
                                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                    </button>
                                </div>
                                <EnhancedHabitForm
                                    categories={categories}
                                    onAddHabit={addHabit}
                                    onCancel={() => setIsAddingHabit(false)}
                                />
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                    <div className="space-y-8">
                        {/* Category Filters */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <Button
                                variant={selectedCategory === 'all' ? 'primary' : 'outline'}
                                className="text-sm py-1.5 px-3"
                                onClick={() => setSelectedCategory('all')}
                            >
                                All
                            </Button>
                            {categories.map(category => (
                                <Button
                                    key={category.id}
                                    variant={selectedCategory === category.id ? 'primary' : 'outline'}
                                    className="text-sm py-1.5 px-3 flex items-center"
                                    onClick={() => setSelectedCategory(category.id)}
                                >
                                    <div
                                        className="w-2 h-2 rounded-full mr-2"
                                        style={{ backgroundColor: category.color }}
                                    />
                                    {category.name}
                                </Button>
                            ))}
                        </div>

                        {/* Habits for Selected Date */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                                {format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                                    ? "Today's Habits"
                                    : `Habits for ${format(selectedDate, 'EEEE, MMMM d')}`
                                }
                            </h3>

                            {format(selectedDate, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd') && (
                                <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <p className="text-sm flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        You're viewing habits for {format(selectedDate, 'MMMM d')}. Habits can only be marked as completed for today.
                                    </p>
                                </div>
                            )}

                            {/* No habits message */}
                            {totalHabits === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 bg-white dark:bg-darkTheme-secondary rounded-xl shadow-sm text-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">No Habits Scheduled</h4>
                                    <p className="text-gray-500 dark:text-gray-400 max-w-xs">
                                        You have no habits scheduled for {format(selectedDate, 'MMMM d')}.
                                    </p>
                                </div>
                            ) : (
                                Object.entries(habitsByCategory).map(([categoryId, categoryHabits]) => {
                                    // Skip if filtering by category and this isn't the selected category
                                    if (selectedCategory !== 'all' && categoryId !== selectedCategory) return null;

                                    // Skip if there are no habits in this category after applying date filter
                                    const filteredCategoryHabits = filterHabitsByDate(categoryHabits);
                                    if (filteredCategoryHabits.length === 0) return null;

                                    const category = categories.find(c => c.id === categoryId);
                                    return (
                                        <div key={categoryId} className="mb-6">
                                            <div className="flex items-center mb-2">
                                                {category && (
                                                    <div
                                                        className="w-3 h-3 rounded-full mr-2"
                                                        style={{ backgroundColor: category.color }}
                                                    />
                                                )}
                                                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">
                                                    {category ? category.name : 'Uncategorized'}
                                                </h4>
                                            </div>
                                            <div className="bg-white dark:bg-darkTheme-secondary rounded-xl shadow-sm">
                                                {filteredCategoryHabits.map(habit => {
                                                    const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                                                    // Check if the selected date is before the habit's start date
                                                    const habitStartDate = new Date(habit.startDate);
                                                    habitStartDate.setHours(0, 0, 0, 0);
                                                    const selectedDateCopy = new Date(selectedDate);
                                                    selectedDateCopy.setHours(0, 0, 0, 0);
                                                    const isBeforeStartDate = selectedDateCopy < habitStartDate;

                                                    // Check if this habit is completed for the selected date
                                                    const selectedDateStr = selectedDate.toISOString().split('T')[0];
                                                    const completionRecord = habit.completionHistory?.find(
                                                        record => new Date(record.date).toISOString().split('T')[0] === selectedDateStr
                                                    );
                                                    const isCompletedForSelectedDate = completionRecord?.completed || false;

                                                    // Disable completion if:
                                                    // 1. Not today's date (can only complete habits for the current day)
                                                    // 2. OR it's before the habit's start date
                                                    const disableCompletion = !isToday || isBeforeStartDate;

                                                    return (
                                                        <div
                                                            key={habit.id}
                                                            className="p-4 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center">
                                                                    <button
                                                                        onClick={() => !disableCompletion && toggleHabit(habit.id)}
                                                                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 transition-colors
                                                                            ${isCompletedForSelectedDate
                                                                                ? 'border-primary dark:border-primary-light bg-primary dark:bg-primary-light text-white'
                                                                                : 'border-gray-300 dark:border-gray-600 hover:border-primary dark:hover:border-primary-light'}
                                                                            ${disableCompletion ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`
                                                                        }
                                                                        aria-label={isCompletedForSelectedDate ? "Mark as incomplete" : "Mark as complete"}
                                                                        disabled={disableCompletion}
                                                                    >
                                                                        {isCompletedForSelectedDate && (
                                                                            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                                                                                <path d="M3.5 6L5.5 8L8.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                                            </svg>
                                                                        )}
                                                                    </button>
                                                                    <div>
                                                                        <h5 className={`font-medium ${isCompletedForSelectedDate ? 'text-gray-500 dark:text-gray-400 line-through' : 'text-gray-800 dark:text-gray-200'}`}>
                                                                            {habit.name}
                                                                        </h5>
                                                                        {habit.description && !isCompletedForSelectedDate && (
                                                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{habit.description}</p>
                                                                        )}
                                                                        {category && (
                                                                            <div className="mt-1.5 flex items-center">
                                                                                <span
                                                                                    className="inline-block w-2 h-2 rounded-full mr-1.5"
                                                                                    style={{ backgroundColor: category.color }}
                                                                                ></span>
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                                    {category.name}
                                                                                </span>
                                                                            </div>
                                                                        )}

                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center space-x-2">
                                                                    <button
                                                                        onClick={() => handleEditClick(habit)}
                                                                        className="p-1.5 text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-primary-light"
                                                                        aria-label="Edit habit"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                        </svg>
                                                                    </button>
                                                                    {!isCompletedForSelectedDate && (
                                                                        <button
                                                                            onClick={() => handleJournalClick(habit.id)}
                                                                            className="p-1.5 text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-primary-light"
                                                                            aria-label="Add journal entry"
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                            </svg>
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => confirmDeleteHabit(habit.id)}
                                                                        className="p-1.5 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
                                                                        aria-label="Delete habit"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                                        </svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Category Management */}
                        <div className="mt-8">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Categories</h3>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsManagingCategories(!isManagingCategories)}
                                    className="text-sm py-1.5 px-3"
                                >
                                    {isManagingCategories ? 'Done' : 'Manage Categories'}
                                </Button>
                            </div>

                            <AnimatePresence>
                                {isManagingCategories && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Card className="mb-6">
                                            <CategoryManager
                                                categories={categories}
                                                onAddCategory={addCategory}
                                                onUpdateCategory={updateCategory}
                                                onDeleteCategory={deleteCategory}
                                            />
                                        </Card>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>

            {/* Celebration Modal */}
            <CelebrationModal
                isOpen={showCelebration}
                onClose={() => setShowCelebration(false)}
            />

            {/* Habit Edit Modal */}
            <HabitEditModal
                isOpen={!!editingHabit}
                onClose={() => setEditingHabit(null)}
                habit={editingHabit}
                categories={categories}
                onSave={updateHabit}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setHabitToDelete(null);
                }}
                onConfirm={() => habitToDelete && deleteHabit(habitToDelete)}
                title="Delete Habit"
                message="Are you sure you want to delete this habit? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                isLoading={isDeleting}
            />
        </DashboardLayout>
    );
};

export default Dashboard; 