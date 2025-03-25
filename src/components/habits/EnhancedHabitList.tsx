import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Habit, Category } from '../types';
import Button from './ui/Button';
import Confetti from './Confetti';

interface EnhancedHabitListProps {
    habits: Habit[];
    categories: Category[];
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    onReorder: (reorderedHabits: Habit[]) => void;
    onJournalClick: (habitId: string) => void;
}

interface SortableHabitItemProps {
    habit: Habit;
    categories: Category[];
    onToggle: (id: string) => void;
    onDelete: (id: string) => void;
    onJournalClick: (habitId: string) => void;
}

const SortableHabitItem: React.FC<SortableHabitItemProps> = ({
    habit,
    categories,
    onToggle,
    onDelete,
    onJournalClick
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: habit.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.8 : 1,
    };

    const category = categories.find(c => c.id === habit.category);
    const [showConfetti, setShowConfetti] = useState(false);

    const handleToggle = () => {
        // If the habit is not completed and is being marked as completed
        if (!habit.completed) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
        }
        onToggle(habit.id);
    };

    // Calculate progress for visual feedback
    const getProgressPercentage = () => {
        if (!habit.completionHistory || habit.completionHistory.length === 0) {
            return habit.completed ? 100 : 0;
        }

        const recentHistory = habit.completionHistory.slice(-7); // Last 7 entries
        const completedCount = recentHistory.filter(record => record.completed).length;
        return (completedCount / recentHistory.length) * 100;
    };

    const progressPercentage = getProgressPercentage();

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <motion.div
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className={`relative mb-3 bg-white dark:bg-darkTheme-secondary rounded-lg border shadow-sm hover:shadow transition-all ${isDragging ? 'border-primary dark:border-primary-light' : 'border-gray-100 dark:border-gray-700'
                    }`}
            >
                {showConfetti && <Confetti />}

                <div className="p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                            <button
                                onClick={handleToggle}
                                className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${habit.completed
                                        ? 'bg-primary border-primary dark:bg-primary-light dark:border-primary-light text-white'
                                        : 'border-gray-300 dark:border-gray-600'
                                    }`}
                                aria-label={habit.completed ? 'Mark as incomplete' : 'Mark as complete'}
                            >
                                {habit.completed && (
                                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                                        <path d="M3.5 6L5.5 8L8.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </button>

                            <div className="flex-1">
                                <div className="flex items-center">
                                    <h3 className={`font-medium ${habit.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                                        {habit.name}
                                    </h3>
                                    {category && (
                                        <span
                                            className="ml-2 px-2 py-0.5 text-xs rounded-full"
                                            style={{
                                                backgroundColor: `${category.color}20`, // 20% opacity
                                                color: category.color,
                                            }}
                                        >
                                            {category.name}
                                        </span>
                                    )}
                                </div>

                                {habit.description && (
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        {habit.description}
                                    </p>
                                )}

                                <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-4">
                                    <span className="capitalize">{habit.frequency}</span>

                                    {habit.streak > 0 && (
                                        <span className="flex items-center text-primary dark:text-primary-light font-medium">
                                            <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                            </svg>
                                            {habit.streak} day streak
                                        </span>
                                    )}
                                </div>

                                <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                    <div
                                        className="bg-primary dark:bg-primary-light h-1.5 rounded-full transition-all duration-500"
                                        style={{ width: `${progressPercentage}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center space-x-1">
                            <button
                                {...listeners}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-grab active:cursor-grabbing"
                                aria-label="Drag to reorder"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                </svg>
                            </button>

                            <button
                                onClick={() => onJournalClick(habit.id)}
                                className="p-1.5 text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-primary-light"
                                aria-label="Add journal entry"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </button>

                            <button
                                onClick={() => onDelete(habit.id)}
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
            </motion.div>
        </div>
    );
};

const EnhancedHabitList: React.FC<EnhancedHabitListProps> = ({
    habits,
    categories,
    onToggle,
    onDelete,
    onReorder,
    onJournalClick
}) => {
    const [activeFilter, setActiveFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
    const [activeCategory, setActiveCategory] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = habits.findIndex(habit => habit.id === active.id);
            const newIndex = habits.findIndex(habit => habit.id === over.id);

            const reorderedHabits = arrayMove(habits, oldIndex, newIndex).map(
                (habit, index) => ({ ...habit, order: index })
            );

            onReorder(reorderedHabits);
        }
    };

    const filteredHabits = habits.filter(habit => {
        const frequencyMatch = activeFilter === 'all' || habit.frequency === activeFilter;
        const categoryMatch = !activeCategory || habit.category === activeCategory;
        return frequencyMatch && categoryMatch;
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <Button
                    variant={activeFilter === 'all' ? 'primary' : 'outline'}
                    onClick={() => setActiveFilter('all')}
                    className="text-sm py-1.5 px-3"
                >
                    All
                </Button>
                <Button
                    variant={activeFilter === 'daily' ? 'primary' : 'outline'}
                    onClick={() => setActiveFilter('daily')}
                    className="text-sm py-1.5 px-3"
                >
                    Daily
                </Button>
                <Button
                    variant={activeFilter === 'weekly' ? 'primary' : 'outline'}
                    onClick={() => setActiveFilter('weekly')}
                    className="text-sm py-1.5 px-3"
                >
                    Weekly
                </Button>
                <Button
                    variant={activeFilter === 'monthly' ? 'primary' : 'outline'}
                    onClick={() => setActiveFilter('monthly')}
                    className="text-sm py-1.5 px-3"
                >
                    Monthly
                </Button>
            </div>

            {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={`px-3 py-1.5 text-sm rounded-full transition-colors ${activeCategory === null
                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                    >
                        All Categories
                    </button>

                    {categories.map(category => (
                        <button
                            key={category.id}
                            onClick={() => setActiveCategory(category.id)}
                            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${activeCategory === category.id
                                    ? 'text-gray-800 dark:text-gray-200'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-opacity-80'
                                }`}
                            style={{
                                backgroundColor: activeCategory === category.id
                                    ? `${category.color}30` // 30% opacity
                                    : `${category.color}15`, // 15% opacity
                                color: category.color,
                            }}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
            )}

            {filteredHabits.length === 0 ? (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-gray-500 dark:text-gray-400 text-center py-6"
                >
                    No habits match your current filters. Try changing your filters or add a new habit.
                </motion.p>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={filteredHabits.map(habit => habit.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <AnimatePresence>
                            {filteredHabits.map(habit => (
                                <SortableHabitItem
                                    key={habit.id}
                                    habit={habit}
                                    categories={categories}
                                    onToggle={onToggle}
                                    onDelete={onDelete}
                                    onJournalClick={onJournalClick}
                                />
                            ))}
                        </AnimatePresence>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
};

export default EnhancedHabitList; 