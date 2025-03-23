import React, { useState, useRef, useEffect } from 'react';
import { generateText, generateContextAwareText } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import './GeminiChat.css'; // We'll create this next

interface Message {
    role: 'user' | 'ai';
    content: string;
    isError?: boolean;
    timestamp?: Date;
}

// Helper function to format AI responses
const formatAIResponse = (text: string): string => {
    // Handle code blocks with ```
    let formattedText = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Handle inline code with `code`
    formattedText = formattedText.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Replace numbered lists (1., 2., etc.) with properly formatted HTML
    formattedText = formattedText.replace(/(\d+\.\s)(.*?)(?=\n\d+\.|\n\n|$)/gs, '<div class="list-item"><span class="list-number">$1</span>$2</div>');

    // Replace bullet points (*, -, •)
    formattedText = formattedText.replace(/([*•-]\s)(.*?)(?=\n[*•-]|\n\n|$)/gs, '<div class="list-item"><span class="list-bullet">•</span>$2</div>');

    // Add paragraph spacing
    formattedText = formattedText.replace(/\n\n/g, '</p><p>');

    // Replace single newlines with breaks inside paragraphs
    formattedText = formattedText.replace(/\n/g, '<br />');

    // Format bold text with **text**
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Format italic text with *text*
    formattedText = formattedText.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Format links
    formattedText = formattedText.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Format headers
    formattedText = formattedText.replace(/#{3,6}\s+(.+)/g, '<h4>$1</h4>');
    formattedText = formattedText.replace(/#{2}\s+(.+)/g, '<h3>$1</h3>');
    formattedText = formattedText.replace(/#{1}\s+(.+)/g, '<h2>$1</h2>');

    // Wrap in paragraphs if not already wrapped
    if (!formattedText.startsWith('<p>')) {
        formattedText = `<p>${formattedText}</p>`;
    }

    return formattedText;
};

const GeminiChat: React.FC = () => {
    const [input, setInput] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { currentUser } = useAuth(); // Get current user from your auth context
    const [isContextAware, setIsContextAware] = useState<boolean>(true);

    // Add a welcome message when component mounts
    useEffect(() => {
        setMessages([
            {
                role: 'ai',
                content: "Hello! I'm your habit assistant. How can I help you today? You can ask me about your habits and I'll check your tracker data.",
                timestamp: new Date()
            },
        ]);
    }, []);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!input.trim() || isLoading) return;

        // Reset error state
        setError(null);

        // Add user message to chat
        const userMessage: Message = {
            role: 'user',
            content: input,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Get response from Gemini AI with context awareness if enabled
            let aiResponse = '';

            if (isContextAware && currentUser) {
                // Use context-aware text generation
                aiResponse = await generateContextAwareText(input, currentUser.uid);
            } else {
                // Use standard text generation
                aiResponse = await generateText(input);
            }

            // Add AI response to chat
            const aiMessage: Message = {
                role: 'ai',
                content: aiResponse,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            const typedError = error as Error; // Assert the type of error
            console.error('Error getting AI response:', typedError);

            // Get a more user-friendly error message
            let errorMessage = 'Sorry, I encountered an error. Please try again later.';

            // Check if it's an API key issue
            if (typedError.message.includes('API key')) {
                errorMessage = 'The AI service is not properly configured. Please check the API key.';
            } else {
                // Use the error message but keep it user-friendly
                errorMessage = `Error: ${typedError.message}`;
            }

            // Add error message to chat
            const errorAiMessage: Message = {
                role: 'ai',
                content: errorMessage,
                isError: true,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, errorAiMessage]);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // Show login prompt if user is not logged in
    if (!currentUser) {
        return (
            <div className="bg-white dark:bg-darkTheme-secondary p-8 rounded-lg shadow-md text-center">
                <h2 className="text-2xl font-bold mb-4 text-primary dark:text-primary-light">Habit AI Assistant</h2>
                <p className="text-gray-600 dark:text-gray-400">Please log in to use the AI assistant.</p>
            </div>
        );
    }

    // Format timestamp
    const formatTime = (date: Date | undefined) => {
        if (!date) return '';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-white dark:bg-darkTheme-secondary rounded-lg shadow-md p-4 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-primary dark:text-primary-light">Gemini AI Assistant</h2>

            {/* Display API key warning if needed */}
            {error && error.includes('API key') && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <p className="font-bold">Configuration Error</p>
                    <p>The Gemini API key is missing or invalid. Please check your .env file and make sure VITE_GEMINI_API_KEY is set correctly.</p>
                </div>
            )}

            {/* Toggle for context awareness */}
            <div className="mb-4 flex items-center">
                <label className="inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={isContextAware}
                        onChange={() => setIsContextAware(!isContextAware)}
                    />
                    <div className="relative w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                        Habit Tracker Awareness {isContextAware ? '(ON)' : '(OFF)'}
                    </span>
                </label>
            </div>

            {/* Chat messages */}
            <div className="bg-gray-50 dark:bg-darkTheme-accent p-4 rounded-lg h-96 overflow-y-auto mb-4">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 mt-32">
                        <p>Ask me anything about habits, productivity, or well-being!</p>
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <div
                            key={index}
                            className={`mb-6 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
                        >
                            {/* Message bubble */}
                            <div className="flex items-end">
                                {/* AI Avatar (only show for AI messages) */}
                                {message.role === 'ai' && (
                                    <div className="flex-shrink-0 mr-2 mb-1">
                                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">
                                            AI
                                        </div>
                                    </div>
                                )}

                                {/* Message content */}
                                <div
                                    className={`max-w-[75%] p-3 rounded-lg shadow-sm ${message.role === 'user'
                                        ? 'bg-blue-500 text-white ml-auto rounded-br-none'
                                        : message.isError
                                            ? 'bg-red-100 text-red-800 border border-red-300 rounded-bl-none'
                                            : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-bl-none'
                                        }`}
                                >
                                    {message.role === 'ai' && !message.isError ? (
                                        <div
                                            className="ai-message-content"
                                            dangerouslySetInnerHTML={{ __html: formatAIResponse(message.content) }}
                                        />
                                    ) : (
                                        <div>{message.content}</div>
                                    )}
                                    <div className="text-xs mt-1 opacity-70 text-right">
                                        {formatTime(message.timestamp)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className="text-left mb-4 flex items-end">
                        <div className="flex-shrink-0 mr-2 mb-1">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">
                                AI
                            </div>
                        </div>
                        <div className="inline-block p-3 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-bl-none">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                                <span className="ml-2 text-sm">AI is thinking...</span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-darkTheme-accent dark:text-white rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition disabled:bg-blue-300 dark:disabled:bg-blue-800"
                    disabled={isLoading || !input.trim()}
                >
                    {isLoading ? 'Sending...' : 'Send'}
                </button>
            </form>
        </div>
    );
};

export default GeminiChat; 