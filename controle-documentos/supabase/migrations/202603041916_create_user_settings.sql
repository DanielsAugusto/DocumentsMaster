-- SQL script for Supabase SQL Editor
-- Creates the user_settings table to persist User Interface tweaks (Font scale and Primary Color)

CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    primary_color TEXT DEFAULT '#2563eb',
    font_scale FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 1. Users can view their own settings
CREATE POLICY "Users can view own settings" 
    ON public.user_settings FOR SELECT 
    USING (auth.uid() = user_id);

-- 2. Users can insert their own settings (if they don't have one)
CREATE POLICY "Users can insert own settings" 
    ON public.user_settings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 3. Users can update their own settings
CREATE POLICY "Users can update own settings" 
    ON public.user_settings FOR UPDATE 
    USING (auth.uid() = user_id);

-- 4. Enable automatic updated_at timestamp updates
CREATE OR REPLACE FUNCTION public.user_settings_handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_settings_updated ON public.user_settings;
CREATE TRIGGER on_user_settings_updated
BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE PROCEDURE public.user_settings_handle_updated_at();
