import { useState, useEffect } from 'react';
import { generateHabitSuggestions } from '../services/geminiService';

interface Props {
    userContext?: string;
}

const HabitSuggestions = ({ userContext = "wants to improve overall wellbeing" }: Props) => {
    const [suggestions, setSuggestions] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                setLoading(true);
                const result = await generateHabitSuggestions(userContext);
                setSuggestions(result);
                setError(null);
            } catch (err) {
                console.error('Error fetching habit suggestions:', err);
                setError('Failed to load habit suggestions. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchSuggestions();
    }, [userContext]);

    return (
        <div className="bg-white dark:bg-darkTheme-secondary p-5 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3 text-primary dark:text-primary-light">
                Personalized Habit Suggestions
            </h3>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
            ) : error ? (
                <div className="text-red-500 py-3">{error}</div>
            ) : (
                <div className="prose dark:prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: suggestions.replace(/\n/g, '<br/>') }} />
                </div>
            )}

            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                <p>Powered by Gemini AI • Suggestions are for guidance only</p>
            </div>
        </div>
    );
};

export default HabitSuggestions; 