import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ProfileModal from './ProfileModal';

const UserProfile = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const { user, signOut } = useAuth();

    const handleSignOut = async () => {
        await signOut();
    };

    const userEmail = user?.email || 'student@kca.ac.ke';
    const userName = user?.user_metadata?.full_name || 'KCA Student';
    const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1 pl-3 rounded-full border border-border-primary hover:bg-bg-secondary transition-colors"
            >
                <span className="text-sm font-medium text-text-primary hidden sm:block">{userName}</span>
                <div className="w-8 h-8 rounded-full premium-gradient-bg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {initials}
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
                                {initials}
                            </div>
                            <h3 className="font-bold text-text-primary text-lg">{userName}</h3>
                            <p className="text-sm text-text-secondary">{userEmail}</p>
                        </div>
                        <div className="p-2">
                            <button
                                onClick={() => { setIsOpen(false); setIsProfileOpen(true); }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-primary hover:bg-bg-primary transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                My Profile
                            </button>
                            <div className="h-px bg-border-primary my-1"></div>
                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Sign Out
                            </button>
                        </div>
                    </div>
                </>
            )}
        {isProfileOpen && (
                <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} />
            )}
        </div>
    );
};

export default UserProfile;
