-- Migration script for Admin Analytics Dashboard
-- Run this in Supabase SQL Editor

-- ============ User Sessions Table ============
-- Tracks user login/logout for engagement metrics
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logout_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sessions
CREATE POLICY "Users can view own sessions"
ON public.user_sessions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
ON public.user_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all sessions
CREATE POLICY "Admins can view all user sessions"
ON public.user_sessions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND (u.raw_user_meta_data->>'_admin')::boolean = true
    )
);

-- Index for faster queries
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_login_at ON public.user_sessions(login_at DESC);

-- ============ Analytics Events Table ============
-- Tracks user actions for analytics
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID,
    session_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all analytics
CREATE POLICY "Admins can view all analytics events"
ON public.analytics_events FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users u
        WHERE u.id = auth.uid()
        AND (u.raw_user_meta_data->>'_admin')::boolean = true
    )
);

-- Policy: Authenticated users can insert their own events
CREATE POLICY "Users can insert analytics events"
ON public.analytics_events FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);

-- ============ Admin Helper View ============
-- View to check if user is admin
CREATE OR REPLACE VIEW public.admin_users AS
SELECT 
    id,
    email,
    raw_user_meta_data as user_metadata,
    created_at
FROM auth.users
WHERE (raw_user_meta_data->>'_admin')::boolean = true;

-- ============ Analytics Summary Functions ============

-- Function to get total user count
CREATE OR REPLACE FUNCTION public.get_total_users()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM auth.users
        WHERE email IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active users (last 30 days)
CREATE FUNCTION public.get_active_users(days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT user_id)::INTEGER
        FROM public.user_sessions
        WHERE login_at > NOW() - (days || ' days')::INTERVAL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total chats count
CREATE OR REPLACE FUNCTION public.get_total_chats()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.chats
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total messages count
CREATE OR REPLACE FUNCTION public.get_total_messages()
RETURNS BIGINT AS $$
BEGIN
    RETURN (
        SELECT COALESCE(SUM(array_length((messages)::jsonb, 1)), 0)::BIGINT
        FROM public.chats
        WHERE messages IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get chats per day
CREATE OR REPLACE FUNCTION public.get_chats_per_day(days INTEGER DEFAULT 7)
RETURNS TABLE(date DATE, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(created_at) as date,
        COUNT(*)::BIGINT as count
    FROM public.chats
    WHERE created_at > NOW() - (days || ' days')::INTERVAL
    GROUP BY DATE(created_at)
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get messages per day
CREATE OR REPLACE FUNCTION public.get_messages_per_day(days INTEGER DEFAULT 7)
RETURNS TABLE(date DATE, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    WITH chat_dates AS (
        SELECT 
            DATE(created_at) as date,
            (messages)::jsonb as messages
        FROM public.chats
        WHERE created_at > NOW() - (days || ' days')::INTERVAL
    )
    SELECT 
        date,
        COALESCE(SUM(array_length(messages, 1)), 0)::BIGINT as count
    FROM chat_dates
    GROUP BY date
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top chat topics (from titles)
CREATE OR REPLACE FUNCTION public.get_top_chat_topics(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(title TEXT, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        INITCAP(title) as title,
        COUNT(*)::BIGINT as count
    FROM public.chats
    WHERE title IS NOT NULL 
        AND title != 'New Chat'
        AND LENGTH(title) > 0
    GROUP BY title
    ORDER BY count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get new users per day
CREATE OR REPLACE FUNCTION public.get_new_users_per_day(days INTEGER DEFAULT 7)
RETURNS TABLE(date DATE, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(created_at) as date,
        COUNT(*)::BIGINT as count
    FROM auth.users
    WHERE created_at > NOW() - (days || ' days')::INTERVAL
    GROUP BY DATE(created_at)
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get average session duration
CREATE OR REPLACE FUNCTION public.get_avg_session_duration()
RETURNS INTERVAL AS $$
DECLARE
    avg_duration INTERVAL;
BEGIN
    SELECT AVG(logout_at - login_at) INTO avg_duration
    FROM public.user_sessions
    WHERE logout_at IS NOT NULL;
    
    RETURN COALESCE(avg_duration, '0 seconds'::INTERVAL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


