import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import Settings from './Settings';

const LandingPage = () => {
    const { theme } = useTheme();
    const isPremium = theme === 'premium';

    const features = [
        {
            title: "Smart Timetable Access",
            description: "Personalized class schedules and automatic reminders for your upcoming lectures.",
            icon: "📅"
        },
        {
            title: "Fee Inquiries",
            description: "Balance checks, payment deadlines, and detailed fee structures at your fingertips.",
            icon: "💰"
        },
        {
            title: "Exam Schedules",
            description: "Instant access to exam timetables, venues, and necessary preparation resources.",
            icon: "📝"
        },
        {
            title: "Smart Notifications",
            description: "Targeted announcements filtered by your campus, faculty, and specific program.",
            icon: "🔔"
        },
        {
            title: "Natural Conversations",
            description: "Ask questions in plain English or Swahili and get accurate, human-like AI responses.",
            icon: "💬"
        },
        {
            title: "Multi-Campus Support",
            description: "Comprehensive information for Main Campus, Town Campus, and Kitengela Campus.",
            icon: "📍"
        }
    ];

    const steps = [
        {
            number: "1",
            title: "Create Account",
            description: "Sign up with your 6-digit student email and select your campus.",
            color: "bg-blue-600"
        },
        {
            number: "2",
            title: "Ask Anything",
            description: "Type your questions in natural language in the chat interface.",
            color: "bg-amber-600"
        },
        {
            number: "3",
            title: "Get Instant Answers",
            description: "Receive accurate, AI-powered responses based on official KCA documents.",
            color: "bg-blue-600"
        }
    ];

    return (
        <div className="min-h-screen bg-bg-primary text-text-primary transition-colors duration-300">
            {/* Header / Nav */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/80 backdrop-blur-md border-b border-border-primary px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg ${isPremium ? 'premium-gradient-bg' : 'bg-blue-600'}`}>
                            K
                        </div>
                        <span className={`text-xl font-bold tracking-tight ${isPremium ? 'premium-gradient-text' : ''}`}>
                            KCA Connect AI
                        </span>
                    </div>
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium hover:text-accent-primary transition-colors">Features</a>
                        <a href="#how-it-works" className="text-sm font-medium hover:text-accent-primary transition-colors">How it Works</a>
                        <Link to="/auth" className="text-sm font-semibold hover:text-accent-primary transition-colors">Sign In</Link>
                        <Link
                            to="/auth"
                            className={`px-6 py-2 rounded-full text-white text-sm font-bold shadow-md hover:shadow-xl transform hover:scale-105 transition-all ${isPremium ? 'premium-gradient-bg' : 'bg-blue-600'}`}
                        >
                            Get Started
                        </Link>
                        <Settings />
                    </div>
                    <div className="md:hidden">
                        <Settings />
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 relative overflow-hidden">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="text-left relative z-10">
                        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-[1.1]">
                            Welcome to <br />
                            <span className={isPremium ? 'premium-gradient-text' : 'text-blue-600'}>
                                KCA Connect AI
                            </span>
                        </h1>
                        <p className="text-xl text-text-secondary mb-10 max-w-xl leading-relaxed">
                            Your intelligent companion for academic life at KCA University. Get instant answers to questions about timetables, fees, exams, and more—all powered by advanced AI.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link
                                to="/auth"
                                className={`px-10 py-4 rounded-full text-white font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all text-center ${isPremium ? 'premium-gradient-bg' : 'bg-blue-600'}`}
                            >
                                Start Chatting Now
                            </Link>
                            <button className="px-10 py-4 rounded-full border-2 border-border-primary font-bold text-lg hover:bg-bg-secondary transition-all">
                                Learn More
                            </button>
                        </div>
                    </div>

                    {/* Floating Chat Preview Card */}
                    <div className="relative animate-fadeIn">
                        <div className={`p-6 rounded-3xl border border-border-primary bg-bg-secondary shadow-2xl relative z-10 transform lg:rotate-2 ${isPremium ? 'premium-glow' : ''}`}>
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-primary">
                                <div className="w-8 h-8 rounded-full premium-gradient-bg animate-pulse"></div>
                                <span className="font-bold text-text-primary">Ask KCA Connect AI</span>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-end">
                                    <div className="bg-blue-600/10 text-blue-600 px-4 py-2 rounded-2xl rounded-br-none text-sm font-medium">
                                        tell me more about kca university
                                    </div>
                                </div>
                                <div className="flex justify-start">
                                    <div className="bg-bg-primary border border-border-primary p-4 rounded-2xl rounded-bl-none text-sm text-text-primary">
                                        <p>KCA University is a creative business and technology university with a mission to train employable and market-driven graduates for sustainable economic development. The university values professionalism, integrity, innovation, community, and equity.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Decorative background glow */}
                        <div className={`absolute inset-0 blur-[100px] opacity-30 -z-0 ${isPremium ? 'bg-blue-600' : 'bg-blue-400'}`}></div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 px-6 bg-bg-secondary">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Powerful Features for Every Student</h2>
                        <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                            Our AI-driven platform streamlines your university experience by consolidating critical information into one intuitive interface.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, idx) => (
                            <div key={idx} className="p-8 rounded-3xl border border-border-primary bg-bg-primary transition-all duration-300 hover:shadow-2xl group cursor-default">
                                <div className="text-4xl mb-6 transform transition-transform group-hover:scale-110 group-hover:rotate-3">{feature.icon}</div>
                                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                                <p className="text-text-secondary leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">University Success in 3 Easy Steps</h2>
                        <p className="text-text-secondary text-lg">Getting started with KCA Connect AI is quick and simple.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {steps.map((step, idx) => (
                            <div key={idx} className="text-center relative">
                                <div className={`w-16 h-16 rounded-2xl ${step.color} text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6 shadow-xl`}>
                                    {step.number}
                                </div>
                                <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                                <p className="text-text-secondary leading-relaxed px-4">{step.description}</p>
                                {idx < 2 && (
                                    <div className="hidden lg:block absolute top-8 right-0 translate-x-1/2 w-12 h-0.5 bg-border-primary"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-border-primary text-center px-6">
                <div className="max-w-7xl mx-auto">
                    <p className="text-text-secondary font-medium">
                        © 2026 KCA Connect AI. All rights reserved. 🎓
                    </p>
                    <div className="flex justify-center gap-6 mt-4 text-xs text-text-secondary font-semibold uppercase tracking-widest opacity-60">
                        <a href="#" className="hover:text-accent-primary transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-accent-primary transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-accent-primary transition-colors">Contact Support</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
