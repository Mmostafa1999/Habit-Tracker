import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import DarkModeToggle from './ui/DarkModeToggle';

const Navbar: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white dark:bg-darkTheme-secondary shadow-md transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link to="/" className="flex-shrink-0 flex items-center">
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
                            <span className="text-xl font-bold text-primary dark:text-primary-light">HabitTracker</span>
                        </Link>
                    </div>

                    <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
                        {currentUser ? (
                            <>
                                <Link
                                    to="/dashboard"
                                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-darkTheme-accent transition-colors duration-200"
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    to="/journal"
                                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-darkTheme-accent transition-colors duration-200"
                                >
                                    Journal
                                </Link>
                                <Link
                                    to="/achievements"
                                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-darkTheme-accent transition-colors duration-200"
                                >
                                    Achievements
                                </Link>
                                <Link
                                    to="/profile"
                                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-darkTheme-accent transition-colors duration-200"
                                >
                                    Profile
                                </Link>
                                <Link
                                    to="/ai-assistant"
                                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-darkTheme-accent transition-colors duration-200"
                                >
                                    AI Assistant
                                </Link>
                                <DarkModeToggle />
                                <Button variant="outline" onClick={handleLogout}>
                                    Logout
                                </Button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-darkTheme-accent transition-colors duration-200"
                                >
                                    Login
                                </Link>
                                <DarkModeToggle />
                                <Link to="/signup">
                                    <Button>Sign Up</Button>
                                </Link>
                            </>
                        )}
                    </div>

                    <div className="flex items-center sm:hidden">
                        <DarkModeToggle />
                        <button
                            type="button"
                            className="ml-2 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-primary dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-darkTheme-accent focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary dark:focus:ring-primary-light transition-colors duration-200"
                            aria-expanded="false"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                        >
                            <span className="sr-only">Open main menu</span>
                            {isMenuOpen ? (
                                <svg
                                    className="block h-6 w-6"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            ) : (
                                <svg
                                    className="block h-6 w-6"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    aria-hidden="true"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        className="sm:hidden"
                    >
                        <div className="pt-2 pb-3 space-y-1 px-4">
                            {currentUser ? (
                                <>
                                    <Link
                                        to="/dashboard"
                                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-darkTheme-accent transition-colors duration-200"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Dashboard
                                    </Link>
                                    <Link
                                        to="/journal"
                                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-darkTheme-accent transition-colors duration-200"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Journal
                                    </Link>
                                    <Link
                                        to="/achievements"
                                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-darkTheme-accent transition-colors duration-200"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Achievements
                                    </Link>
                                    <Link
                                        to="/profile"
                                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-darkTheme-accent transition-colors duration-200"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Profile
                                    </Link>
                                    <Link
                                        to="/ai-assistant"
                                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-darkTheme-accent transition-colors duration-200"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        AI Assistant
                                    </Link>
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setIsMenuOpen(false);
                                        }}
                                        className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-primary dark:text-primary-light hover:text-primary-dark dark:hover:text-white hover:bg-gray-50 dark:hover:bg-darkTheme-accent transition-colors duration-200"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-darkTheme-accent transition-colors duration-200"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        to="/signup"
                                        className="block px-3 py-2 rounded-md text-base font-medium text-primary dark:text-primary-light hover:text-primary-dark dark:hover:text-white hover:bg-gray-50 dark:hover:bg-darkTheme-accent transition-colors duration-200"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        Sign Up
                                    </Link>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar; 