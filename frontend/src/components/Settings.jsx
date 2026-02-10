import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const Settings = () => {
    const { theme, setTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    const themes = [
        { id: 'light', name: 'Light', icon: '☀️' },
        { id: 'dark', name: 'Dark', icon: '🌙' },
        { id: 'premium', name: 'Premium AI', icon: '✨' },
    ];

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-full hover:bg-bg-secondary transition-colors"
                title="Settings"
            >
                <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl bg-bg-secondary border border-border-primary z-20 overflow-hidden animate-fadeIn">
                        <div className="p-4 border-b border-border-primary">
                            <h3 className="font-semibold text-text-primary">Settings</h3>
                        </div>
                        <div className="p-2">
                            <p className="px-3 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">Theme</p>
                            {themes.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setTheme(t.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${theme === t.id
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
                </>
            )}
        </div>
    );
};

export default Settings;
