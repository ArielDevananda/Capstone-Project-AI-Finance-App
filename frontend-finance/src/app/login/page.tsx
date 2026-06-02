"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import toast from "react-hot-toast";
import Link from "next/link";

export default function Login() {
  // --- FORM INPUT STATE ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lihatPassword, setLihatPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- HOOKS ---
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const { t, language, refreshPreferences } = usePreferences();

  // --- REDIRECT IF ALREADY AUTHENTICATED ---
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  // --- LOGIN HANDLER ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Input validation
    if (!email || !password) {
      toast.error(t("login_error_empty"));
      return;
    }

    setIsLoading(true);

    try {
      // Call AuthContext login function
      await login(email, password);
      await refreshPreferences();
      toast.success(language === "id" ? "Akses diterima! Selamat datang kembali." : "Access granted! Welcome back.");
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || (language === "id" ? "Akses ditolak! Email atau Password salah." : "Access denied! Invalid Email or Password."));
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
            {t("login_title")}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t("login_desc")}
          </p>
        </div>

        {/* LOGIN FORM */}
        <form onSubmit={handleLogin} className="space-y-4">
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
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg pl-4 pr-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:bg-slate-900 focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all disabled:opacity-50"
            />
          </div>

          {/* PASSWORD INPUT */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider"
              >
                <span className="material-symbols-outlined text-[18px] text-slate-400">lock</span> {t("login_pass_label")}
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-slate-800 dark:text-slate-100 hover:text-slate-900 dark:text-white transition-colors"
              >
                {t("login_forgot")}
              </Link>
            </div>
            <div className="relative">
              <input
                type={lihatPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg pl-4 pr-12 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:bg-slate-900 focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all disabled:opacity-50"
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



          {/* LOGIN BUTTON */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-slate-800 to-slate-900 text-white text-sm font-semibold py-3 rounded-lg hover:from-slate-900 hover:to-slate-900 transition-all shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">
                  progress_activity
                </span>
                <span>{t("login_verifying")}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">login</span>
                <span>{t("login_btn")}</span>
              </>
            )}
          </button>
        </form>

        {/* FOOTER - SIGN UP LINK */}
        <div className="text-center pt-2 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {t("login_no_account")}{" "}
            <Link
              href="/register"
              className="font-semibold text-slate-800 dark:text-slate-100 hover:text-slate-900 dark:text-white transition-colors"
            >
              {t("login_register_link")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
