import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/useAuth';

interface UserSettings {
    primary_color: string;
    font_scale: number;
    trash_retention_days: number;
}

interface SettingsContextType {
    settings: UserSettings;
    isLoading: boolean;
    updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
}

const defaultSettings: UserSettings = {
    primary_color: '#2563eb',
    font_scale: 1,
    trash_retention_days: 30,
};

const VALID_HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const sanitizeColor = (color: string): string =>
    VALID_HEX_COLOR.test(color) ? color : defaultSettings.primary_color;

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: Readonly<{ children: ReactNode }>) {
    const { user } = useAuth();
    const [settings, setSettings] = useState<UserSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const root = document.documentElement;

        const safeColor = sanitizeColor(settings.primary_color);
        root.style.setProperty('--primary-color', safeColor);

        root.style.setProperty('--font-scale', settings.font_scale.toString());

        const newFontSize = `${16 * settings.font_scale}px`;
        root.style.fontSize = newFontSize;
    }, [settings]);

    useEffect(() => {
        async function loadSettings() {
            if (!user) {
                setSettings(defaultSettings);
                setIsLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('user_settings')
                    .select('primary_color, font_scale, trash_retention_days')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) {
                    // Silently fail — settings fall back to defaults
                } else if (data) {
                    setSettings({
                        primary_color: sanitizeColor(data.primary_color || defaultSettings.primary_color),
                        font_scale: data.font_scale || defaultSettings.font_scale,
                        trash_retention_days: data.trash_retention_days ?? defaultSettings.trash_retention_days,
                    });
                }
            } catch {
                // Silently fail — settings fall back to defaults
            } finally {
                setIsLoading(false);
            }
        }

        loadSettings();
    }, [user]);

    const updateSettings = async (newSettings: Partial<UserSettings>) => {
        if (!user) return;

        const sanitized = { ...newSettings };
        if (sanitized.primary_color) {
            sanitized.primary_color = sanitizeColor(sanitized.primary_color);
        }

        const updated = { ...settings, ...sanitized };
        setSettings(updated);

        try {
            const { error } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: user.id,
                    primary_color: updated.primary_color,
                    font_scale: updated.font_scale,
                    trash_retention_days: updated.trash_retention_days,
                }, { onConflict: 'user_id' });

            if (error) throw error;
        } catch {
            // Silently fail — optimistic update remains
        }
    };

    const contextValue = useMemo(() => ({ settings, isLoading, updateSettings }), [settings, isLoading, updateSettings]);

    return (
        <SettingsContext.Provider value={contextValue}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
