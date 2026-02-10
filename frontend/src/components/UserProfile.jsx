import React, { useState } from 'react';

const UserProfile = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1 pl-3 rounded-full border border-border-primary hover:bg-bg-secondary transition-colors"
            >
                <span className="text-sm font-medium text-text-primary hidden sm:block">KCA Student</span>
                <div className="w-8 h-8 rounded-full premium-gradient-bg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    KS
                </div>
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    ></div>
                    <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-xl bg-bg-secondary border border-border-primary z-20 overflow-hidden animate-fadeIn">
                        <div className="p-4 text-center border-b border-border-primary">
                            <div className="w-16 h-16 rounded-full premium-gradient-bg mx-auto flex items-center justify-center text-white font-bold text-2xl shadow-md mb-2">
                                KS
                            </div>
                            <h3 className="font-bold text-text-primary text-lg">KCA Student</h3>
                            <p className="text-sm text-text-secondary">student@kca.ac.ke</p>
                        </div>
                        <div className="p-2">
                            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-bg-primary transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                My Profile
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-bg-primary transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.232.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.232.477-4.5 1.253" />
                                </svg>
                                Academic Records
                            </button>
                            <div className="h-px bg-border-primary my-1"></div>
                            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Sign Out
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default UserProfile;
