import React, { useState, useRef, useEffect } from "react";
import { chatWithAgent } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import Settings from "./Settings";
import { supabase } from "../lib/supabaseClient";
import UserProfile from "./UserProfile";

const ChatInterface = () => {
    const { theme } = useTheme();
    const { session } = useAuth();
    const [messages, setMessages] = useState([
        {
            role: "agent",
            content: "Hello! I'm your KCA University assistant. How can I help you today?",
            timestamp: new Date()
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = {
            role: "user",
            content: input,
            timestamp: new Date()
        };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);
        setError(null);

        try {
            const response = await chatWithAgent(input, session?.access_token);
            const agentMessage = {
                role: "agent",
                content: response,
                timestamp: new Date()
            };
            setMessages((prev) => [...prev, agentMessage]);
        } catch (err) {
            setError("Failed to get response. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const retryLastMessage = () => {
        const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
        if (lastUserMessage) {
            setInput(lastUserMessage.content);
            setError(null);
        }
    };

    const isPremium = theme === 'premium';

    return (
        <div className={`flex flex-col h-screen bg-bg-primary transition-colors duration-300 ${isPremium ? 'premium-glow' : ''}`}>
            {/* Header */}
            <div className={`bg-bg-secondary/80 backdrop-blur-md shadow-sm border-b border-border-primary p-4 z-10`}>
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className={`text-2xl font-bold ${isPremium ? 'premium-gradient-text' : 'bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'}`}>
                            KCA Connect AI
                        </h1>
                        <p className={`text-sm text-text-secondary`}>Your intelligent university assistant</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Settings />
                        <div className="h-8 w-px bg-border-primary hidden sm:block"></div>
                        <UserProfile />
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 max-w-4xl w-full mx-auto">
                <div className="space-y-4">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
                        >
                            <div
                                className={`group max-w-[75%] ${msg.role === "user"
                                    ? (isPremium ? "premium-gradient-bg text-white" : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white") + " rounded-2xl rounded-br-md"
                                    : "bg-bg-secondary/80 backdrop-blur-sm text-text-primary shadow-md rounded-2xl rounded-bl-md border border-border-primary"
                                    } p-4 transition-all duration-200 hover:shadow-lg`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        {msg.content.split("\n").map((line, i) => (
                                            <p key={i} className="mb-1 last:mb-0 text-sm leading-relaxed">
                                                {line}
                                            </p>
                                        ))}
                                    </div>
                                    {msg.role === "agent" && (
                                        <button
                                            onClick={() => copyToClipboard(msg.content)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-bg-primary rounded"
                                            title="Copy to clipboard"
                                        >
                                            <svg className={`w-4 h-4 text-text-secondary`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                                <div className={`text-xs mt-2 ${msg.role === "user" ? (isPremium ? "text-amber-100" : "text-indigo-200") : "text-text-secondary"}`}>
                                    {formatTime(msg.timestamp)}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-bg-secondary/80 backdrop-blur-sm p-4 rounded-2xl rounded-bl-md shadow-md border border-border-primary">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <div className={`w-2 h-2 ${isPremium ? 'bg-amber-500' : 'bg-accent-primary'} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
                                        <div className={`w-2 h-2 ${isPremium ? 'bg-amber-500' : 'bg-accent-primary'} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
                                        <div className={`w-2 h-2 ${isPremium ? 'bg-amber-500' : 'bg-accent-primary'} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                    <span className="text-sm text-text-secondary">Thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="max-w-4xl w-full mx-auto px-4 pb-2">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center justify-between">
                        <span className="text-sm text-red-500">{error}</span>
                        <button
                            onClick={retryLastMessage}
                            className="text-sm text-red-500 font-semibold hover:underline"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {/* Input Form */}
            <div className={`bg-bg-secondary/80 backdrop-blur-md shadow-lg border-t border-border-primary p-4`}>
                <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about timetables, fees, exams..."
                        className={`flex-1 p-3 rounded-xl border-2 border-border-primary focus:outline-none focus:border-accent-primary bg-bg-primary text-text-primary transition-all duration-200`}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className={`${isPremium ? 'premium-gradient-bg' : 'bg-gradient-to-r from-indigo-600 to-purple-600'} text-white px-8 py-3 rounded-xl hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md hover:shadow-lg transform hover:scale-105`}
                        disabled={isLoading || !input.trim()}
                    >
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatInterface;
