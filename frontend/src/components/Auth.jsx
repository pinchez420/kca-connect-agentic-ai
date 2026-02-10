import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import Settings from './Settings';

const Auth = ({ onLogin }) => {
    const [activeTab, setActiveTab] = useState('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { theme } = useTheme();
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        // Mock authentication
        if (email && password) {
            onLogin();
            navigate('/chat');
        }
    };

    const isPremium = theme === 'premium';

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-bg-primary relative overflow-hidden">
            {/* Background Radial Glow */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none -z-0 opacity-20 bg-radial-glow`} />

            {/* Logo link back to landing */}
            <div
                className="absolute top-8 left-8 flex items-center gap-2 cursor-pointer z-20"
                onClick={() => navigate('/')}
            >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold shadow-lg ${isPremium ? 'premium-gradient-bg' : 'bg-blue-600'}`}>
                    K
                </div>
                <span className={`font-bold tracking-tight ${isPremium ? 'premium-gradient-text' : ''}`}>
                    KCA Connect AI
                </span>
            </div>

            <div className={`max-w-md w-full bg-bg-secondary/40 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-border-primary z-10 relative animate-fadeIn ${isPremium ? 'premium-glow' : ''}`}>
                {/* Tabs */}
                <div className="flex p-1 bg-bg-primary/50 rounded-2xl mb-8 border border-border-primary">
                    <button
                        onClick={() => setActiveTab('signin')}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'signin'
                                ? (isPremium ? 'premium-gradient-bg text-white' : 'bg-blue-600 text-white') + ' shadow-lg'
                                : 'text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => setActiveTab('signup')}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'signup'
                                ? (isPremium ? 'premium-gradient-bg text-white' : 'bg-blue-600 text-white') + ' shadow-lg'
                                : 'text-text-secondary hover:text-text-primary'
                            }`}
                    >
                        Sign Up
                    </button>
                </div>

                <div className="text-center mb-8">
                    <h2 className={`text-4xl font-extrabold mb-2 ${isPremium ? 'premium-gradient-text' : ''}`}>
                        {activeTab === 'signin' ? 'Welcome Back' : 'Join the Future'}
                    </h2>
                    <p className="text-text-secondary text-sm">
                        {activeTab === 'signin'
                            ? 'Sign in to access your digital student companion'
                            : 'Start your journey with KCA\'s smartest assistant'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {activeTab === 'signup' && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2 ml-1">Full Name</label>
                            <input
                                type="text"
                                required
                                className="w-full p-4 rounded-2xl border border-border-primary bg-bg-primary/50 text-text-primary focus:outline-none focus:border-accent-primary transition-all backdrop-blur-sm"
                                placeholder="E.g. John Doe"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2 ml-1">Student Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-4 rounded-2xl border border-border-primary bg-bg-primary/50 text-text-primary focus:outline-none focus:border-accent-primary transition-all backdrop-blur-sm"
                            placeholder="22-00000@students.kcau.ac.ke"
                        />
                    </div>

                    {activeTab === 'signup' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2 ml-1">Role</label>
                                <select className="w-full p-4 rounded-2xl border border-border-primary bg-bg-primary/50 text-text-primary focus:outline-none focus:border-accent-primary transition-all backdrop-blur-sm appearance-none">
                                    <option>Student</option>
                                    <option>Faculty</option>
                                    <option>Staff</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2 ml-1">Campus</label>
                                <select className="w-full p-4 rounded-2xl border border-border-primary bg-bg-primary/50 text-text-primary focus:outline-none focus:border-accent-primary transition-all backdrop-blur-sm appearance-none">
                                    <option>Main</option>
                                    <option>Town</option>
                                    <option>Kitengela</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="flex justify-between mb-2 ml-1">
                            <label className="text-xs font-bold uppercase tracking-widest text-text-secondary">Password</label>
                            {activeTab === 'signin' && (
                                <button type="button" className="text-[10px] font-bold text-accent-primary hover:underline uppercase tracking-tighter">Forgot Password?</button>
                            )}
                        </div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-4 rounded-2xl border border-border-primary bg-bg-primary/50 text-text-primary focus:outline-none focus:border-accent-primary transition-all backdrop-blur-sm"
                            placeholder="••••••••"
                        />
                    </div>

                    {activeTab === 'signup' && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2 ml-1">Confirm Password</label>
                            <input
                                type="password"
                                required
                                className="w-full p-4 rounded-2xl border border-border-primary bg-bg-primary/50 text-text-primary focus:outline-none focus:border-accent-primary transition-all backdrop-blur-sm"
                                placeholder="••••••••"
                            />
                        </div>
                    )}

                    {activeTab === 'signin' && (
                        <div className="flex items-center gap-2 mb-4 ml-1">
                            <input type="checkbox" id="remember" className="rounded border-border-primary bg-bg-primary/50 text-blue-600 focus:ring-0" />
                            <label htmlFor="remember" className="text-xs font-medium text-text-secondary">Remember me for 30 days</label>
                        </div>
                    )}

                    <button
                        type="submit"
                        className={`w-full py-4 rounded-2xl text-white font-black text-lg shadow-xl hover:shadow-2xl transform transition-all active:scale-[0.98] mt-6 ${isPremium ? 'premium-gradient-bg' : 'bg-blue-600'
                            }`}
                    >
                        {activeTab === 'signin' ? 'Sign Into Account' : 'Create Student Account'}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-border-primary text-center">
                    <div className="flex items-center justify-center gap-4">
                        <Settings />
                        <span className="text-xs text-text-secondary opacity-50">Theme Settings</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;
