import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Category } from '../types';
import Button from './ui/Button';
import Input from './ui/Input';

interface CategoryManagerProps {
    categories: Category[];
    onAddCategory: (category: Omit<Category, 'id'>) => void;
    onUpdateCategory: (category: Category) => void;
    onDeleteCategory: (id: string) => void;
}

const PRESET_COLORS = [
    '#E50046', // primary
    '#FDAB9E', // secondary
    '#FFF0BD', // accent
    '#C7DB9C', // background
    '#4F46E5', // indigo
    '#10B981', // emerald
    '#F59E0B', // amber
    '#6366F1', // violet
];

const CategoryManager: React.FC<CategoryManagerProps> = ({
    categories,
    onAddCategory,
    onUpdateCategory,
    onDeleteCategory,
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleAddCategory = () => {
        if (newCategoryName.trim() === '') return;

        onAddCategory({
            name: newCategoryName.trim(),
            color: selectedColor,
            order: categories.length,
        });

        setNewCategoryName('');
        setSelectedColor(PRESET_COLORS[0]);
        setIsAdding(false);
    };

    const handleUpdateCategory = (id: string) => {
        const category = categories.find(c => c.id === id);
        if (!category || newCategoryName.trim() === '') return;

        onUpdateCategory({
            ...category,
            name: newCategoryName.trim(),
            color: selectedColor,
        });

        setNewCategoryName('');
        setSelectedColor(PRESET_COLORS[0]);
        setEditingId(null);
    };

    const startEditing = (category: Category) => {
        setNewCategoryName(category.name);
        setSelectedColor(category.color);
        setEditingId(category.id);
        setIsAdding(false);
    };

    const cancelEditing = () => {
        setNewCategoryName('');
        setSelectedColor(PRESET_COLORS[0]);
        setEditingId(null);
        setIsAdding(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Categories</h2>
                {!isAdding && !editingId && (
                    <Button
                        variant="outline"
                        onClick={() => setIsAdding(true)}
                        className="text-sm py-1.5 px-3"
                    >
                        Add Category
                    </Button>
                )}
            </div>

            <AnimatePresence>
                {(isAdding || editingId) && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-gray-50 dark:bg-darkTheme-accent p-4 rounded-lg"
                    >
                        <div className="space-y-3">
                            <Input
                                label="Category Name"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="e.g., Health, Work, Personal"
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Color
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {PRESET_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            className={`w-8 h-8 rounded-full transition-transform ${selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                                                }`}
                                            style={{ backgroundColor: color }}
                                            onClick={() => setSelectedColor(color)}
                                            aria-label={`Select color ${color}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex space-x-2 pt-2">
                                {editingId ? (
                                    <>
                                        <Button onClick={() => handleUpdateCategory(editingId)}>
                                            Update
                                        </Button>
                                        <Button variant="outline" onClick={cancelEditing}>
                                            Cancel
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button onClick={handleAddCategory}>
                                            Add
                                        </Button>
                                        <Button variant="outline" onClick={() => setIsAdding(false)}>
                                            Cancel
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="space-y-2">
                {categories.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                        No categories yet. Add one to organize your habits.
                    </p>
                ) : (
                    categories.map((category) => (
                        <motion.div
                            key={category.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between p-3 bg-white dark:bg-darkTheme-secondary rounded-lg shadow-sm"
                        >
                            <div className="flex items-center">
                                <div
                                    className="w-4 h-4 rounded-full mr-3"
                                    style={{ backgroundColor: category.color }}
                                />
                                <span className="font-medium dark:text-gray-200">{category.name}</span>
                            </div>
                            <div className="flex space-x-1">
                                <button
                                    onClick={() => startEditing(category)}
                                    className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    aria-label={`Edit ${category.name}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => onDeleteCategory(category.id)}
                                    className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                                    aria-label={`Delete ${category.name}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CategoryManager; 