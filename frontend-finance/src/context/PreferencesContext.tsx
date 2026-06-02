"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { API_BASE_URL } from "@/lib/constants";
import { translations, LanguageType, TranslationKey } from "@/lib/translations";

interface PreferencesContextType {
  currency: string;
  language: LanguageType;
  setCurrency: (currency: string) => void;
  setLanguage: (lang: LanguageType) => void;
  t: (key: TranslationKey) => string;
  refreshPreferences: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

/**
 * PreferencesProvider Component
 * Manages global user preferences such as currency and language.
 * Fetches initial settings from the backend and provides translation utilities (i18n).
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<string>("USD");
  const [language, setLanguageState] = useState<LanguageType>("en");

  const refreshPreferences = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/preferences`, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          if (data.data.currency) setCurrencyState(data.data.currency);
          if (data.data.language) setLanguageState(data.data.language as LanguageType);
        }
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    }
  };

  useEffect(() => {
    refreshPreferences();
  }, []);

  // Translation utility function (t) mapping keys to active language
  const t = (key: TranslationKey): string => {
    return translations[language][key] || key;
  };

  const setCurrency = (curr: string) => setCurrencyState(curr);
  const setLanguage = (lang: LanguageType) => setLanguageState(lang);

  return (
    <PreferencesContext.Provider value={{ currency, language, setCurrency, setLanguage, t, refreshPreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}
