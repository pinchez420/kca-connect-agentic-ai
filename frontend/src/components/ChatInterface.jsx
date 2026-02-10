import React, { useState, useRef, useEffect, useCallback } from "react";
import { chatWithAgentStream } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import Settings from "./Settings";
import UserProfile from "./UserProfile";
import kcaLogo from "../assets/kca-logo.png";

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
    const streamingContentRef = useRef("");
    const messagesEndRef = useRef(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

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
        
        // Clear streaming ref and add user message
        streamingContentRef.current = "";
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);
        setError(null);

        // Create a placeholder message for streaming response
        const streamingMessage = {
            role: "agent",
            content: "",
            timestamp: new Date(),
            isStreaming: true
        };
        
        setMessages((prev) => [...prev, streamingMessage]);

        try {
            await chatWithAgentStream(
                userMessage.content,
                session?.access_token,
                // onChunk - accumulate and update smoothly
                (chunk) => {
                    streamingContentRef.current += chunk;
                    setMessages((prev) => {
                        const updated = [...prev];
                        const lastMsg = updated[updated.length - 1];
                        if (lastMsg && lastMsg.role === "agent" && lastMsg.isStreaming) {
                            lastMsg.content = streamingContentRef.current;
                        }
                        return updated;
                    });
                },
                // onComplete - streaming done
                () => {
                    setMessages((prev) => {
                        const updated = [...prev];
                        const lastMsg = updated[updated.length - 1];
                        if (lastMsg && lastMsg.role === "agent") {
                            lastMsg.isStreaming = false;
                        }
                        return updated;
                    });
                    setIsLoading(false);
                },
                // onError
                (errMsg) => {
                    setError(errMsg || "Failed to get response. Please try again.");
                    setIsLoading(false);
                    // Remove the streaming message on error
                    setMessages((prev) => prev.filter((msg) => !msg.isStreaming));
                }
            );
        } catch (err) {
            setError("Failed to get response. Please try again.");
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

    // Helper to render message content with cursor
    const renderMessageContent = (content, isStreaming) => {
        if (!content) return null;
        
        const lines = content.split("\n");
        const lastLine = lines[lines.length - 1];
        const otherLines = lines.slice(0, -1);
        
        return (
            <>
                {otherLines.map((line, i) => (
                    <p key={i} className="mb-1 last:mb-0 text-sm leading-relaxed">
                        {line}
                    </p>
                ))}
                <p className="text-sm leading-relaxed inline">
                    {lastLine}
                    {isStreaming && (
                        <span className="streaming-cursor inline-block w-0.5 h-4 bg-accent-primary ml-0.5 align-middle" />
                    )}
                </p>
            </>
        );
    };

    return (
        <div className={`flex flex-col h-screen bg-bg-primary transition-colors duration-300 ${isPremium ? 'premium-glow' : ''}`}>
            {/* Header */}
            <div className={`bg-bg-secondary/80 backdrop-blur-md shadow-sm border-b border-border-primary p-4 z-10`}>
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={kcaLogo} alt="KCA University Logo" className="w-10 h-10 object-contain" />
                        <div>
                            <h1 className={`text-2xl font-bold ${isPremium ? 'premium-gradient-text' : 'bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'}`}>
                                KCA Connect AI
                            </h1>
                            <p className={`text-sm text-text-secondary`}>Your intelligent university assistant</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Settings />
                        <div className="h-8 w-px bg-border-primary hidden sm:block"></div>
                        <UserProfile />
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 w-full scrollbar-thin scrollbar-thumb-accent-primary scrollbar-track-transparent">
                <div className="max-w-4xl mx-auto space-y-4">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
                        >
                            <div
                                className={`group max-w-[75%] ${msg.role === "user"
                                    ? (isPremium ? "premium-gradient-bg text-white" : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white") + " rounded-2xl rounded-br-md"
                                    : "bg-bg-secondary/60 backdrop-blur-sm text-text-primary rounded-2xl rounded-bl-md"
                                    } p-4 transition-all duration-200`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        {msg.role === "user" ? (
                                            msg.content.split("\n").map((line, i) => (
                                                <p key={i} className="mb-1 last:mb-0 text-sm leading-relaxed">
                                                    {line}
                                                </p>
                                            ))
                                        ) : (
                                            renderMessageContent(msg.content, msg.isStreaming)
                                        )}
                                    </div>
                                    {msg.role === "agent" && !msg.isStreaming && (
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
                    {isLoading && !messages.some(m => m.isStreaming) && (
                        <div className="flex justify-start">
                            <div className="bg-bg-secondary/60 backdrop-blur-sm p-4 rounded-2xl rounded-bl-md">
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
                        className={`flex-1 p-3 rounded-xl border border-border-primary/50 focus:border-accent-primary bg-bg-primary/50 text-text-primary transition-all duration-200 outline-none`}
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

