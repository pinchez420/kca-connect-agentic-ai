import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ProfileModal from './ProfileModal';

const Sidebar = ({ onNewChat, onOpenHistory, onSaveChat }) => {
    const { user, signOut } = useAuth();
    const { theme, setTheme } = useTheme();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const handleSignOut = async () => {
        await signOut();
    };

    const userEmail = user?.email || 'student@kca.ac.ke';
    const userName = user?.user_metadata?.full_name || 'KCA Student';
    const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

    const themes = [
        { id: 'light', name: 'Light', icon: '☀️' },
        { id: 'dark', name: 'Dark', icon: '🌙' },
        { id: 'premium', name: 'Premium AI', icon: '✨' },
    ];

    return (
        <>
            <div className={`${isCollapsed ? 'w-20' : 'w-72'} bg-bg-secondary border-r border-border-primary flex flex-col transition-all duration-300 h-full`}>
                {/* Collapse/Expand Button */}
                <div className="p-3 border-b border-border-primary">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-bg-primary transition-colors text-text-primary"
                        title={isCollapsed ? 'Expand' : 'Collapse'}
                    >
                        <svg className="w-5 h-5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCollapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
                        </svg>
                    </button>
                </div>

                {/* User Profile Section */}
                <div className="p-4 border-b border-border-primary">
                    <div 
                        className={`flex ${isCollapsed ? 'justify-center' : 'items-center gap-3'} ${!isCollapsed ? 'cursor-pointer' : ''}`}
                        onClick={() => !isCollapsed && setIsProfileOpen(true)}
                    >
                        {user?.user_metadata?.avatar_url ? (
                            <img 
                                src={user.user_metadata.avatar_url} 
                                alt={userName}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow-sm"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full premium-gradient-bg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                                {initials}
                            </div>
                        )}
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-text-primary truncate">{userName}</p>
                                <p className="text-xs text-text-secondary truncate">{userEmail}</p>
                            </div>
                        )}
                    </div>
                    {!isCollapsed && (
                        <button
                            onClick={() => setIsProfileOpen(true)}
                            className="w-full mt-3 py-2 px-3 rounded-lg bg-bg-primary hover:bg-accent-primary/10 text-sm text-text-primary hover:text-accent-primary transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            View Profile
                        </button>
                    )}
                </div>

                {/* Settings Section */}
                <div className="p-4 flex-1 overflow-y-auto">
                    {!isCollapsed ? (
                        <>
                            <div className="mb-4">
                                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Theme</h3>
                                <div className="space-y-2">
                                    {themes.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setTheme(t.id)}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 ${theme === t.id
                                                ? 'bg-accent-primary/10 text-accent-primary font-medium'
                                                : 'text-text-primary hover:bg-bg-primary'
                                            }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <span>{t.icon}</span>
                                                {t.name}
                                            </span>
                                            {theme === t.id && (
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div>
                                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Quick Actions</h3>
                            <button
                                onClick={onNewChat}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-bg-primary transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                New Chat
                            </button>
                            <button
                                onClick={onOpenHistory}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-bg-primary transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Chat History
                            </button>
                            <button
                                onClick={onSaveChat}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-bg-primary transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                Save Chat
                            </button>
                            </div>
                        </>
                    ) : (
                        // Collapsed mode - show icons only
                        <div className="flex flex-col items-center gap-3">
                            {themes.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setTheme(t.id)}
                                    className={`p-2 rounded-lg transition-all duration-200 ${theme === t.id
                                        ? 'bg-accent-primary/10 text-accent-primary'
                                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary'
                                    }`}
                                    title={t.name}
                                >
                                    <span className="text-lg">{t.icon}</span>
                                </button>
                            ))}
                            <div className="h-px w-8 bg-border-primary my-1"></div>
                            <button
                                onClick={onNewChat}
                                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors"
                                title="New Chat"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                            <button
                                onClick={onOpenHistory}
                                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors"
                                title="Chat History"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                            <button
                                onClick={onSaveChat}
                                className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors"
                                title="Save Chat"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>

                {/* Sign Out Section */}
                <div className="p-4 border-t border-border-primary">
                    <button
                        onClick={handleSignOut}
                        className={`w-full flex ${isCollapsed ? 'justify-center' : 'items-center gap-3'} px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors`}
                        title="Sign Out"
                    >
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {!isCollapsed && <span>Sign Out</span>}
                    </button>
                </div>
            </div>

            {/* Profile Modal */}
            {isProfileOpen && (
                <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} />
            )}
        </>
    );
};

export default Sidebar;
