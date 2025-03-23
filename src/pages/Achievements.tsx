import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import AchievementBadge from '../components/AchievementBadge';
import Confetti from '../components/Confetti';
import { Achievement } from '../types';

// Default achievements
const DEFAULT_ACHIEVEMENTS: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
    {
        id: 'first-habit',
        name: 'Beginner',
        description: 'Create your first habit',
        icon: '🌱',
    },
    {
        id: 'three-days',
        name: 'On a Roll',
        description: 'Complete a habit for 3 days in a row',
        icon: '🔥',
    },
    {
        id: 'seven-days',
        name: 'Week Warrior',
        description: 'Complete a habit for 7 days in a row',
        icon: '📅',
    },
    {
        id: 'thirty-days',
        name: 'Monthly Master',
        description: 'Complete a habit for 30 days in a row',
        icon: '🏆',
    },
    {
        id: 'five-habits',
        name: 'Habit Collector',
        description: 'Create 5 different habits',
        icon: '🧩',
    },
    {
        id: 'all-categories',
        name: 'Organized',
        description: 'Create habits in 3 different categories',
        icon: '📊',
    },
    {
        id: 'journal-entry',
        name: 'Reflective',
        description: 'Write your first journal entry',
        icon: '📝',
    },
    {
        id: 'perfect-week',
        name: 'Perfect Week',
        description: 'Complete all habits for an entire week',
        icon: '⭐',
    },
];

const Achievements: React.FC = () => {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
    const { currentUser } = useAuth();

    useEffect(() => {
        const fetchAchievements = async () => {
            if (!currentUser) return;

            try {
                setLoading(true);
                const achievementsRef = collection(db, 'users', currentUser.uid, 'achievements');
                const querySnapshot = await getDocs(achievementsRef);

                let userAchievements: Achievement[] = [];

                // If user has no achievements yet, initialize with defaults
                if (querySnapshot.empty) {
                    userAchievements = DEFAULT_ACHIEVEMENTS.map(achievement => ({
                        ...achievement,
                        unlocked: false,
                    }));
                } else {
                    querySnapshot.forEach((doc) => {
                        userAchievements.push({ id: doc.id, ...doc.data() } as Achievement);
                    });

                    // Check if we need to add any new achievements that weren't there before
                    DEFAULT_ACHIEVEMENTS.forEach(defaultAchievement => {
                        if (!userAchievements.some(a => a.id === defaultAchievement.id)) {
                            userAchievements.push({
                                ...defaultAchievement,
                                unlocked: false,
                            });
                        }
                    });
                }

                // Sort achievements: unlocked first (by unlock date), then locked
                userAchievements.sort((a, b) => {
                    if (a.unlocked && !b.unlocked) return -1;
                    if (!a.unlocked && b.unlocked) return 1;
                    if (a.unlocked && b.unlocked && a.unlockedAt && b.unlockedAt) {
                        return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
                    }
                    return 0;
                });

                setAchievements(userAchievements);
                setError(null);
            } catch (error) {
                console.error('Error fetching achievements:', error);
                setError('Failed to load achievements. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchAchievements();
    }, [currentUser]);

    const handleAchievementClick = (achievement: Achievement) => {
        setSelectedAchievement(achievement);
        if (achievement.unlocked) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Your Achievements
                    </h2>
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

                    {showConfetti && <Confetti />}

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary dark:border-primary-light"></div>
                        </div>
                    ) : (
                        <div>
                            {selectedAchievement && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-6 p-4 bg-gray-50 dark:bg-darkTheme-accent rounded-lg"
                                >
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0 mr-4">
                                            <div
                                                className={`w-16 h-16 rounded-full flex items-center justify-center ${selectedAchievement.unlocked
                                                    ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light'
                                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                                                    }`}
                                            >
                                                <span className="text-2xl">{selectedAchievement.icon}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                                                {selectedAchievement.name}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                {selectedAchievement.description}
                                            </p>
                                            {selectedAchievement.unlocked && selectedAchievement.unlockedAt && (
                                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                                    Unlocked on {new Date(selectedAchievement.unlockedAt).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setSelectedAchievement(null)}
                                            className="ml-auto text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {achievements.map((achievement) => (
                                    <AchievementBadge
                                        key={achievement.id}
                                        achievement={achievement}
                                        onClick={() => handleAchievementClick(achievement)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default Achievements; 