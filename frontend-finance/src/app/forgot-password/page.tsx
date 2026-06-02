"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePreferences } from "@/context/PreferencesContext";
import toast from "react-hot-toast";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/constants";

export default function ForgotPassword() {
  // --- FORM INPUT STATE ---
  const [email, setEmail] = useState("");
  const [passwordBaru, setPasswordBaru] = useState("");
  const [konfirmasiPassword, setKonfirmasiPassword] = useState("");
  const [lihatPassword, setLihatPassword] = useState(false);
  const [lihatKonfirmasi, setLihatKonfirmasi] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- HOOKS ---
  const router = useRouter();
  const { t, language } = usePreferences();

  // --- PASSWORD RESET HANDLER ---
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    // Input validation
    if (!email || !passwordBaru || !konfirmasiPassword) {
      toast.error(t("forgot_err_empty"));
      return;
    }

    if (passwordBaru !== konfirmasiPassword) {
      toast.error(t("forgot_err_match"));
      return;
    }

    if (passwordBaru.length < 6) {
      toast.error(t("forgot_err_length"));
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password_baru: passwordBaru,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === "success") {
        toast.success(t("forgot_success"));
        router.push("/login");
      } else {
        toast.error(data.message || (language === "id" ? "Gagal mengatur ulang password." : "Failed to reset password."));
      }
    } catch (error: any) {
      toast.error(language === "id" ? "Terjadi kesalahan jaringan." : "A network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12">
      {/* MAIN CONTAINER CARD */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-8 space-y-6 transition-all duration-300 hover:shadow-2xl">
        {/* LOGO & BRAND */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-lg p-2">
            <img src="/logo.png" alt="WealthVision Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            {t("forgot_title")}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t("forgot_desc")}
          </p>
        </div>

        {/* FORM RESET */}
        <form onSubmit={handleReset} className="space-y-4">
          {/* EMAIL INPUT */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-400">mail</span> {t("login_email_label")}
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("login_email_placeholder")}
              disabled={isLoading}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg pl-4 pr-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all disabled:opacity-50"
            />
          </div>

          {/* NEW PASSWORD INPUT */}
          <div>
            <label
              htmlFor="passwordBaru"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-400">lock</span> {t("forgot_new_pass")}
            </label>
            <div className="relative">
              <input
                type={lihatPassword ? "text" : "password"}
                id="passwordBaru"
                value={passwordBaru}
                onChange={(e) => setPasswordBaru(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg pl-4 pr-12 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all disabled:opacity-50"
              />
              {/* TOGGLE PASSWORD VISIBILITY */}
              <button
                type="button"
                onClick={() => setLihatPassword(!lihatPassword)}
                disabled={isLoading}
                className="absolute right-4 top-3.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
              >
                {lihatPassword ? (
                  <span className="material-symbols-outlined text-[20px]">visibility_off</span>
                ) : (
                  <span className="material-symbols-outlined text-[20px]">visibility</span>
                )}
              </button>
            </div>
          </div>

          {/* KONFIRMASI PASSWORD INPUT */}
          <div>
            <label
              htmlFor="konfirmasiPassword"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-400">check_circle</span> {t("forgot_confirm_pass")}
            </label>
            <div className="relative">
              <input
                type={lihatKonfirmasi ? "text" : "password"}
                id="konfirmasiPassword"
                value={konfirmasiPassword}
                onChange={(e) => setKonfirmasiPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg pl-4 pr-12 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all disabled:opacity-50"
              />
              {/* TOGGLE PASSWORD VISIBILITY */}
              <button
                type="button"
                onClick={() => setLihatKonfirmasi(!lihatKonfirmasi)}
                disabled={isLoading}
                className="absolute right-4 top-3.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
              >
                {lihatKonfirmasi ? (
                  <span className="material-symbols-outlined text-[20px]">visibility_off</span>
                ) : (
                  <span className="material-symbols-outlined text-[20px]">visibility</span>
                )}
              </button>
            </div>
          </div>

          {/* BUTTON SUBMIT */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-amber-500/30 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none mt-4"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses...
              </span>
            ) : (
              t("forgot_btn")
            )}
          </button>
        </form>

        {/* LOGIN LINK */}
        <div className="text-center pt-2">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-amber-600 transition-colors inline-flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            {t("forgot_back")}
          </Link>
        </div>
      </div>
    </main>
  );
}
