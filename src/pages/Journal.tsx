import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Habit } from '../types';
import { toast } from 'react-hot-toast';

const Journal: React.FC = () => {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [journalEntries, setJournalEntries] = useState<{
        habitId: string;
        habitName: string;
        entries: { date: Date | string; entry: string }[];
    }[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeHabitId, setActiveHabitId] = useState<string | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [showAddEntryModal, setShowAddEntryModal] = useState(false);
    const [newEntryHabitId, setNewEntryHabitId] = useState<string>('');
    const [newEntryDate, setNewEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [newEntryText, setNewEntryText] = useState<string>('');
    const [editEntry, setEditEntry] = useState<{ habitId: string; date: string; entry: string } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [entryToDelete, setEntryToDelete] = useState<{ habitId: string; date: Date | string } | null>(null);

    const { currentUser } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Handle URL parameters for filtering
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const habitId = params.get('habitId');
        if (habitId) {
            setActiveHabitId(habitId);
        }
    }, [location]);

    useEffect(() => {
        const fetchHabitsAndJournalEntries = async () => {
            if (!currentUser) return;

            try {
                setLoading(true);

                // Fetch habits
                const habitsRef = collection(db, 'users', currentUser.uid, 'habits');
                const habitsSnapshot = await getDocs(habitsRef);

                const habitsData: Habit[] = [];
                habitsSnapshot.forEach((doc) => {
                    habitsData.push({ id: doc.id, ...doc.data() } as Habit);
                });

                setHabits(habitsData);

                // Process journal entries from completion history
                const journalData: {
                    habitId: string;
                    habitName: string;
                    entries: { date: Date | string; entry: string }[];
                }[] = [];

                habitsData.forEach(habit => {
                    if (habit.completionHistory) {
                        const entriesWithJournal = habit.completionHistory
                            .filter(record => record.journalEntry)
                            .map(record => ({
                                date: record.date,
                                entry: record.journalEntry as string
                            }))
                            .sort((a, b) => {
                                const dateA = new Date(a.date).getTime();
                                const dateB = new Date(b.date).getTime();
                                return dateB - dateA; // Sort by date descending (newest first)
                            });

                        if (entriesWithJournal.length > 0) {
                            journalData.push({
                                habitId: habit.id,
                                habitName: habit.name,
                                entries: entriesWithJournal
                            });
                        }
                    }
                });

                setJournalEntries(journalData);
                setError(null);
            } catch (error) {
                console.error('Error fetching journal entries:', error);
                toast.error('Failed to load journal entries. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchHabitsAndJournalEntries();
    }, [currentUser]);

    const handleSaveJournalEntry = async (habitId: string, date: Date | string, entry: string) => {
        if (!currentUser) return;

        try {
            const habit = habits.find(h => h.id === habitId);
            if (!habit) return;

            // Find the completion record for this date
            const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

            const completionHistory = habit.completionHistory || [];
            const recordIndex = completionHistory.findIndex(
                record => new Date(record.date).toISOString().split('T')[0] === dateStr
            );

            if (recordIndex >= 0) {
                // Update existing record
                completionHistory[recordIndex].journalEntry = entry;
            } else {
                // Create new record
                completionHistory.push({
                    date: dateStr,
                    completed: false,
                    journalEntry: entry
                });
            }

            // Update in Firestore
            await updateDoc(doc(db, 'users', currentUser.uid, 'habits', habitId), {
                completionHistory
            });

            // Update local state
            setHabits(prevHabits =>
                prevHabits.map(h =>
                    h.id === habitId ? { ...h, completionHistory } : h
                )
            );

            // Update journal entries
            setJournalEntries(prevEntries => {
                const habitEntryIndex = prevEntries.findIndex(je => je.habitId === habitId);

                if (habitEntryIndex >= 0) {
                    // Update existing habit's entries
                    const updatedEntries = [...prevEntries];
                    const entryIndex = updatedEntries[habitEntryIndex].entries.findIndex(
                        e => new Date(e.date).toISOString().split('T')[0] === dateStr
                    );

                    if (entryIndex >= 0) {
                        // Update existing entry
                        updatedEntries[habitEntryIndex].entries[entryIndex].entry = entry;
                    } else {
                        // Add new entry
                        updatedEntries[habitEntryIndex].entries.push({ date: dateStr, entry });
                        // Sort by date descending
                        updatedEntries[habitEntryIndex].entries.sort((a, b) => {
                            const dateA = new Date(a.date).getTime();
                            const dateB = new Date(b.date).getTime();
                            return dateB - dateA;
                        });
                    }

                    return updatedEntries;
                } else {
                    // Add new habit entry
                    return [
                        ...prevEntries,
                        {
                            habitId,
                            habitName: habit.name,
                            entries: [{ date: dateStr, entry }]
                        }
                    ];
                }
            });

            // Close modal if we were adding a new entry
            if (showAddEntryModal) {
                setShowAddEntryModal(false);
                setNewEntryText('');
            }

        } catch (error) {
            console.error('Error saving journal entry:', error);
            toast.error('Failed to save journal entry. Please try again.');
        }
    };

    const handleAddNewEntry = () => {
        if (!newEntryHabitId || !newEntryDate || !newEntryText.trim()) {
            setError('Please fill in all fields to add a journal entry');
            return;
        }

        handleSaveJournalEntry(newEntryHabitId, newEntryDate, newEntryText);
    };

    const handleDeleteEntry = async (habitId: string, date: Date | string) => {
        if (!currentUser) return;

        try {
            const habit = habits.find(h => h.id === habitId);
            if (!habit) {
                console.error('Habit not found:', habitId);
                return;
            }

            // Find the completion record for this date
            const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

            const completionHistory = habit.completionHistory || [];
            const recordIndex = completionHistory.findIndex(
                record => new Date(record.date).toISOString().split('T')[0] === dateStr
            );

            if (recordIndex >= 0) {
                // Only remove the journal entry, keep the completion status
                completionHistory[recordIndex].journalEntry = undefined;
            } else {
                console.error('No record found for date:', dateStr);
                return; // Nothing to delete
            }

            // Update in Firestore
            await updateDoc(doc(db, 'users', currentUser.uid, 'habits', habitId), {
                completionHistory
            });

            // Update local state
            setHabits(prevHabits =>
                prevHabits.map(h =>
                    h.id === habitId ? { ...h, completionHistory } : h
                )
            );

            // Update journal entries
            setJournalEntries(prevEntries => {
                const habitEntryIndex = prevEntries.findIndex(je => je.habitId === habitId);

                if (habitEntryIndex >= 0) {
                    const updatedEntries = [...prevEntries];
                    const entriesWithoutDeleted = updatedEntries[habitEntryIndex].entries.filter(
                        e => new Date(e.date).toISOString().split('T')[0] !== dateStr
                    );

                    if (entriesWithoutDeleted.length === 0) {
                        return prevEntries.filter(je => je.habitId !== habitId);
                    }

                    updatedEntries[habitEntryIndex].entries = entriesWithoutDeleted;
                    return updatedEntries;
                }

                return prevEntries;
            });

            toast.success('Journal entry deleted!');

        } catch (error) {
            console.error('Error deleting journal entry:', error);
            toast.error('Failed to delete journal entry. Please try again.');
        }
    };

    // Apply all filters: habit, date range, and search
    const filteredEntries = journalEntries
        .filter(je => activeHabitId === 'all' || je.habitId === activeHabitId)
        .flatMap(je => je.entries
            .filter(entry => {
                const entryDate = new Date(entry.date).toISOString().split('T')[0];
                const matchesDateRange =
                    (!startDate || entryDate >= startDate) &&
                    (!endDate || entryDate <= endDate);

                const matchesSearch =
                    !searchQuery ||
                    entry.entry.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    je.habitName.toLowerCase().includes(searchQuery.toLowerCase());

                return matchesDateRange && matchesSearch;
            })
            .map(entry => ({
                habitId: je.habitId,
                habitName: je.habitName,
                date: entry.date,
                entry: entry.entry
            }))
        );

    // Sort all entries by date (newest first)
    filteredEntries.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
    });

    // For the add entry modal
    const resetModalForm = () => {
        setNewEntryHabitId(habits.length > 0 ? habits[0].id : '');
        setNewEntryDate(new Date().toISOString().split('T')[0]);
        setNewEntryText('');
    };

    const openAddEntryModal = () => {
        resetModalForm();
        setShowAddEntryModal(true);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Habit Journal
                    </h2>
                    <Button
                        onClick={openAddEntryModal}
                        className="w-full md:w-auto flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Entry
                    </Button>
                </div>

                <Card>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800"
                        >
                            {error}
                        </motion.div>
                    )}

                    {/* Search and filter controls */}
                    <div className="grid grid-cols-1  gap-4 mb-6">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search entries..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkTheme-accent dark:text-white"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkTheme-accent dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkTheme-accent dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Filter by Habit</h3>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant={activeHabitId === 'all' ? 'primary' : 'outline'}
                                onClick={() => {
                                    setActiveHabitId('all');
                                    // Update URL without habit ID
                                    navigate('/journal');
                                }}
                                className="text-sm py-1.5 px-3"
                            >
                                All Habits
                            </Button>

                            {habits.filter(habit => journalEntries.some(je => je.habitId === habit.id)).map(habit => (
                                <Button
                                    key={habit.id}
                                    variant={activeHabitId === habit.id ? 'primary' : 'outline'}
                                    onClick={() => {
                                        setActiveHabitId(habit.id);
                                        // Update URL with habit ID
                                        navigate(`/journal?habitId=${habit.id}`);
                                    }}
                                    className="text-sm py-1.5 px-3"
                                >
                                    {habit.name}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary dark:border-primary-light"></div>
                        </div>
                    ) : filteredEntries.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="flex justify-center mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-300 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 12v3m0 0v3m0-3h3m-3 0H9" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-2">
                                No journal entries found
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                                {activeHabitId !== 'all'
                                    ? "You haven't written any journal entries for this habit yet."
                                    : searchQuery || startDate || endDate
                                        ? "No entries match your current filters. Try adjusting your search or date range."
                                        : "Start capturing your thoughts and reflections about your habits."}
                            </p>
                            <Button onClick={openAddEntryModal}>
                                Create Your First Entry
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredEntries.map((entry, index) => (
                                <motion.div
                                    key={`${entry.habitId}-${entry.date}-${index}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-white dark:bg-darkTheme-secondary rounded-lg shadow-sm overflow-hidden"
                                >
                                    <div className="p-4">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <div className="flex items-center mb-1">
                                                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mr-2">
                                                        {entry.habitName}
                                                    </h3>
                                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-primary-dark/20 dark:text-primary-light">
                                                        {typeof entry.date === 'string'
                                                            ? new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                            : entry.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                    {entry.entry}
                                                </p>
                                            </div>
                                            <div className="flex space-x-1">
                                                <button
                                                    onClick={() => {
                                                        setEditEntry({ habitId: entry.habitId, date: entry.date.toString(), entry: entry.entry });
                                                        setShowAddEntryModal(true);
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-primary-light"
                                                    aria-label="Edit entry"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setEntryToDelete({ habitId: entry.habitId, date: entry.date });
                                                        setShowDeleteConfirm(true);
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                                                    aria-label="Delete entry"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Add Entry Modal */}
            {showAddEntryModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-gray-900/60 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-darkTheme-secondary rounded-lg shadow-lg max-w-md w-full p-6"
                    >
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            {editEntry ? 'Edit Journal Entry' : 'Add Journal Entry'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Habit
                                </label>
                                <select
                                    value={newEntryHabitId}
                                    onChange={(e) => setNewEntryHabitId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkTheme-accent dark:text-white"
                                >
                                    {habits.map(habit => (
                                        <option key={habit.id} value={habit.id}>
                                            {habit.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={newEntryDate}
                                    onChange={(e) => setNewEntryDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkTheme-accent dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Journal Entry
                                </label>
                                <textarea
                                    value={newEntryText}
                                    onChange={(e) => setNewEntryText(e.target.value)}
                                    placeholder="Write your thoughts about this habit..."
                                    rows={5}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-darkTheme-accent dark:text-white resize-none"
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowAddEntryModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={() => {
                                    if (editEntry) {
                                        handleSaveJournalEntry(editEntry.habitId, editEntry.date, newEntryText);
                                        toast.success('Journal entry updated!');
                                    } else {
                                        handleAddNewEntry();
                                    }
                                }}>
                                    {editEntry ? 'Update Entry' : 'Save Entry'}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 dark:bg-gray-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-darkTheme-secondary rounded-lg shadow-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold">Are you sure you want to delete this journal entry?</h3>
                        <div className="flex justify-end space-x-2 pt-2">
                            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                            <Button onClick={() => {
                                if (entryToDelete) {
                                    handleDeleteEntry(entryToDelete.habitId, entryToDelete.date);
                                }
                                setShowDeleteConfirm(false);
                            }}>Delete</Button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default Journal; 