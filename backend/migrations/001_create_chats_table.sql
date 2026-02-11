-- Migration script for creating the chats table in Supabase
-- Run this in Supabase SQL Editor

-- Create the chats table
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL DEFAULT 'New Chat',
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_saved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Create policies for users to only see their own chats
CREATE POLICY "Users can view their own chats" 
ON public.chats FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats" 
ON public.chats FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats" 
ON public.chats FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats" 
ON public.chats FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_chats_user_id ON public.chats(user_id);
CREATE INDEX idx_chats_user_id_updated ON public.chats(user_id, updated_at DESC);
CREATE INDEX idx_chats_user_id_saved ON public.chats(user_id, is_saved) WHERE is_saved = true;

-- Enable Realtime for the table (optional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;

