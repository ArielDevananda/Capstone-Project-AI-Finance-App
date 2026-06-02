"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useTheme } from "next-themes";
import { API_BASE_URL } from "@/lib/constants";
import toast from "react-hot-toast";

interface NotificationItem {
  id: number;
  tipe: string;
  judul: string;
  pesan: string;
  status: "read" | "unread";
  created_at: string | null;
}

interface TopNavbarProps {
  onMobileMenuToggle?: () => void;
}

export default function TopNavbar({ onMobileMenuToggle }: TopNavbarProps = {}) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t, language } = usePreferences();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [fotoProfil, setFotoProfil] = useState("");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const unreadCount = notifications.filter((item) => item.status === "unread").length;

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        credentials: "include",
      });
      const data = await res.json();

      if (res.ok) {
        setNotifications(data.data || []);
      }
    } catch {
      // Notifications are non-blocking.
    }
  };

  const markAsRead = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: "PUT",
        credentials: "include",
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: "read" as const } : item
          )
        );
      }
    } catch {
      toast.error(language === "id" ? "Gagal menandai notifikasi." : "Failed to mark notification.");
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    setFotoProfil(localStorage.getItem(`profile_photo_${user.id}`) || "");
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success(language === "id" ? "Logout berhasil! Sampai jumpa lagi." : "Logout successful! See you again.");
      router.push("/login");
    } catch (error) {
      toast.error(language === "id" ? "Gagal logout!" : "Failed to logout!");
    }
  };

  return (
    <div className="flex items-center justify-between px-4 md:px-8 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="p-1 -ml-2 mr-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 md:hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            aria-label="Toggle Mobile Menu"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
        )}

      </div>

      {/* AKSI KANAN ATAS */}
      <div className="flex items-center gap-4">
        {/* THEME TOGGLE */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-full hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 relative shrink-0"
            aria-label="Toggle Dark Mode"
          >
            <span className="material-symbols-outlined text-[20px]">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          </button>
        )}

        {/* NOTIFICATION BUTTON */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
              fetchNotifications();
            }}
            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors rounded-full hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 relative shrink-0"
            aria-label="Buka notifikasi"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-sm shadow-rose-500/30">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-[22rem] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
              <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 dark:from-slate-800 to-white dark:to-slate-900 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-800 dark:text-slate-100">
                    {language === "id" ? "Pusat Notifikasi" : "Notification Center"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {language === "id" ? "Update aktivitas keuangan Anda" : "Updates on your financial activity"}
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 px-2.5 py-1 rounded-full">
                  {unreadCount} {language === "id" ? "baru" : "new"}
                </span>
              </div>
              <div className="max-h-80 overflow-y-auto p-2 space-y-2">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-slate-400">
                        notifications_off
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {language === "id" ? "Belum ada notifikasi" : "No notifications yet"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {language === "id" ? "Notifikasi penting akan tampil di sini." : "Important notifications will appear here."}
                    </p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => markAsRead(item.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        item.status === "unread"
                          ? "bg-amber-50 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60"
                          : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/80"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`material-symbols-outlined text-[20px] mt-0.5 w-9 h-9 rounded-full flex items-center justify-center ${
                            item.tipe === "budget_alert"
                              ? "text-amber-600 bg-amber-100 dark:bg-amber-900/40"
                              : "text-slate-800 dark:text-slate-100 bg-slate-200 dark:bg-slate-700"
                          }`}
                        >
                          {item.tipe === "budget_alert" ? "warning" : "notifications"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                              {language === "en" ? item.judul.replace("Anggaran", "Budget for").replace("terlampaui", "exceeded").replace("mendekati batas", "nearing limit") : item.judul}
                            </p>
                            {item.status === "unread" && (
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {language === "en" ? item.pesan.replace("Pengeluaran kategori", "Expenses for").replace("sudah", "have reached").replace("dari batas", "of the limit") : item.pesan}
                          </p>
                          {item.created_at && (
                            <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">
                                schedule
                              </span>
                              {new Date(item.created_at.replace(" ", "T")).toLocaleString("id-ID")}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* USER PROFILE DROPDOWN */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800/60 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
              {fotoProfil ? (
                <img
                  src={fotoProfil}
                  alt="Foto profil"
                  className="w-full h-full object-cover"
                />
              ) : (
                user?.nama?.charAt(0).toUpperCase() || "U"
              )}
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                {user?.nama || "User"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user?.email || "user@example.com"}
              </p>
            </div>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </button>

          {/* DROPDOWN MENU */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50">
              <button
                onClick={() => {
                  router.push("/settings");
                  setShowUserMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">settings</span>
                {t("nav_settings")}
              </button>
              <div className="border-t border-slate-200 dark:border-slate-700 my-2"></div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                {t("nav_logout")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}