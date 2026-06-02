"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import toast from "react-hot-toast";
import Link from "next/link";

export default function Register() {
  // --- FORM INPUT STATE ---
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [lihatPassword, setLihatPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // --- HOOKS ---
  // --- HOOKS ---
  const router = useRouter();
  const { register } = useAuth();
  const { t, language } = usePreferences();

  // --- REGISTER HANDLER ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Input validation
    if (!nama || !email || !password || !confirmPassword) {
      toast.error(t("reg_error_empty"));
      return;
    }

    if (password.length < 6) {
      toast.error(language === "id" ? "Password minimal 6 karakter!" : "Password must be at least 6 characters!");
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t("reg_error_match"));
      return;
    }

    if (!agreeTerms) {
      toast.error(language === "id" ? "Anda harus menyetujui syarat dan ketentuan!" : "You must agree to the terms and conditions!");
      return;
    }

    setIsLoading(true);

    try {
      // Call AuthContext register function
      await register(email, password, nama);
      toast.success(language === "id" ? "Akun berhasil dibuat! Silakan login." : "Account created successfully! Please login.");
      router.push("/login");
    } catch (error: any) {
      toast.error(error.message || (language === "id" ? "Gagal membuat akun!" : "Failed to create account!"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-12">
      {/* MAIN REGISTRATION CARD */}
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-8 space-y-6 transition-all duration-300 hover:shadow-2xl">
        {/* LOGO & BRAND */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-lg p-2">
            <img src="/logo.png" alt="WealthVision Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            {t("reg_title")}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t("reg_desc")}
          </p>
        </div>

        {/* FORM REGISTER */}
        <form onSubmit={handleRegister} className="space-y-4">
          {/* NAMA INPUT */}
          <div>
            <label
              htmlFor="nama"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-400">person</span> {t("reg_name_label")}
            </label>
            <input
              type="text"
              id="nama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder={t("reg_name_placeholder")}
              disabled={isLoading}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:bg-slate-900 focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all disabled:opacity-50"
            />
          </div>

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
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:bg-slate-900 focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all disabled:opacity-50"
            />
          </div>

          {/* PASSWORD INPUT */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-400">lock</span> {t("login_pass_label")}
            </label>
            <div className="relative">
              <input
                type={lihatPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                disabled={isLoading}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg pl-4 pr-12 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:bg-slate-900 focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all disabled:opacity-50"
              />
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

          {/* CONFIRM PASSWORD INPUT */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider mb-2"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-400">check</span> {t("reg_pass_confirm")}
            </label>
            <input
              type={lihatPassword ? "text" : "password"}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ketik ulang kata sandi"
              disabled={isLoading}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:bg-slate-900 focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all disabled:opacity-50"
            />
          </div>

          {/* AGREE TO TERMS */}
          <div className="flex items-start">
            <input
              type="checkbox"
              id="agree"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="w-4 h-4 mt-1 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 rounded focus:ring-slate-800 cursor-pointer"
            />
            <label
              htmlFor="agree"
              className="ml-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer select-none"
            >
              {language === "id" ? "Saya setuju dengan syarat dan ketentuan layanan WealthVision AI" : "I agree to the terms and conditions of WealthVision AI"}
            </label>
          </div>

          {/* REGISTER BUTTON */}
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
                <span>{t("reg_creating")}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                <span>{t("reg_btn")}</span>
              </>
            )}
          </button>
        </form>

        {/* FOOTER - SIGN IN LINK */}
        <div className="text-center pt-2 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {t("reg_has_account")}{" "}
            <Link
              href="/login"
              className="font-semibold text-slate-800 dark:text-slate-100 hover:text-slate-900 dark:text-white transition-colors"
            >
              {t("reg_login_link")}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
