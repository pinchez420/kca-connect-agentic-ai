import React, { useState, useRef, useEffect, useCallback } from "react";
import { chatWithAgentStream, autoSaveChat as autoSaveChatApi } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import ChatHistoryModal from "./ChatHistoryModal";
import kcaLogo from "../assets/kca-logo.png";

const ChatInterface = () => {
    const { theme } = useTheme();
    const { session, user } = useAuth();
    
    // Get user's name from user metadata (full_name or name)
    const userName = user?.user_metadata?.full_name || user?.user_metadata?.name;
    
    // Dynamic greeting based on whether user has set their name
    const getGreeting = () => {
        if (userName) {
            return `Hello, ${userName}! I'm KCA Connect AI, your official KCA University assistant. How can I help you today?`;
        }
        return "Hello! I'm KCA Connect AI, your official KCA University assistant. How can I help you today?";
    };
    
    const fullGreeting = getGreeting();
    
    // State for animated greeting (typing effect)
    const [displayedGreeting, setDisplayedGreeting] = useState("");
    const [greetingComplete, setGreetingComplete] = useState(false);
    
    // Typing effect for initial greeting
    useEffect(() => {
        let index = 0;
        setDisplayedGreeting("");
        setGreetingComplete(false);
        
        // Reset message content for streaming effect
        setMessages([
            {
                role: "agent",
                content: "",
                timestamp: new Date().toISOString(),
                isStreaming: true
            },
        ]);
        
        const timer = setInterval(() => {
            if (index < fullGreeting.length) {
                const currentText = fullGreeting.slice(0, index + 1);
                setDisplayedGreeting(currentText);
                // Update the message content for streaming effect
                setMessages(prev => {
                    const updated = [...prev];
                    if (updated[0] && updated[0].role === "agent") {
                        updated[0].content = currentText;
                        updated[0].isStreaming = true; // Keep streaming while typing
                    }
                    return updated;
                });
                index++;
            } else {
                clearInterval(timer);
                setGreetingComplete(true);
                // Stop streaming when complete
                setMessages(prev => {
                    const updated = [...prev];
                    if (updated[0] && updated[0].role === "agent") {
                        updated[0].isStreaming = false;
                    }
                    return updated;
                });
            }
        }, 30); // Speed of typing (lower = faster)
        
        return () => clearInterval(timer);
    }, []);
    
    const [messages, setMessages] = useState([
        {
            role: "agent",
            content: "", // Start empty for streaming effect
            timestamp: new Date().toISOString(),
            isStreaming: true // Start with streaming cursor
        },
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const streamingContentRef = useRef("");
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const abortControllerRef = useRef(null);
    const currentChatIdRef = useRef(null);

    // Modal states
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    // Helper to format conversation history for API
    const getConversationHistory = () => {
        return messages
            .filter(msg => !msg.isStreaming && msg.content.trim() && !msg.isSystem)
            .map(msg => ({
                role: msg.role === "user" ? "user" : "assistant",
                content: msg.content
            }));
    };

    // Auto-save chat after completion
    const autoSaveChat = useCallback(async () => {
        if (messages.length <= 1) return; // Don't save just the greeting

        const chatMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
        }));

        // Generate title from first user message
        const firstUserMsg = messages.find(m => m.role === 'user');
        const title = firstUserMsg 
            ? (firstUserMsg.content.length > 30 ? firstUserMsg.content.substring(0, 30) + "..." : firstUserMsg.content)
            : "New Chat";

        try {
            const result = await autoSaveChatApi(session.access_token, chatMessages, title, currentChatIdRef.current);
            if (result && result.chat_id) {
                currentChatIdRef.current = result.chat_id;
            }
        } catch (err) {
            console.error("Auto-save failed:", err);
        }
    }, [messages, session]);

    // Manual save chat
    const handleSaveChat = async () => {
        if (messages.length <= 1) {
            setError("No chat to save. Start a conversation first.");
            return;
        }

        try {
            const result = await autoSaveChat();
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            setError("Failed to save chat. Please try again.");
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Create abort controller for stopping generation
        abortControllerRef.current = new AbortController();

        const userMessage = {
            role: "user",
            content: input,
            timestamp: new Date().toISOString()
        };

        const conversationHistory = getConversationHistory();

        streamingContentRef.current = "";
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);
        setError(null);

        const streamingMessage = {
            role: "agent",
            content: "",
            timestamp: new Date().toISOString(),
            isStreaming: true
        };

        setMessages((prev) => [...prev, streamingMessage]);

        try {
            await chatWithAgentStream(
                userMessage.content,
                session?.access_token,
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
                async () => {
                    // Success completion - save chat
                    setMessages((prev) => {
                        const updated = [...prev];
                        const lastMsg = updated[updated.length - 1];
                        if (lastMsg && lastMsg.role === "agent") {
                            lastMsg.isStreaming = false;
                        }
                        return updated;
                    });
                    setIsLoading(false);
                    abortControllerRef.current = null;
                    
                    // Auto-focus input after response completion
                    setTimeout(() => {
                        inputRef.current?.focus();
                    }, 100);

                    // Save the chat
                    await autoSaveChat();
                },
                (errMsg) => {
                    // Error
                    setError(errMsg || "Failed to get response. Please try again.");
                    setIsLoading(false);
                    setMessages((prev) => prev.filter((msg) => !msg.isStreaming));
                    abortControllerRef.current = null;
                },
                conversationHistory,
                abortControllerRef.current?.signal,
                async () => {
                    // Abort callback - stop was triggered - save partial chat
                    setMessages((prev) => {
                        const updated = [...prev];
                        const lastMsg = updated[updated.length - 1];
                        if (lastMsg && lastMsg.role === "agent" && lastMsg.isStreaming) {
                            lastMsg.isStreaming = false;
                            if (!lastMsg.content.trim()) {
                                // Remove empty message if stopped immediately
                                return updated.slice(0, -1);
                            }
                        }
                        return updated;
                    });
                    setIsLoading(false);
                    abortControllerRef.current = null;
                    
                    // Auto-focus input after stop
                    setTimeout(() => {
                        inputRef.current?.focus();
                    }, 100);

                    // Save the partial chat
                    await autoSaveChat();
                }
            );
        } catch (err) {
            // Catch any other errors
            if (err.name !== 'AbortError') {
                setError("Failed to get response. Please try again.");
            }
            setIsLoading(false);
            abortControllerRef.current = null;
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    const handleNewChat = () => {
        // Reset typing animation for new chat
        let index = 0;
        setDisplayedGreeting("");
        setGreetingComplete(false);
        
        // Reset message with empty content for streaming effect
        setMessages([
            {
                role: "agent",
                content: "",
                timestamp: new Date().toISOString(),
                isStreaming: true
            },
        ]);
        
        const timer = setInterval(() => {
            if (index < fullGreeting.length) {
                const currentText = fullGreeting.slice(0, index + 1);
                setDisplayedGreeting(currentText);
                // Update message content for streaming effect
                setMessages(prev => {
                    const updated = [...prev];
                    if (updated[0] && updated[0].role === "agent") {
                        updated[0].content = currentText;
                        updated[0].isStreaming = true;
                    }
                    return updated;
                });
                index++;
            } else {
                clearInterval(timer);
                setGreetingComplete(true);
                // Stop streaming when complete
                setMessages(prev => {
                    const updated = [...prev];
                    if (updated[0] && updated[0].role === "agent") {
                        updated[0].isStreaming = false;
                    }
                    return updated;
                });
            }
        }, 30);
        
        setInput("");
        setError(null);
        currentChatIdRef.current = null;
    };

    const handleLoadChat = (chat) => {
        // Load a saved chat
        const loadedMessages = chat.messages.map(msg => ({
            ...msg,
            timestamp: msg.timestamp || new Date().toISOString()
        }));
        setMessages(loadedMessages);
        currentChatIdRef.current = chat.id;
    };

    const isPremium = theme === 'premium';

    // Helper to render inline formatting (bold, italic, code)
    const renderInlineFormatting = (text) => {
        if (!text) return null;
        
        // Split by formatting patterns
        const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|~~[^~]+~~)/g);
        
        return parts.map((part, i) => {
            // Bold
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
            }
            // Italic
            if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
                return <em key={i} className="italic">{part.slice(1, -1)}</em>;
            }
            // Inline code - theme-aware colors (visible in both light and dark mode)
            if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={i} className={`${isPremium ? 'bg-amber-900/50 text-amber-300' : 'bg-indigo-100 text-indigo-700'} px-1.5 py-0.5 rounded text-xs font-mono`}>{part.slice(1, -1)}</code>;
            }
            // Strikethrough
            if (part.startsWith('~~') && part.endsWith('~~')) {
                return <del key={i} className="text-gray-500 line-through">{part.slice(2, -2)}</del>;
            }
            return part;
        });
    };

    // Enhanced message content renderer with better formatting
    const renderMessageContent = (content, isStreaming) => {
        if (!content) return null;

        // Split content into blocks for better formatting
        const blocks = content.split(/\n\n+/);
        
        return (
            <div className="space-y-3">
                {blocks.map((block, blockIndex) => {
                    // Check if it's a code block
                    if (block.match(/^```[\s\S]*```$/)) {
                        const codeContent = block.replace(/^```(\w*)\n?/, '').replace(/```$/, '');
                        return (
                            <div key={blockIndex} className="relative group">
                                <pre className={`${isPremium ? 'bg-gray-900' : 'bg-slate-800'} text-gray-100 p-3 rounded-lg overflow-x-auto text-xs sm:text-sm font-mono border ${isPremium ? 'border-gray-700' : 'border-slate-600'}`}>
                                    <code>{codeContent}</code>
                                </pre>
                                <button
                                    onClick={() => copyToClipboard(codeContent)}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-gray-600 rounded hover:bg-gray-500"
                                    title="Copy code"
                                >
                                    <svg className="w-4 h-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>
                        );
                    }
                    
                    // Check if it's a numbered list
                    if (block.match(/^\d+\.\s/m)) {
                        const items = block.split('\n').filter(line => line.trim());
                        return (
                            <ol key={blockIndex} className="list-decimal list-inside space-y-1 ml-2">
                                {items.map((item, i) => {
                                    const text = item.replace(/^\d+\.\s*/, '');
                                    return (
                                        <li key={i} className="text-sm leading-relaxed text-text-primary">
                                            {renderInlineFormatting(text)}
                                        </li>
                                    );
                                })}
                            </ol>
                        );
                    }
                    
                    // Check if it's a bullet list
                    if (block.match(/^[-*•]\s/m)) {
                        const items = block.split('\n').filter(line => line.trim());
                        return (
                            <ul key={blockIndex} className="list-disc list-inside space-y-1 ml-2">
                                {items.map((item, i) => {
                                    const text = item.replace(/^[-*•]\s*/, '');
                                    return (
                                        <li key={i} className="text-sm leading-relaxed text-text-primary">
                                            {renderInlineFormatting(text)}
                                        </li>
                                    );
                                })}
                            </ul>
                        );
                    }
                    
                    // Check if it's a heading
                    if (block.match(/^#{1,3}\s/m)) {
                        const headingText = block.replace(/^#+\s*/, '');
                        const level = block.match(/^(#{1,3})/)[1].length;
                        const headingClasses = {
                            1: 'text-lg font-bold text-text-primary',
                            2: 'text-base font-semibold text-text-primary',
                            3: 'text-sm font-medium text-text-primary'
                        };
                        return (
                            <p key={blockIndex} className={headingClasses[level]}>
                                {renderInlineFormatting(headingText)}
                            </p>
                        );
                    }
                    
                    // Regular paragraph
                    return (
                        <p key={blockIndex} className="text-sm leading-relaxed text-text-primary">
                            {renderInlineFormatting(block)}
                        </p>
                    );
                })}
                {/* Streaming cursor at end */}
                {isStreaming && (
                    <span className="streaming-cursor inline-block w-0.5 h-4 bg-accent-primary ml-0.5 align-middle" />
                )}
            </div>
        );
    };

    return (
        <div className={`flex h-screen bg-bg-primary transition-colors duration-300 ${isPremium ? 'premium-glow' : ''}`}>
            {/* Left Sidebar */}
            <Sidebar 
                onNewChat={handleNewChat}
                onOpenHistory={() => setIsHistoryOpen(true)}
                onSaveChat={handleSaveChat}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden md:ml-0">
                {/* Header */}
                <div className={`bg-bg-secondary/80 backdrop-blur-md shadow-sm border-b border-border-primary p-4 z-10 flex-shrink-0`}>
                    <div className="flex items-center gap-3 md:ml-0 ml-12">
                        <img src={kcaLogo} alt="KCA University Logo" className="w-10 h-10 object-contain rounded-full border-2 border-border-primary" />
                        <div>
                            <h1 className={`text-xl font-bold ${isPremium ? 'premium-gradient-text' : 'bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent'}`}>
                                KCA Connect AI
                            </h1>
                            <p className={`text-sm text-text-secondary`}>Your intelligent university assistant</p>
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
                                    className={`group max-w-[85%] ${msg.role === "user"
                                        ? (isPremium ? 'premium-gradient-bg text-white' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white') + " rounded-2xl rounded-br-md"
                                        : msg.isSystem
                                            ? "bg-bg-secondary/80 border border-accent-primary/30 text-text-primary rounded-2xl rounded-bl-md"
                                            : "bg-bg-secondary/60 backdrop-blur-sm text-text-primary rounded-2xl rounded-bl-md"
                                        } p-4 transition-all duration-200 ${msg.isSystem ? 'shadow-md' : ''}`}
                                >
                                    {/* System message indicator */}
                                    {msg.isSystem && (
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border-primary/30">
                                            <span className="text-accent-primary">
                                                {msg.content.startsWith('🔍') ? '🔍' : '📄'}
                                            </span>
                                            <span className="text-xs font-semibold text-accent-primary uppercase tracking-wide">
                                                {msg.content.startsWith('🔍') ? 'Web Search' : 'Fetched Content'}
                                            </span>
                                        </div>
                                    )}
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
                                onClick={() => setError(null)}
                                className="text-sm text-red-500 font-semibold hover:underline"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}

                {/* Success Message */}
                {saveSuccess && (
                    <div className="max-w-4xl w-full mx-auto px-4 pb-2">
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center justify-between">
                            <span className="text-sm text-green-500">Chat saved successfully!</span>
                            <button
                                onClick={() => setSaveSuccess(false)}
                                className="text-sm text-green-500 font-semibold hover:underline"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}

                {/* Input Form */}
                <div className={`bg-bg-secondary/80 backdrop-blur-md shadow-lg border-t border-border-primary p-4`}>
                    <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about timetables, fees, exams..."
                            className={`flex-1 p-3 rounded-xl border border-border-primary/50 focus:border-accent-primary bg-bg-primary/50 text-text-primary transition-all duration-200 outline-none`}
                            disabled={isLoading}
                        />
                        {isLoading ? (
                            <button
                                type="button"
                                onClick={handleStop}
                                className="w-12 h-12 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                                title="Stop"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                                </svg>
                            </button>
                        ) : (
                            <button
                                type="submit"
                                className={`w-12 h-12 flex items-center justify-center rounded-full ${isPremium ? 'premium-gradient-bg' : 'bg-gradient-to-r from-indigo-600 to-purple-600'} text-white hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105`}
                                disabled={!input.trim()}
                            >
                                <svg className="w-5 h-5 transform rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        )}
                    </form>
                </div>
            </div>

            {/* Chat History Modal - Shows ALL chats */}
            <ChatHistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                onLoadChat={handleLoadChat}
            />
        </div>
    );
};

export default ChatInterface;

