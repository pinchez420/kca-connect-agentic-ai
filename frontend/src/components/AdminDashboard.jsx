import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    getAnalyticsOverview,
    getChatAnalytics,
    getChatsDaily,
    getMessagesDaily,
    getTopTopics,
    getEngagementAnalytics,
    getSystemHealth,
    uploadDocument,
    getAllUsers,
    makeUserAdmin,
    removeUserAdmin,
    updateUser as updateUserApi,
    deleteUser as deleteUserApi,
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
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState(null);
    const [chatStats, setChatStats] = useState(null);
    const [chatsDaily, setChatsDaily] = useState([]);
    const [messagesDaily, setMessagesDaily] = useState([]);
    const [topTopics, setTopTopics] = useState([]);
    const [engagement, setEngagement] = useState(null);
    const [systemHealth, setSystemHealth] = useState(null);
    const [days, setDays] = useState(7);

    // Users management state
    const [users, setUsers] = useState([]);
    const [usersTotal, setUsersTotal] = useState(0);
    const [usersLimit, setUsersLimit] = useState(10);
    const [usersOffset, setUsersOffset] = useState(0);
    const [usersLoading, setUsersLoading] = useState(false);
    const [editUser, setEditUser] = useState(null); // { ...user }
    const [editSaving, setEditSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    // Upload State
    const [uploadFile, setUploadFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(null); // { type: 'success' | 'error', message: '' }

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setUploadFile(e.target.files[0]);
            setUploadStatus(null);
        }
    };

    const handleUpload = async () => {
        if (!uploadFile || !session?.access_token) return;

        setUploading(true);
        setUploadStatus(null);

        try {
            await uploadDocument(session.access_token, uploadFile);
            setUploadStatus({ type: 'success', message: `Successfully ingested ${uploadFile.name}` });
            setUploadFile(null);
            // Reset file input
            const fileInput = document.getElementById('file-upload');
            if (fileInput) fileInput.value = '';

            // Refresh stats to show new vector counts
            loadAnalytics();
        } catch (error) {
            setUploadStatus({ type: 'error', message: error.message || 'Failed to upload document' });
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        loadAnalytics();
    }, [session, days]);

    useEffect(() => {
        loadUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session, usersLimit, usersOffset]);

    const loadAnalytics = async () => {
        // Check if session exists and has a valid access_token
        if (!session || !session.access_token) {
            console.warn('No valid session - skipping analytics load');
            setLoading(false);
            return;
        }
        
        const token = session.access_token;
        console.log('Loading analytics with token:', token ? 'present' : 'missing');
        
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
                getAnalyticsOverview(token).catch(e => {
                    console.error('Overview error:', e);
                    return null;
                }),
                getChatAnalytics(token).catch(e => {
                    console.error('Chat analytics error:', e);
                    return null;
                }),
                getChatsDaily(token, days).catch(e => {
                    console.error('Chats daily error:', e);
                    return [];
                }),
                getMessagesDaily(token, days).catch(e => {
                    console.error('Messages daily error:', e);
                    return [];
                }),
                getTopTopics(token, 10).catch(e => {
                    console.error('Top topics error:', e);
                    return [];
                }),
                getEngagementAnalytics(token).catch(e => {
                    console.error('Engagement error:', e);
                    return null;
                }),
                getSystemHealth(token).catch(e => {
                    console.error('System health error:', e);
                    return null;
                })
            ]);

            setOverview(overviewData);
            setChatStats(chatData);
            setChatsDaily(chatsData || []);
            setMessagesDaily(messagesData || []);
            setTopTopics(topicsData || []);
            setEngagement(engagementData);
            setSystemHealth(healthData);
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        if (!session?.access_token) return;
        setUsersLoading(true);
        setErrorMsg(null);
        try {
            const data = await getAllUsers(session.access_token, usersLimit, usersOffset);
            if (data && data.users) {
                setUsers(data.users);
                setUsersTotal(data.total || 0);
            } else {
                console.warn('Unexpected response format from getAllUsers:', data);
                setUsers([]);
                setUsersTotal(0);
            }
        } catch (e) {
            console.error('Error loading users:', e);
            setErrorMsg(e.message || 'Failed to load users. Please try again.');
            setUsers([]);
        } finally {
            setUsersLoading(false);
        }
    };

    const handleMakeAdmin = async (userId) => {
        if (!session?.access_token) return;
        await makeUserAdmin(session.access_token, userId);
        await loadUsers();
    };

    const handleRemoveAdmin = async (userId) => {
        if (!session?.access_token) return;
        await removeUserAdmin(session.access_token, userId);
        await loadUsers();
    };

    const handleDeleteUser = async (userId) => {
        if (!session?.access_token) return;
        if (!confirm('Delete this user? This cannot be undone.')) return;
        await deleteUserApi(session.access_token, userId);
        if (users.length === 1 && usersOffset > 0) {
            setUsersOffset(Math.max(0, usersOffset - usersLimit));
        } else {
            await loadUsers();
        }
    };

    const openEdit = (user) => {
        setErrorMsg(null);
        setEditUser({ ...user });
    };

    const closeEdit = () => {
        setEditUser(null);
        setErrorMsg(null);
    };

    const saveEdit = async () => {
        if (!session?.access_token || !editUser) return;
        setEditSaving(true);
        setErrorMsg(null);
        try {
            const payload = {
                full_name: editUser.full_name || '',
                campus_branch: editUser.campus_branch || '',
            };
            await updateUserApi(session.access_token, editUser.id, payload);
            closeEdit();
            await loadUsers();
        } catch (e) {
            setErrorMsg(e.message || 'Failed to update user');
        } finally {
            setEditSaving(false);
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
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-lg bg-bg-secondary border border-border-primary hover:bg-bg-primary text-text-primary"
                            title="Go Back"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-text-primary">Admin Dashboard</h1>
                            <p className="text-text-secondary">Analytics and system overview</p>
                        </div>
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
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-accent-primary scrollbar-track-bg-primary">
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
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-accent-primary scrollbar-track-bg-primary">
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
                                <span className={`px-2 py-1 rounded text-xs font-medium ${systemHealth?.status === 'healthy'
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

            {/* Users Management */}
            <div className="bg-bg-secondary rounded-xl p-6 border border-border-primary shadow-sm mt-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Users Management</h3>
                <div className="flex items-center justify-between mb-4">
                    <div className="text-text-secondary text-sm">Total: {usersTotal}</div>
                    {errorMsg && (
                        <div className="text-red-400 text-sm px-3 py-1 bg-red-500/10 rounded">{errorMsg}</div>
                    )}
                    <div className="flex items-center gap-2">
                        <span className="text-text-secondary text-sm">Per page:</span>
                        <select
                            value={usersLimit}
                            onChange={(e) => { setUsersOffset(0); setUsersLimit(Number(e.target.value)); }}
                            className="bg-bg-primary border border-border-primary rounded-lg px-2 py-1 text-text-primary text-sm"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="text-left text-text-secondary border-b border-border-primary">
                                <th className="py-2 pr-4">Email</th>
                                <th className="py-2 pr-4">Full Name</th>
                                <th className="py-2 pr-4">Campus</th>
                                <th className="py-2 pr-4">Chats</th>
                                <th className="py-2 pr-4">Admin</th>
                                <th className="py-2 pr-4">Created</th>
                                <th className="py-2 pr-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {usersLoading ? (
                                <tr><td className="py-4 text-text-secondary" colSpan={7}>Loading users...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td className="py-4 text-text-secondary" colSpan={7}>No users found</td></tr>
                            ) : (
                                users.map(u => (
                                    <tr key={u.id} className="border-b border-border-primary">
                                        <td className="py-2 pr-4 text-text-primary">{u.email}</td>
                                        <td className="py-2 pr-4 text-text-primary">{u.full_name || '-'}</td>
                                        <td className="py-2 pr-4 text-text-primary">{u.campus_branch || '-'}</td>
                                        <td className="py-2 pr-4 text-text-primary">{u.chat_count ?? 0}</td>
                                        <td className="py-2 pr-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${u.is_admin ? 'bg-green-500/10 text-green-500' : 'bg-gray-600 text-gray-300'}`}>
                                                {u.is_admin ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                        <td className="py-2 pr-4 text-text-secondary">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                                        <td className="py-2 pr-4 flex gap-2">
                                            {u.is_admin ? (
                                                <button onClick={() => handleRemoveAdmin(u.id)} className="px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-white">Remove Admin</button>
                                            ) : (
                                                <button onClick={() => handleMakeAdmin(u.id)} className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white">Make Admin</button>
                                            )}
                                            <button onClick={() => openEdit(u)} className="px-2 py-1 text-xs rounded bg-yellow-600 hover:bg-yellow-500 text-white">Edit</button>
                                            <button onClick={() => handleDeleteUser(u.id)} className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-500 text-white">Delete</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-end gap-2 mt-4">
                    <button
                        onClick={() => setUsersOffset(Math.max(0, usersOffset - usersLimit))}
                        disabled={usersOffset === 0}
                        className={`px-3 py-1 rounded ${usersOffset === 0 ? 'bg-gray-700 text-gray-400' : 'bg-bg-primary text-text-primary border border-border-primary hover:bg-bg-primary/80'}`}
                    >Prev</button>
                    <span className="text-text-secondary text-sm">
                        {usersTotal === 0 ? 0 : Math.floor(usersOffset / usersLimit) + 1} / {Math.max(1, Math.ceil(usersTotal / usersLimit))}
                    </span>
                    <button
                        onClick={() => setUsersOffset(usersOffset + usersLimit)}
                        disabled={usersOffset + usersLimit >= usersTotal}
                        className={`px-3 py-1 rounded ${(usersOffset + usersLimit >= usersTotal) ? 'bg-gray-700 text-gray-400' : 'bg-bg-primary text-text-primary border border-border-primary hover:bg-bg-primary/80'}`}
                    >Next</button>
                </div>

                {/* Edit Modal */}
                {editUser && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-bg-secondary border border-border-primary rounded-xl p-6 w-full max-w-md">
                            <h4 className="text-lg font-semibold text-text-primary mb-4">Edit User</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-text-secondary mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={editUser.full_name || ''}
                                        onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })}
                                        className="w-full bg-bg-primary border border-border-primary rounded-lg px-3 py-2 text-text-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-text-secondary mb-1">Campus</label>
                                    <input
                                        type="text"
                                        value={editUser.campus_branch || ''}
                                        onChange={(e) => setEditUser({ ...editUser, campus_branch: e.target.value })}
                                        className="w-full bg-bg-primary border border-border-primary rounded-lg px-3 py-2 text-text-primary"
                                    />
                                </div>
                            </div>

                            {errorMsg && (
                                <div className="mt-3 p-2 text-sm rounded bg-red-500/10 text-red-400 border border-red-500/20">{errorMsg}</div>
                            )}

                            <div className="flex justify-end gap-2 mt-5">
                                <button onClick={closeEdit} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white">Cancel</button>
                                <button onClick={saveEdit} disabled={editSaving} className={`px-4 py-2 rounded ${editSaving ? 'bg-gray-600' : 'bg-accent-primary hover:bg-accent-secondary'} text-white`}>
                                    {editSaving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Knowledge Base Management */}
            <div className="bg-bg-secondary rounded-xl p-6 border border-border-primary shadow-sm mt-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Knowledge Base Management</h3>
                <p className="text-text-secondary text-sm mb-4">
                    Upload official documents (PDF, DOCX, TXT) to the Qdrant vector database.
                    The AI will immediately be able to use this information to answer user queries.
                </p>

                <div className="flex flex-col md:flex-row items-start gap-4">
                    <div className="flex-1 w-full">
                        <input
                            type="file"
                            id="file-upload"
                            accept=".pdf,.docx,.txt"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-text-secondary
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-lg file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-accent-primary file:text-white
                                    hover:file:bg-accent-secondary
                                    cursor-pointer"
                        />
                        <p className="text-xs text-text-secondary mt-2">
                            Supported formats: PDF, DOCX, TXT. Max size: 10MB.
                        </p>
                    </div>

                    <button
                        onClick={handleUpload}
                        disabled={!uploadFile || uploading}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${!uploadFile || uploading
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-accent-primary text-white hover:bg-accent-secondary'
                            }`}
                    >
                        {uploading ? 'Ingesting...' : 'Upload & Ingest'}
                    </button>
                </div>

                {uploadStatus && (
                    <div className={`mt-4 p-3 rounded-lg text-sm ${uploadStatus.type === 'success'
                        ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                        : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                        {uploadStatus.message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;

