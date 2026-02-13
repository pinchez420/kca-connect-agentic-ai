import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    getAnalyticsOverview, 
    getChatAnalytics, 
    getChatsDaily, 
    getMessagesDaily,
    getTopTopics,
    getEngagementAnalytics,
    getSystemHealth
} from '../services/api';

// Icons
const UsersIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const ChatIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

const MessageIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
    </svg>
);

const ActivityIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

const ServerIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
);

const DatabaseIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
);

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-bg-secondary rounded-xl p-6 border border-border-primary shadow-sm">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-text-secondary text-sm">{title}</p>
                <p className="text-2xl font-bold text-text-primary mt-1">{value || '...'}</p>
            </div>
            <div className={`p-3 rounded-lg ${color}`}>
                <Icon />
            </div>
        </div>
    </div>
);

const AdminDashboard = () => {
    const { session } = useAuth();
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState(null);
    const [chatStats, setChatStats] = useState(null);
    const [chatsDaily, setChatsDaily] = useState([]);
    const [messagesDaily, setMessagesDaily] = useState([]);
    const [topTopics, setTopTopics] = useState([]);
    const [engagement, setEngagement] = useState(null);
    const [systemHealth, setSystemHealth] = useState(null);
    const [days, setDays] = useState(7);

    useEffect(() => {
        loadAnalytics();
    }, [session, days]);

    const loadAnalytics = async () => {
        if (!session?.access_token) return;
        
        setLoading(true);
        try {
            const [
                overviewData,
                chatData,
                chatsData,
                messagesData,
                topicsData,
                engagementData,
                healthData
            ] = await Promise.all([
                getAnalyticsOverview(session.access_token),
                getChatAnalytics(session.access_token),
                getChatsDaily(session.access_token, days),
                getMessagesDaily(session.access_token, days),
                getTopTopics(session.access_token, 10),
                getEngagementAnalytics(session.access_token),
                getSystemHealth(session.access_token)
            ]);

            setOverview(overviewData);
            setChatStats(chatData);
            setChatsDaily(chatsData || []);
            setMessagesDaily(messagesData || []);
            setTopTopics(topTopics || []);
            setEngagement(engagementData);
            setSystemHealth(healthData);
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate chart data
    const chartData = chatsDaily.map((item, index) => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        chats: item.count,
        messages: messagesDaily[index]?.count || 0
    })).reverse();

    if (loading) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <div className="text-text-primary">Loading analytics...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-primary p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
                        <p className="text-text-secondary">Analytics and system overview</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-text-secondary text-sm">Time range:</span>
                        <select 
                            value={days} 
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="bg-bg-secondary border border-border-primary rounded-lg px-3 py-2 text-text-primary"
                        >
                            <option value={7}>Last 7 days</option>
                            <option value={14}>Last 14 days</option>
                            <option value={30}>Last 30 days</option>
                        </select>
                    </div>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    <StatCard 
                        title="Total Users" 
                        value={overview?.total_users || 0} 
                        icon={UsersIcon}
                        color="bg-blue-500/10 text-blue-500"
                    />
                    <StatCard 
                        title="Active Users (30d)" 
                        value={overview?.active_users_30d || 0} 
                        icon={ActivityIcon}
                        color="bg-green-500/10 text-green-500"
                    />
                    <StatCard 
                        title="Total Chats" 
                        value={overview?.total_chats || 0} 
                        icon={ChatIcon}
                        color="bg-purple-500/10 text-purple-500"
                    />
                    <StatCard 
                        title="Total Messages" 
                        value={overview?.total_messages || 0} 
                        icon={MessageIcon}
                        color="bg-orange-500/10 text-orange-500"
                    />
                    <StatCard 
                        title="Avg Session" 
                        value={overview?.avg_session_duration || '0h 0m'} 
                        icon={ServerIcon}
                        color="bg-indigo-500/10 text-indigo-500"
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Activity Chart */}
                    <div className="bg-bg-secondary rounded-xl p-6 border border-border-primary shadow-sm">
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Activity Over Time</h3>
                        {chartData.length > 0 ? (
                            <div className="space-y-3">
                                {chartData.map((item, index) => (
                                    <div key={index} className="flex items-center gap-4">
                                        <span className="text-text-secondary text-sm w-16">{item.date}</span>
                                        <div className="flex-1 flex gap-2">
                                            <div className="flex-1">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-purple-400">Chats</span>
                                                    <span className="text-text-secondary">{item.chats}</span>
                                                </div>
                                                <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-purple-500 rounded-full"
                                                        style={{ width: `${Math.min(100, (item.chats / Math.max(...chartData.map(d => d.chats), 1)) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-orange-400">Messages</span>
                                                    <span className="text-text-secondary">{item.messages}</span>
                                                </div>
                                                <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-orange-500 rounded-full"
                                                        style={{ width: `${Math.min(100, (item.messages / Math.max(...chartData.map(d => d.messages), 1)) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-text-secondary">No activity data yet</p>
                        )}
                    </div>

                    {/* Top Topics */}
                    <div className="bg-bg-secondary rounded-xl p-6 border border-border-primary shadow-sm">
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Top Chat Topics</h3>
                        {topTopics.length > 0 ? (
                            <div className="space-y-3">
                                {topTopics.map((topic, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <span className="text-text-secondary text-sm w-6">{index + 1}.</span>
                                        <span className="flex-1 text-text-primary truncate">{topic.title}</span>
                                        <span className="text-text-secondary text-sm">{topic.count}</span>
                                        <div className="w-24 h-2 bg-bg-primary rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-accent-primary rounded-full"
                                                style={{ width: `${Math.min(100, (topic.count / topTopics[0].count) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-text-secondary">No topics yet</p>
                        )}
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Chat Stats */}
                    <div className="bg-bg-secondary rounded-xl p-6 border border-border-primary shadow-sm">
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Chat Statistics</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-text-secondary">Total Chats</span>
                                <span className="text-text-primary font-medium">{chatStats?.total || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-secondary">Saved Chats</span>
                                <span className="text-text-primary font-medium">{chatStats?.saved_chats || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-secondary">Avg Messages/Chat</span>
                                <span className="text-text-primary font-medium">{chatStats?.avg_messages_per_chat || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Engagement Stats */}
                    <div className="bg-bg-secondary rounded-xl p-6 border border-border-primary shadow-sm">
                        <h3 className="text-lg font-semibold text-text-primary mb-4">User Engagement</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-text-secondary">Avg Session Duration</span>
                                <span className="text-text-primary font-medium">{engagement?.avg_session_duration || '0h 0m'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-secondary">Avg Messages/User</span>
                                <span className="text-text-primary font-medium">{engagement?.avg_messages_per_user || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* System Health */}
                    <div className="bg-bg-secondary rounded-xl p-6 border border-border-primary shadow-sm">
                        <h3 className="text-lg font-semibold text-text-primary mb-4">System Health</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-text-secondary">Status</span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    systemHealth?.status === 'healthy' 
                                    ? 'bg-green-500/10 text-green-500' 
                                    : 'bg-red-500/10 text-red-500'
                                }`}>
                                    {systemHealth?.status || 'Unknown'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-secondary">Qdrant Collections</span>
                                <span className="text-text-primary font-medium">{systemHealth?.qdrant_collections || 0}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-text-secondary">RAG Vectors</span>
                                <span className="text-text-primary font-medium">{systemHealth?.rag_vectors || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;

