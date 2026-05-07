import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  theme: 'pink' | 'blue' | 'purple' | 'teal';
  language: 'zh-TW' | 'en';
  soundEnabled: boolean;
  syncSettings: boolean;
  anniversaryDate: string | null;
  setTheme: (theme: 'pink' | 'blue' | 'purple' | 'teal') => void;
  setLanguage: (lang: 'zh-TW' | 'en') => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSyncSettings: (enabled: boolean) => void;
  setAnniversaryDate: (date: string | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'pink',
      language: 'zh-TW',
      soundEnabled: true,
      syncSettings: true,
      anniversaryDate: null,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setSyncSettings: (syncSettings) => set({ syncSettings }),
      setAnniversaryDate: (anniversaryDate) => set({ anniversaryDate }),
    }),
    {
      name: 'couples-connect-settings',
    }
  )
)
