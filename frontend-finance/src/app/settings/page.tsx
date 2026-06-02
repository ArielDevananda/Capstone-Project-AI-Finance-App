"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { toast } from "react-hot-toast";
import { API_BASE_URL } from "@/lib/constants";
import { useTheme } from "next-themes";

type Tab = "profil" | "keamanan" | "aplikasi";

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const { refreshPreferences, t, language: appLanguage } = usePreferences();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("profil");

  // --- PROFILE STATE ---
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [fotoProfil, setFotoProfil] = useState("");
  const [isSavingProfil, setIsSavingProfil] = useState(false);

  // --- PASSWORD STATE ---
  const [passwordLama, setPasswordLama] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("");
  const [showPasswordLama, setShowPasswordLama] = useState(false);
  const [showPasswordBaru, setShowPasswordBaru] = useState(false);
  const [showKonfirmasiPassword, setShowKonfirmasiPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // --- APP PREFERENCES STATE ---
  const [currency, setCurrency] = useState("IDR");
  const [language, setLanguage] = useState("id");
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifBudget, setNotifBudget] = useState(true);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Populate form with existing user data on component mount
  useEffect(() => {
    if (!user) return;

    const timer = window.setTimeout(() => {
      setNama(user.nama || "");
      setEmail(user.email || "");
      setFotoProfil(localStorage.getItem(`profile_photo_${user.id}`) || "");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [user]);

  // Fetch application preferences from backend
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/preferences`, {
          credentials: "include",
        });
        const data = await res.json();

        if (!res.ok) return;

        setCurrency(data.data.currency || "IDR");
        setLanguage(data.data.language || "id");
        setNotifEmail(Boolean(data.data.notif_email));
        setNotifBudget(Boolean(data.data.notif_budget));
      } catch {
        // Fallback to default preferences if the backend server is unreachable.
      }
    };

    loadPreferences();
  }, []);

  const handleUbahFoto = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(appLanguage === "id" ? "File harus berupa gambar." : "File must be an image.");
      return;
    }

    if (file.size > 1024 * 1024) {
      toast.error(appLanguage === "id" ? "Ukuran foto maksimal 1MB." : "Photo size maximum 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setFotoProfil(result);
      if (user?.id) {
        localStorage.setItem(`profile_photo_${user.id}`, result);
      }
      toast.success(appLanguage === "id" ? "Foto profil berhasil diperbarui." : "Profile photo updated successfully.");
    };
    reader.onerror = () => toast.error(appLanguage === "id" ? "Gagal membaca file foto." : "Failed to read photo file.");
    reader.readAsDataURL(file);
  };

  const handleHapusFoto = () => {
    setFotoProfil("");
    if (user?.id) {
      localStorage.removeItem(`profile_photo_${user.id}`);
    }
    toast.success(appLanguage === "id" ? "Foto profil dihapus." : "Profile photo deleted.");
  };

  // --- HANDLER: Update Profile ---
  const handleSimpanProfil = async () => {
    if (!nama.trim() || !email.trim()) {
      toast.error(appLanguage === "id" ? "Nama dan email tidak boleh kosong!" : "Name and email cannot be empty!");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(appLanguage === "id" ? "Format email tidak valid!" : "Invalid email format!");
      return;
    }

    setIsSavingProfil(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ nama, email }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || (appLanguage === "id" ? "Profil berhasil diperbarui!" : "Profile updated successfully!"));
        localStorage.setItem("user", JSON.stringify(data.user));
        await refreshUser();
      } else {
        toast.error(data.message || (appLanguage === "id" ? "Gagal memperbarui profil!" : "Failed to update profile!"));
      }
    } catch {
      toast.error(appLanguage === "id" ? "Koneksi ke server terputus!" : "Connection to server lost!");
    } finally {
      setIsSavingProfil(false);
    }
  };

  // --- HANDLER: Update Password ---
  const handleGantiPassword = async () => {
    if (!passwordLama || !passwordBaru || !konfirmasiPassword) {
      toast.error(appLanguage === "id" ? "Semua field password harus diisi!" : "All password fields are required!");
      return;
    }
    if (passwordBaru.length < 6) {
      toast.error(appLanguage === "id" ? "Password baru minimal 6 karakter!" : "New password must be at least 6 characters!");
      return;
    }
    if (passwordBaru !== konfirmasiPassword) {
      toast.error(appLanguage === "id" ? "Konfirmasi password tidak cocok!" : "Password confirmation does not match!");
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          password_lama: passwordLama,
          password_baru: passwordBaru,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || (appLanguage === "id" ? "Password berhasil diubah!" : "Password changed successfully!"));
        setPasswordLama("");
        setPasswordBaru("");
        setKonfirmasiPassword("");
      } else {
        toast.error(data.message || (appLanguage === "id" ? "Gagal mengubah password!" : "Failed to change password!"));
      }
    } catch {
      toast.error(appLanguage === "id" ? "Koneksi ke server terputus!" : "Connection to server lost!");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSimpanPreferensi = async () => {
    setIsSavingPreferences(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currency,
          language,
          notif_email: notifEmail,
          notif_budget: notifBudget,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || (appLanguage === "id" ? "Preferensi berhasil disimpan!" : "Preferences saved successfully!"));
        await refreshPreferences(); // Sync global state
      } else {
        toast.error(data.message || (appLanguage === "id" ? "Gagal menyimpan preferensi!" : "Failed to save preferences!"));
      }
    } catch {
      toast.error(appLanguage === "id" ? "Koneksi ke server terputus!" : "Connection to server lost!");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleHapusSemuaData = async () => {
    setShowDeleteConfirm(false);
    setIsDeletingData(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/user/data`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || (appLanguage === "id" ? "Semua data berhasil dihapus." : "All data deleted successfully."));
      } else {
        toast.error(data.message || (appLanguage === "id" ? "Gagal menghapus data!" : "Failed to delete data!"));
      }
    } catch {
      toast.error(appLanguage === "id" ? "Koneksi ke server terputus!" : "Connection to server lost!");
    } finally {
      setIsDeletingData(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "profil", label: t("tab_profile"), icon: "manage_accounts" },
    { id: "keamanan", label: t("tab_security"), icon: "lock" },
    { id: "aplikasi", label: t("tab_app"), icon: "tune" },
  ];

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <main className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <header>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t("settings_title")}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {t("settings_desc")}
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Tab */}
        <aside className="w-full md:w-56 flex-shrink-0">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {/* Avatar Card */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-lg overflow-hidden">
                {fotoProfil ? (
                  <img
                    src={fotoProfil}
                    alt="Foto profil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-xl">
                    {getInitials(user?.nama || "U")}
                  </span>
                )}
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                  {user?.nama || "—"}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {user?.email || "—"}
                </p>
              </div>
            </div>

            {/* Tab Buttons */}
            <nav className="p-2 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left ${
                    activeTab === tab.id
                      ? "bg-slate-900 dark:bg-indigo-600 text-white"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 bg-transparent"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={
                      activeTab === tab.id
                        ? { fontVariationSettings: "'FILL' 1" }
                        : {}
                    }
                  >
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* TAB: PROFILE */}
          {activeTab === "profil" && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {t("profile_info")}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {t("profile_info_desc")}
                </p>
              </div>

              <div className="space-y-5">
                {/* Profile Picture */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                    {t("profile_photo")}
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-md overflow-hidden flex-shrink-0">
                      {fotoProfil ? (
                        <img
                          src={fotoProfil}
                          alt="Preview foto profil"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-2xl">
                          {getInitials(nama || user?.nama || "U")}
                        </span>
                      )}
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {t("upload_new_photo")}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {t("photo_requirement")}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <label className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs px-4 py-2 rounded-lg hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                          <span className="material-symbols-outlined text-[17px]">
                            add_a_photo
                          </span>
                          {t("change_photo")}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              handleUbahFoto(e.target.files?.[0] || null);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {fotoProfil && (
                          <button
                            type="button"
                            onClick={handleHapusFoto}
                            className="inline-flex items-center gap-2 border border-rose-200 dark:border-rose-800 text-rose-600 font-semibold text-xs px-4 py-2 rounded-lg hover:bg-rose-50 dark:bg-rose-900/30 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[17px]">
                              delete
                            </span>
                            {t("remove_photo")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nama Lengkap */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    {t("full_name")}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                      person
                    </span>
                    <input
                      type="text"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all"
                      placeholder="Nama lengkap Anda"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    {t("email_address")}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                      mail
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all"
                      placeholder="email@contoh.com"
                    />
                  </div>
                </div>

                {/* Info tanggal bergabung */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg px-4 py-3 flex items-center gap-3">
                  <span className="material-symbols-outlined text-slate-400 text-[20px]">
                    calendar_today
                  </span>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t("joined_since")}</p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString(
                            "id-ID",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            }
                          )
                        : "—"}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSimpanProfil}
                    disabled={isSavingProfil}
                    className="flex items-center gap-2 bg-slate-900 dark:bg-indigo-600 text-white font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60 shadow-sm"
                  >
                    {isSavingProfil ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">
                          progress_activity
                        </span>
                        {language === "id" ? "Menyimpan..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">
                          save
                        </span>
                        {t("save_changes")}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: KEAMANAN */}
          {activeTab === "keamanan" && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {t("change_password")}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {t("change_password_desc")}
                </p>
              </div>

              <div className="space-y-5">
                {/* Old Password */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    {t("current_password")}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                      lock
                    </span>
                    <input
                      type={showPasswordLama ? "text" : "password"}
                      value={passwordLama}
                      onChange={(e) => setPasswordLama(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-12 py-3 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-800 outline-none transition-all"
                      placeholder={language === "id" ? "Password saat ini" : "Current password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordLama(!showPasswordLama)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-300"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPasswordLama ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    {t("new_password")}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                      key
                    </span>
                    <input
                      type={showPasswordBaru ? "text" : "password"}
                      value={passwordBaru}
                      onChange={(e) => setPasswordBaru(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-12 py-3 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-800 outline-none transition-all"
                      placeholder={language === "id" ? "Minimal 6 karakter" : "Minimum 6 characters"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordBaru(!showPasswordBaru)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-300"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPasswordBaru ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  {passwordBaru && (
                    <div className="mt-2 flex gap-1.5">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                            passwordBaru.length >= i * 3
                              ? passwordBaru.length >= 10
                                ? "bg-emerald-50 dark:bg-emerald-900/300"
                                : passwordBaru.length >= 7
                                ? "bg-amber-400"
                                : "bg-rose-400"
                              : "bg-slate-200 dark:bg-slate-700"
                          }`}
                        />
                      ))}
                      <span className="text-xs text-slate-400 ml-1">
                        {passwordBaru.length < 6
                          ? t("password_too_short")
                          : passwordBaru.length < 10
                          ? t("password_medium")
                          : t("password_strong")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Konfirmasi Password */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    {t("confirm_password")}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                      check_circle
                    </span>
                    <input
                      type={showKonfirmasiPassword ? "text" : "password"}
                      value={konfirmasiPassword}
                      onChange={(e) => setKonfirmasiPassword(e.target.value)}
                      className={`w-full bg-slate-50 dark:bg-slate-800/50 border rounded-lg pl-10 pr-12 py-3 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 outline-none transition-all ${
                        konfirmasiPassword && konfirmasiPassword !== passwordBaru
                          ? "border-rose-300 focus:ring-rose-500"
                          : "border-slate-200 dark:border-slate-700 focus:ring-slate-800"
                      }`}
                      placeholder={language === "id" ? "Ulangi password baru" : "Repeat new password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKonfirmasiPassword(!showKonfirmasiPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-300"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showKonfirmasiPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                  {konfirmasiPassword && konfirmasiPassword !== passwordBaru && (
                    <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">
                        error
                      </span>
                      {t("password_not_match")}
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleGantiPassword}
                    disabled={isSavingPassword}
                    className="flex items-center gap-2 bg-rose-600 text-white font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-60 shadow-sm"
                  >
                    {isSavingPassword ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">
                          progress_activity
                        </span>
                        {language === "id" ? "Menyimpan..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">
                          lock_reset
                        </span>
                        {t("change_password")}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: APP PREFERENCES */}
          {activeTab === "aplikasi" && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  {t("app_preferences")}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {t("app_preferences_desc")}
                </p>
              </div>

              <div className="space-y-5">
                {/* Mata Uang */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    {t("currency")}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                      payments
                    </span>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-3 text-sm text-slate-800 dark:text-slate-100 outline-none appearance-none cursor-pointer"
                    >
                      <option value="IDR">IDR — Rupiah Indonesia (Rp)</option>
                      <option value="USD">USD — US Dollar ($)</option>
                    </select>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">info</span>Preferensi ini disimpan ke akun Anda.</p>
                </div>

                {/* Bahasa */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    {t("language")}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                      language
                    </span>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-3 text-sm text-slate-800 dark:text-slate-100 outline-none appearance-none cursor-pointer"
                    >
                      <option value="id">🇮🇩 Bahasa Indonesia</option>
                      <option value="en">🇺🇸 English</option>
                    </select>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">info</span>Preferensi ini disimpan ke akun Anda.</p>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                    {t("notifications")}
                  </p>

                  {/* Toggle: Notif Budget */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-400 text-[20px]">
                        notifications_active
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {t("budget_alert")}
                        </p>
                        <p className="text-xs text-slate-400">
                          {t("budget_alert_desc")}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setNotifBudget(!notifBudget)}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                        notifBudget ? "bg-slate-800" : "bg-slate-300"
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 bg-white dark:bg-slate-900 rounded-full shadow transition-transform duration-300 ${
                          notifBudget ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSimpanPreferensi}
                    disabled={isSavingPreferences}
                    className="flex items-center gap-2 bg-slate-900 dark:bg-indigo-600 text-white font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isSavingPreferences ? "progress_activity" : "save"}
                    </span>
                    {isSavingPreferences ? t("saving") : t("save_preferences")}
                  </button>
                </div>
              </div>
              
              {/* Danger Zone */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-rose-200 dark:border-rose-800 shadow-sm p-6 mt-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-rose-600 text-[20px]">
                      warning
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {t("danger_zone")}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                      {t("danger_zone_desc")}
                    </p>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isDeletingData}
                      className="text-xs font-semibold text-rose-600 border border-rose-300 px-4 py-2 rounded-lg hover:bg-rose-50 dark:bg-rose-900/30 transition-colors disabled:opacity-60"
                    >
                      {t("delete_all_data")}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <button
                type="button"
                aria-label="Tutup konfirmasi hapus data"
                onClick={() => setShowDeleteConfirm(false)}
                className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
              />
              <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-rose-100 shadow-2xl overflow-hidden">
                <div className="p-6">
                  <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-rose-600 text-[30px]">
                      report
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {t("delete_confirm_title")}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {t("delete_confirm_desc")}
                  </p>

                  <div className="mt-5 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-100 p-3 flex gap-3">
                    <span className="material-symbols-outlined text-rose-500 text-[20px] flex-shrink-0">
                      warning
                    </span>
                    <p className="text-xs text-rose-700 dark:text-rose-400">
                      {t("delete_confirm_warning")}
                    </p>
                  </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 transition-colors"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleHapusSemuaData}
                    disabled={isDeletingData}
                    className="px-4 py-2.5 rounded-lg bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
                  >
                    {isDeletingData ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">
                          progress_activity
                        </span>
                        {t("deleting")}
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">
                          delete_forever
                        </span>
                        {t("yes_delete")}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
