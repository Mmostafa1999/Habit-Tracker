import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import PageTransition from '../components/PageTransition';

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const { resetPassword } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setMessage(null);
            setLoading(true);
            await resetPassword(email);
            setMessage('Check your email for password reset instructions');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageTransition>
            <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="w-full max-w-md space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-center"
                    >
                        <h1 className="text-3xl font-extrabold text-gray-900">Reset your password</h1>
                        <p className="mt-2 text-sm text-gray-600">
                            We'll send you an email with a link to reset your password
                        </p>
                    </motion.div>

                    <Card>
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mb-6 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200"
                            >
                                {message}
                            </motion.div>
                        )}

                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <Input
                                label="Email address"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                placeholder="Enter your email"
                            />

                            <Button
                                type="submit"
                                fullWidth
                                isLoading={loading}
                            >
                                Send reset link
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600">
                                Remember your password?{' '}
                                <Link to="/login" className="font-medium text-primary hover:text-primary-dark transition-colors duration-200">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </PageTransition>
    );
};

export default ForgotPassword; 