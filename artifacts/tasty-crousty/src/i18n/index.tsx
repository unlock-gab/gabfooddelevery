import React, { createContext, useContext, useState, useEffect } from "react";
import { fr } from "./fr";
import { ar } from "./ar";

type Translations = typeof fr;
type Language = "fr" | "ar";

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("tc_lang");
    return (saved as Language) || "fr";
  });

  useEffect(() => {
    localStorage.setItem("tc_lang", language);
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const t = (key: keyof Translations) => {
    const translations = language === "fr" ? fr : ar;
    return translations[key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage: setLanguageState, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
