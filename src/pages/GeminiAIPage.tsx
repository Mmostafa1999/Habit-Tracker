import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GeminiChat from '../components/GeminiChat';
import { useAuth } from '../contexts/AuthContext';

const GeminiAIPage = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(false);

    // Check if API key is available
    useEffect(() => {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey || apiKey.trim() === '') {
            setApiKeyMissing(true);
            console.error('Gemini API key is missing');
        }
    }, []);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!currentUser) {
            navigate('/login');
        }
    }, [currentUser, navigate]);

    if (!currentUser) {
        return null; // Don't render anything while redirecting
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6 text-center">AI Habit Assistant</h1>
            <p className="text-center mb-6 text-gray-600">
                Get personalized habit advice, motivation, and answers to your questions.
            </p>

            {apiKeyMissing && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
                    <h3 className="font-bold">API Key Missing</h3>
                    <p>The Gemini AI requires an API key to function. Please follow these steps:</p>
                    <ol className="list-decimal pl-5 mt-2">
                        <li>Go to <a href="https://makersuite.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a></li>
                        <li>Create a new API key</li>
                        <li>Add the key to your .env file as VITE_GEMINI_API_KEY</li>
                        <li>Restart the application</li>
                    </ol>
                </div>
            )}

            <GeminiChat />
        </div>
    );
};

export default GeminiAIPage; 