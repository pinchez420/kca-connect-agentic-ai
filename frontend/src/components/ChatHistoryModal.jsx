import React, { useState, useEffect } from "react";
import { getChats, deleteChat, toggleSaveChat } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const ChatHistoryModal = ({ isOpen, onClose, onLoadChat }) => {
    const { session } = useAuth();
    const { theme } = useTheme();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    const isPremium = theme === 'premium';

    // Filter chats based on search query
    const filteredChats = chats.filter(chat => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        const titleMatch = chat.title?.toLowerCase().includes(query);
        const messageMatch = chat.messages?.some(msg => 
            msg.content?.toLowerCase().includes(query)
        );
        return titleMatch || messageMatch;
    });

    useEffect(() => {
        if (isOpen && session?.access_token) {
            console.log("ChatHistoryModal: Fetching chats...");
            fetchChats();
        }
    }, [isOpen, session]);
    
    // Focus search input when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                document.getElementById('chat-search-input')?.focus();
            }, 100);
        } else {
            setSearchQuery(""); // Clear search when modal closes
        }
    }, [isOpen]);

    const fetchChats = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log("Calling getChats API...");
            const data = await getChats(session.access_token, 50, 0, false);
            console.log("getChats response:", data);
            setChats(data.chats || []);
            if (data.chats && data.chats.length === 0) {
                console.log("No chats found - array is empty");
            }
        } catch (err) {
            console.error("Error fetching chats:", err);
            setError("Failed to load chat history");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteChat = async (chatId, e) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this chat?")) return;
        
        setDeletingId(chatId);
        try {
            const success = await deleteChat(session.access_token, chatId);
            if (success) {
                setChats(prev => prev.filter(chat => chat.id !== chatId));
            }
        } catch (err) {
            console.error("Error deleting chat:", err);
        } finally {
            setDeletingId(null);
        }
    };

    const handleToggleSave = async (chatId, e) => {
        e.stopPropagation();
        try {
            const result = await toggleSaveChat(session.access_token, chatId);
            if (result) {
                setChats(prev => prev.map(chat => 
                    chat.id === chatId ? { ...chat, is_saved: result.is_saved } : chat
                ));
            }
        } catch (err) {
            console.error("Error toggling save:", err);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const formatTitle = (title, firstMessage) => {
        if (title && title !== "New Chat") return title;
        if (firstMessage) {
            return firstMessage.length > 40 ? firstMessage.substring(0, 40) + "..." : firstMessage;
        }
        return "New Chat";
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`relative w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden ${isPremium ? 'bg-[#171717]' : 'bg-bg-secondary'}`}>
                {/* Header */}
                <div className={`flex flex-col gap-3 p-4 border-b border-border-primary ${isPremium ? 'bg-black/20' : 'bg-bg-primary/50'}`}>
                    <div className="flex items-center justify-between">
                        <h2 className={`text-xl font-bold ${isPremium ? 'text-white' : 'text-text-primary'}`}>
                            Chat History
                        </h2>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-lg hover:bg-bg-primary/50 transition-colors ${isPremium ? 'text-white' : 'text-text-secondary'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    
                    {/* Search Input */}
                    <div className="relative">
                        <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isPremium ? 'text-white/50' : 'text-text-secondary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            id="chat-search-input"
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search chats..."
                            className={`w-full pl-10 pr-4 py-2 rounded-lg border border-border-primary/50 focus:border-accent-primary bg-bg-primary/50 ${isPremium ? 'text-white placeholder-white/50' : 'text-text-primary'} outline-none transition-colors`}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 ${isPremium ? 'text-white/50 hover:text-white' : 'text-text-secondary hover:text-text-primary'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className={`p-4 overflow-y-auto max-h-[60vh] scrollbar-thin ${isPremium ? 'scrollbar-premium' : 'scrollbar-default'}`}>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="flex gap-2">
                                <div className={`w-3 h-3 ${isPremium ? 'bg-amber-500' : 'bg-accent-primary'} rounded-full animate-bounce`}></div>
                                <div className={`w-3 h-3 ${isPremium ? 'bg-amber-500' : 'bg-accent-primary'} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
                                <div className={`w-3 h-3 ${isPremium ? 'bg-amber-500' : 'bg-accent-primary'} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-500">
                            {error}
                        </div>
                    ) : filteredChats.length === 0 && searchQuery ? (
                        <div className="text-center py-12 text-text-secondary">
                            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <p className="text-lg font-medium">No chats found</p>
                            <p className="text-sm mt-1">Try a different search term</p>
                        </div>
                    ) : filteredChats.length === 0 ? (
                        <div className="text-center py-12 text-text-secondary">
                            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p className="text-lg font-medium">No chat history yet</p>
                            <p className="text-sm mt-1">Start a new conversation to see it here</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredChats.map((chat) => (
                                <div
                                    key={chat.id}
                                    onClick={() => {
                                        onLoadChat(chat);
                                        onClose();
                                    }}
                                    className={`group p-4 rounded-xl cursor-pointer transition-all duration-200 border border-transparent hover:border-border-primary ${isPremium ? 'hover:bg-white/5 bg-black/20' : 'hover:bg-bg-primary/50'}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className={`font-medium truncate ${isPremium ? 'text-white' : 'text-text-primary'}`}>
                                                    {formatTitle(chat.title, chat.messages?.[0]?.content)}
                                                </h3>
                                                {chat.is_saved && (
                                                    <span className={`flex-shrink-0 px-2 py-0.5 text-xs rounded-full ${isPremium ? 'bg-amber-500/20 text-amber-300' : 'bg-accent-primary/10 text-accent-primary'}`}>
                                                        Saved
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-text-secondary">
                                                {chat.messages?.length || 0} messages • {formatDate(chat.updated_at)}
                                            </p>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleToggleSave(chat.id, e)}
                                                className={`p-2 rounded-lg hover:bg-bg-primary/50 transition-colors ${chat.is_saved ? (isPremium ? 'text-amber-400' : 'text-accent-primary') : 'text-text-secondary'}`}
                                                title={chat.is_saved ? "Unsave" : "Save"}
                                            >
                                                <svg className="w-4 h-4" fill={chat.is_saved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteChat(chat.id, e)}
                                                disabled={deletingId === chat.id}
                                                className="p-2 rounded-lg hover:bg-red-500/10 text-text-secondary hover:text-red-500 transition-colors"
                                                title="Delete"
                                            >
                                                {deletingId === chat.id ? (
                                                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatHistoryModal;

