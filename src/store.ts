import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  theme: 'pink' | 'blue' | 'purple' | 'teal';
  language: 'zh-TW' | 'en';
  soundEnabled: boolean;
  syncSettings: boolean;
  setTheme: (theme: 'pink' | 'blue' | 'purple' | 'teal') => void;
  setLanguage: (lang: 'zh-TW' | 'en') => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSyncSettings: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'pink',
      language: 'zh-TW',
      soundEnabled: true,
      syncSettings: true,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setSyncSettings: (syncSettings) => set({ syncSettings }),
    }),
    {
      name: 'couples-connect-settings',
    }
  )
)
