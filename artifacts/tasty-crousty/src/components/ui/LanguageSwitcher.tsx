import React from "react";
import { useI18n } from "@/i18n";
import { Button } from "./button";

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();

  return (
    <div className="flex items-center bg-muted rounded-md p-1">
      <Button
        variant={language === "fr" ? "default" : "ghost"}
        size="sm"
        className="h-7 px-3 text-xs font-medium rounded-sm"
        onClick={() => setLanguage("fr")}
      >
        FR
      </Button>
      <Button
        variant={language === "ar" ? "default" : "ghost"}
        size="sm"
        className="h-7 px-3 text-xs font-medium rounded-sm"
        onClick={() => setLanguage("ar")}
      >
        AR
      </Button>
    </div>
  );
}
