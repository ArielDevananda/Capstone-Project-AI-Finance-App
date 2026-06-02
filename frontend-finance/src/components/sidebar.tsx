"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePreferences } from "@/context/PreferencesContext";

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  isMobileMenuOpen?: boolean;
  onCloseMobileMenu?: () => void;
}

export default function Sidebar({
  isCollapsed = false,
  onToggle,
  isMobileMenuOpen = false,
  onCloseMobileMenu,
}: SidebarProps) {
  const pathname = usePathname();
  const { t, language } = usePreferences();

  // ─── LIGHT MODE: teks gelap di bg putih; DARK MODE: teks terang di bg gelap ───
  const getLinkClass = (path: string) => {
    const isActive = pathname === path;
    return `relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
      isActive
        ? // Aktif — bg cerah di light mode, bg redup di dark mode
          "bg-emerald-50 text-emerald-700 font-semibold shadow-sm dark:bg-slate-800/80 dark:text-white"
        : // Non-aktif — teks muted, hover ringan
          "text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60"
    }`;
  };

  const getIconStyle = (path: string) => {
    return pathname === path ? { fontVariationSettings: "'FILL' 1" } : {};
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onCloseMobileMenu}
        />
      )}
      
      <aside
        className={`min-h-screen bg-white dark:bg-slate-950 flex flex-col fixed left-0 top-0 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 z-50 ${
          isCollapsed ? "w-20" : "w-64"
        } ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Tombol Collapse Floating (Desktop Only) */}
        <button
          type="button"
          onClick={onToggle}
          className="hidden md:flex absolute -right-3.5 top-12 w-7 h-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full items-center justify-center text-slate-400 hover:text-slate-800 dark:text-slate-200 dark:hover:text-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-md z-50"
          aria-label={isCollapsed ? "Buka sidebar" : "Tutup sidebar"}
          title={isCollapsed ? "Buka sidebar" : "Tutup sidebar"}
        >
        <span className="material-symbols-outlined text-[16px]">
          {isCollapsed ? "chevron_right" : "chevron_left"}
        </span>
      </button>

      {/* Logo Area */}
      <div className={`flex items-center gap-3 pt-8 pb-8 ${isCollapsed ? "px-5 justify-center" : "px-5"}`}>
        <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm shrink-0 p-1 border border-slate-200 dark:border-slate-700">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        {!isCollapsed && (
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-wide">
            Wealth<span className="text-emerald-600 dark:text-emerald-400">Vision</span>
          </h1>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 flex flex-col mt-2 px-3 overflow-y-auto overflow-x-hidden scrollbar-hide">

        {/* SECTION: MENU */}
        <div className="mb-6">
          {!isCollapsed && (
            <h2 className="px-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Menu
            </h2>
          )}
          <div className="flex flex-col space-y-1">
            <Link href="/dashboard" className={getLinkClass("/dashboard")}>
              <span className="material-symbols-outlined text-[22px]" style={getIconStyle("/dashboard")}>
                dashboard
              </span>
              {!isCollapsed && <span className="truncate">{t("nav_dashboard")}</span>}
            </Link>
            <Link href="/budgeting" className={getLinkClass("/budgeting")}>
              <span className="material-symbols-outlined text-[22px]" style={getIconStyle("/budgeting")}>
                account_balance_wallet
              </span>
              {!isCollapsed && <span className="truncate">{t("nav_budgeting")}</span>}
            </Link>
            <Link href="/history" className={getLinkClass("/history")}>
              <span className="material-symbols-outlined text-[22px]" style={getIconStyle("/history")}>
                receipt_long
              </span>
              {!isCollapsed && <span className="truncate">{t("nav_history")}</span>}
            </Link>
            <Link href="/ai-advisor" className={getLinkClass("/ai-advisor")}>
              <span className="material-symbols-outlined text-[22px]" style={getIconStyle("/ai-advisor")}>
                smart_toy
              </span>
              {!isCollapsed && <span className="truncate">{t("nav_ai_advisor")}</span>}
            </Link>
            <Link href="/savings" className={getLinkClass("/savings")}>
              <span className="material-symbols-outlined text-[22px]" style={getIconStyle("/savings")}>
                savings
              </span>
              {!isCollapsed && <span className="truncate">{t("nav_savings")}</span>}
            </Link>
          </div>
        </div>

        {/* SECTION: GENERAL */}
        <div className="mb-6">
          {!isCollapsed && (
            <h2 className="px-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              General
            </h2>
          )}
          <div className="flex flex-col space-y-1">
            <Link href="/settings" className={getLinkClass("/settings")}>
              <span className="material-symbols-outlined text-[22px]" style={getIconStyle("/settings")}>
                settings
              </span>
              {!isCollapsed && <span className="truncate">{t("nav_settings")}</span>}
            </Link>
            <Link href="/help" className={getLinkClass("/help")}>
              <span className="material-symbols-outlined text-[22px]" style={getIconStyle("/help")}>
                help
              </span>
              {!isCollapsed && <span className="truncate">{language === "id" ? "Bantuan" : "Help Desk"}</span>}
            </Link>
          </div>
        </div>

      </div>
    </aside>
    </>
  );
}
