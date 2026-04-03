import React, { useState, useRef, useEffect, useCallback } from "react";
import { chatWithAgentStream, autoSaveChat as autoSaveChatApi, extractFileText } from "../services/api";
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

    // Get user metadata for AI context
    const userMetadata = user?.user_metadata || null;

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

    // Attachment state
    const [attachment, setAttachment] = useState(null); // { name, content, isLoading }
    const fileInputRef = useRef(null);

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // check file size (e.g. 10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            setError("File size exceeds 10MB limit.");
            return;
        }

        setAttachment({ name: file.name, content: null, isLoading: true });
        setError(null);

        try {
            const result = await extractFileText(session.access_token, file);
            setAttachment({
                name: file.name,
                content: result.content,
                isLoading: false
            });
        } catch (err) {
            console.error("File extraction failed:", err);
            setError("Failed to process file. Please try again.");
            setAttachment(null);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const removeAttachment = () => {
        setAttachment(null);
    };


    // Modal states
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Auto-close sidebar on navigation
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [user]);

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

        let messageContent = input;

        // Append attachment content if present
        if (attachment && attachment.content) {
            messageContent = `${input}\n\n---\n**Context from attached file (${attachment.name}):**\n${attachment.content}`;
        }

        const userMessage = {
            role: "user",
            content: messageContent,
            displayContent: input, // Optional: for displaying only the query in UI if we wanted
            timestamp: new Date().toISOString(),
            attachment: attachment ? { name: attachment.name } : null
        };

        const conversationHistory = getConversationHistory();

        streamingContentRef.current = "";
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setAttachment(null); // Clear attachment after sending
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
                },
                userMetadata // Pass user metadata to the AI
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

        // Normalize content: Ensure markdown elements (headers, lists) start on new lines
        // only if preceded by sentence-ending punctuation or blank lines.
        let normalizedContent = content
            // Ensure space after hash symbols
            .replace(/^(#+)([A-Za-z0-9])/gm, '$1 $2')

            // Ensure double newline before headers
            .replace(/([^\n])\n*(#{1,6}\s+)/g, '$1\n\n$2')

            // Fix missing spaces after sentence boundaries (sentence-ending punctuation followed by Capital)
            .replace(/([.!?])([A-Z])/g, '$1 $2')

            // Fix word joining in sentences (e.g. "ExamsSpecial")
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')

            // AGGRESSIVE LIST SPLITTING:
            // Fix words/parentheses joined to numbered items (e.g. "family2.", ")3.", "Item1.")
            .replace(/([a-zA-Z\)])(\d+\.\s?)/g, '$1\n$2')

            // Fix word joined to uppercase after list item (e.g. "defaultersO")
            .replace(/([a-z])([A-Z])/g, '$1 $2')

            // Force newline after headers if body text is glued
            .replace(/^(#{1,6}\s+.+?)(?=\s+(?:To|According|If|The|Please|You|Note|A|An|In|On|For))/gm, '$1\n\n')

            // Strip isolated trailing hashes
            .replace(/^\s*#{1,6}\s*$/gm, '')

            // Force newline before bullet points
            .replace(/([.:!?])\s*([-*•]\s)/g, '$1\n$2')

            // Force newline before numbered lists (secondary check)
            .replace(/([.:!?])\s*(\d+\.\s)/g, '$1\n$2');

        // Split by lines to handle single newline formatting
        const lines = normalizedContent.split('\n');
        const elements = [];

        let currentListType = null; // 'ol' or 'ul'
        let currentListItems = [];
        let currentCodeBlock = null; // { language: '', content: '' }
        let currentParagraph = [];

        // Helper to flush current paragraph
        const flushParagraph = () => {
            if (currentParagraph.length > 0) {
                elements.push(
                    <p key={`p-${elements.length}`} className="text-sm leading-relaxed text-text-primary mb-3 last:mb-0">
                        {currentParagraph.map((line, i) => (
                            <React.Fragment key={i}>
                                {renderInlineFormatting(line)}
                                {i < currentParagraph.length - 1 && <br />}
                            </React.Fragment>
                        ))}
                    </p>
                );
                currentParagraph = [];
            }
        };

        // Helper to flush current list
        const flushList = () => {
            if (currentListType && currentListItems.length > 0) {
                const ListTag = currentListType === 'ol' ? 'ol' : 'ul';
                const listClass = currentListType === 'ol' ? "list-decimal list-inside space-y-1 ml-2 mb-3" : "list-disc list-inside space-y-1 ml-2 mb-3";

                elements.push(
                    <ListTag key={`list-${elements.length}`} className={listClass}>
                        {currentListItems.map((item, i) => (
                            <li key={i} className="text-sm leading-relaxed text-text-primary">
                                {renderInlineFormatting(item)}
                            </li>
                        ))}
                    </ListTag>
                );
                currentListType = null;
                currentListItems = [];
            }
        };

        // Helper to flush current code block
        const flushCodeBlock = () => {
            if (currentCodeBlock) {
                elements.push(
                    <div key={`code-${elements.length}`} className="relative group mb-3">
                        <pre className={`${isPremium ? 'bg-gray-900' : 'bg-slate-800'} text-gray-100 p-3 rounded-lg overflow-x-auto text-xs sm:text-sm font-mono border ${isPremium ? 'border-gray-700' : 'border-slate-600'}`}>
                            <code>{currentCodeBlock.content.trim()}</code>
                        </pre>
                        <button
                            onClick={() => copyToClipboard(currentCodeBlock.content.trim())}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-gray-600 rounded hover:bg-gray-500"
                            title="Copy code"
                        >
                            <svg className="w-4 h-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </div>
                );
                currentCodeBlock = null;
            }
        };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // CODE BLOCKS
            if (currentCodeBlock) {
                if (line.trim().startsWith('```')) {
                    flushCodeBlock();
                } else {
                    currentCodeBlock.content += line + '\n';
                }
                continue;
            }
            if (line.trim().startsWith('```')) {
                flushParagraph();
                flushList();
                const language = line.trim().replace(/^```/, '');
                currentCodeBlock = { language, content: '' };
                continue;
            }

            // HEADINGS - highly resilient match (optional space to catch artifacts)
            const headingMatch = line.trim().match(/^(#{1,6})\s*(.*)$/);
            if (headingMatch && headingMatch[2]) {
                flushParagraph();
                flushList();
                const level = headingMatch[1].length;
                const text = headingMatch[2];
                const headingClasses = {
                    1: 'text-lg font-bold text-text-primary mt-4 mb-2',
                    2: 'text-base font-bold text-text-primary mt-3 mb-2',
                    3: 'text-sm font-bold text-text-primary mt-3 mb-1',
                    4: 'text-sm font-semibold text-text-primary mt-2 mb-1',
                    5: 'text-sm font-medium text-text-primary mt-2 mb-1',
                    6: 'text-xs font-bold text-text-primary mt-2 mb-1'
                };
                elements.push(
                    <div key={`idx-${i}`} className={headingClasses[level] || headingClasses[1]}>
                        {renderInlineFormatting(text)}
                    </div>
                );
                continue;
            }

            // LISTS
            const olMatch = line.match(/^\d+\.\s+(.+)/);
            const ulMatch = line.match(/^[-*•]\s+(.+)/);

            if (olMatch) {
                flushParagraph();
                if (currentListType !== 'ol') flushList();
                currentListType = 'ol';
                currentListItems.push(olMatch[1]);
                continue;
            }

            if (ulMatch) {
                flushParagraph();
                if (currentListType !== 'ul') flushList();
                currentListType = 'ul';
                currentListItems.push(ulMatch[1]);
                continue;
            }

            // If we are here, it's a regular line.
            // Extra safety: strip hashes from start of paragraph lines if they survived normalization
            const sanitizedLine = line.replace(/^\s*#{1,6}\s*/, '');
            if (!sanitizedLine.trim()) {
                flushParagraph();
                flushList();
                continue;
            }

            // Otherwise, add to current paragraph
            flushList(); // Lists break paragraphs
            currentParagraph.push(sanitizedLine);
        }

        // Flush remaining buffers at end
        flushParagraph();
        flushList();
        flushCodeBlock();

        return (
            <div className="space-y-1">
                {elements}
                {/* Streaming cursor at end */}
                {isStreaming && (
                    <span className="streaming-cursor inline-block w-0.5 h-4 bg-accent-primary ml-0.5 align-middle" />
                )}
            </div>
        );
    };


    return (
        <div className="flex h-[100dvh] bg-bg-primary overflow-hidden relative">
            <Sidebar
                onNewChat={() => {
                    handleNewChat();
                    setIsSidebarOpen(false);
                }}
                onOpenHistory={() => {
                    setIsHistoryOpen(true);
                    setIsSidebarOpen(false);
                }}
                onSaveChat={() => {
                    handleSaveChat();
                    setIsSidebarOpen(false);
                }}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />
            <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-bg-primary/80 backdrop-blur-md p-3 md:p-4 flex items-center justify-between border-b border-border-primary/50">
                    <div className="flex items-center gap-2 md:gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden p-2 rounded-lg hover:bg-bg-secondary text-text-primary transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <img src={kcaLogo} alt="KCA Logo" className="w-6 h-6 md:w-8 md:h-8 object-contain" />
                        <span className={`font-bold text-sm md:text-base ${isPremium ? 'premium-gradient-text' : 'text-text-primary'}`}>KCA Connect AI</span>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-8 w-full scrollbar-thin">
                    <div className="max-w-3xl mx-auto space-y-8">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} animate-fadeIn group`}
                            >
                                <div className={`flex items-start gap-4 max-w-full ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                    {/* Avatar/Icon */}
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${msg.role === "user"
                                        ? (isPremium ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-indigo-100 text-indigo-900 border-indigo-200')
                                        : (isPremium ? 'bg-blue-600 text-white border-blue-500' : 'bg-accent-primary text-white border-accent-primary')
                                        }`}>
                                        {msg.role === "user" ? (userName ? userName[0].toUpperCase() : 'U') : 'AI'}
                                    </div>

                                    {/* Content Area */}
                                    <div className={`flex-1 min-w-0 ${msg.role === "user" ? "text-right" : "text-left"}`}>
                                        <div
                                            className={`${msg.role === "user"
                                                ? `user-bubble inline-block p-3 px-4 shadow-sm ${isPremium ? 'bg-amber-500 text-white' : 'bg-accent-primary text-white'}`
                                                : "ai-message-container py-1 text-text-primary"
                                                }`}
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

                                            {msg.role === "user" ? (
                                                <div className="space-y-1">
                                                    {msg.attachment && (
                                                        <div className="flex items-center gap-2 text-xs bg-black/5 dark:bg-white/5 p-1.5 rounded-md w-fit mb-2 border border-border-primary flex-row-reverse">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            <span>{msg.attachment.name}</span>
                                                        </div>
                                                    )}
                                                    {(msg.displayContent || msg.content).split("\n").map((line, i) => (
                                                        (!msg.displayContent && line.startsWith("---") && msg.content.includes("Context from attached")) ? null :
                                                            (!msg.displayContent && line.startsWith("Context from attached")) ? null :
                                                                (!msg.displayContent && line.startsWith("**Context from attached")) ? null :
                                                                    <p key={i} className="mb-1 last:mb-0 text-sm leading-relaxed">
                                                                        {line}
                                                                    </p>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    {renderMessageContent(msg.content, msg.isStreaming)}

                                                    {/* Message Actions */}
                                                    {!msg.isStreaming && !msg.isSystem && (
                                                        <div className="message-actions flex items-center gap-2 mt-2">
                                                            <button
                                                                onClick={() => copyToClipboard(msg.content)}
                                                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-text-secondary transition-colors"
                                                                title="Copy to clipboard"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={handleSend} // Placeholder for regenerate
                                                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-text-secondary transition-colors"
                                                                title="Regenerate"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className={`text-[10px] mt-1 ${msg.role === "user" ? "mr-1 text-text-secondary" : "ml-1 text-text-secondary"}`}>
                                            {formatTime(msg.timestamp)}
                                        </div>
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
                <div className="p-4 bg-gradient-to-t from-bg-primary via-bg-primary to-transparent">
                    <div className="max-w-3xl mx-auto relative">
                        {/* Attachment Preview (Floating above input) */}
                        {attachment && (
                            <div className="absolute bottom-full mb-3 left-0 flex items-center gap-2 bg-bg-secondary p-2 px-3 rounded-lg border border-border-primary shadow-sm animate-fadeIn">
                                <div className="p-1.5 bg-accent-primary/10 rounded-md">
                                    <svg className="w-4 h-4 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <span className="text-sm text-text-primary max-w-xs truncate font-medium">
                                    {attachment.isLoading ? "Processing..." : attachment.name}
                                </span>
                                {attachment.isLoading ? (
                                    <svg className="animate-spin h-3 w-3 text-accent-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <button
                                        onClick={removeAttachment}
                                        className="ml-2 text-text-secondary hover:text-red-500 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        )}

                        <form onSubmit={handleSend} className="floating-input-container bg-bg-secondary border border-border-primary rounded-3xl p-2 px-4 flex items-center gap-2 group input-glow">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept=".pdf,.docx,.txt"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors duration-200"
                                title="Attach file"
                                disabled={isLoading || attachment !== null}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                            </button>

                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Message KCA Connect..."
                                className="flex-1 bg-transparent py-3 text-text-primary placeholder:text-text-secondary outline-none text-sm"
                                disabled={isLoading}
                            />

                            {isLoading ? (
                                <button
                                    type="button"
                                    onClick={handleStop}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 text-white transition-all duration-200"
                                    title="Stop"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <rect width="10" height="10" x="7" y="7" rx="1" />
                                    </svg>
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 ${input.trim()
                                        ? (isPremium ? 'premium-gradient-bg' : 'bg-black dark:bg-white text-white dark:text-black')
                                        : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                        }`}
                                    disabled={!input.trim()}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                    </svg>
                                </button>
                            )}
                        </form>
                        <p className="text-[10px] text-center text-text-secondary mt-2 px-4 opacity-60">
                            KCA Connect AI can make mistakes. Check important info.
                        </p>
                    </div>
                </div>
            </div>

            <ChatHistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                onLoadChat={handleLoadChat}
            />
        </div >
    );
};

export default ChatInterface;

