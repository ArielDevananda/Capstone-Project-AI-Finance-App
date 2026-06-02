"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePreferences } from "@/context/PreferencesContext";

export default function FloatingAI() {
  const pathname = usePathname();
  const { language } = usePreferences();

  // 1. Hide the AI icon if currently on the AI Advisor, Settings, or Help pages
  if (
    pathname === "/ai-advisor" || 
    pathname === "/settings" || 
    pathname === "/help"
  ) {
    return null;
  }

  // 2. Determine contextual insights based on active page and language
  let insightTitle = "WealthVision AI";
  let insightText = language === "id" 
    ? "Butuh bantuan menganalisis keuangan Anda? Mari diskusikan bersama saya." 
    : "Need help analyzing your finances? Let's discuss it together.";
  let iconName = "smart_toy";
  let defaultPrompt = language === "id"
    ? "Halo AI, tolong bantu saya menganalisis kondisi keuangan saya."
    : "Hello AI, please help me analyze my financial condition.";

  if (pathname === "/dashboard") {
    insightTitle = "Insight Dashboard";
    insightText = language === "id"
      ? "Saya bisa menganalisis rasio pengeluaran vs pemasukan Anda bulan ini. Mau lihat laporannya?"
      : "I can analyze your expense vs income ratio this month. Want to see the report?";
    iconName = "monitoring";
    defaultPrompt = language === "id"
      ? "Tolong berikan ringkasan kesehatan keuangan saya berdasarkan dashboard bulan ini. Apakah rasio pengeluaran saya masih aman?"
      : "Please provide a summary of my financial health based on this month's dashboard. Is my expense ratio still safe?";
  } else if (pathname === "/budgeting") {
    insightTitle = "Insight Anggaran";
    insightText = language === "id"
      ? "Ada kategori yang sering over-budget? Saya bisa bantu buatkan rencana alokasi yang lebih ketat."
      : "Any categories frequently over-budget? I can help create a stricter allocation plan.";
    iconName = "account_balance_wallet";
    defaultPrompt = language === "id"
      ? "Tolong evaluasi batas anggaran (budget limits) yang baru saja saya atur. Apakah sudah seimbang dan ideal dengan pemasukan saya?"
      : "Please evaluate the budget limits I just set. Are they balanced and ideal for my income?";
  } else if (pathname === "/history") {
    insightTitle = "Insight Transaksi";
    insightText = language === "id"
      ? "Saya mendeteksi beberapa pola pengeluaran dari riwayat Anda. Ingin tahu kategori mana yang paling boros?"
      : "I detected some spending patterns from your history. Want to know which category is the most wasteful?";
    iconName = "receipt_long";
    defaultPrompt = language === "id"
      ? "Tolong analisis riwayat pengeluaran saya bulan ini. Kategori mana yang paling boros dan bagaimana cara menguranginya?"
      : "Please analyze my expense history this month. Which category is the most wasteful and how can I reduce it?";
  } else if (pathname === "/savings") {
    insightTitle = "Insight Tabungan";
    insightText = language === "id"
      ? "Target tabungan terasa berat? Mari diskusikan strategi 'Snowball' untuk mencapainya lebih cepat."
      : "Savings target feels heavy? Let's discuss the 'Snowball' strategy to achieve it faster.";
    iconName = "savings";
    defaultPrompt = language === "id"
      ? "Tolong evaluasi target tabungan saya saat ini dan berikan strategi yang bisa saya lakukan agar cepat tercapai."
      : "Please evaluate my current savings target and provide strategies I can use to achieve it quickly.";
  }

  const aiHref = `/ai-advisor?prompt=${encodeURIComponent(defaultPrompt)}`;

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4 group">
      
      {/* Smart Context Card (Appears on hover) */}
      <div className="w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex-col hidden md:flex opacity-0 group-hover:opacity-100 transition-all duration-300 absolute bottom-20 right-0 pointer-events-none group-hover:pointer-events-auto translate-y-4 group-hover:translate-y-0">
        
        {/* Header Insight */}
        <div className="p-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <span className="material-symbols-outlined text-[18px]">{iconName}</span>
          </div>
          <div>
            <h4 className="font-bold text-sm leading-tight">{insightTitle}</h4>
            <p className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold mt-0.5">Smart Spotlight</p>
          </div>
        </div>
        
        {/* Content Insight */}
        <div className="p-5 bg-white dark:bg-slate-900 flex flex-col gap-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {insightText}
          </p>
          
          <Link 
            href={aiHref} 
            className="w-full py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:border-slate-600 flex items-center justify-center gap-2 transition-colors"
          >
            {language === "id" ? "Diskusikan di AI Advisor" : "Discuss in AI Advisor"}
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Main FAB Button */}
      <Link href={aiHref} className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white shadow-[0_10px_25px_rgba(15,23,42,0.4)] hover:scale-105 transition-transform relative cursor-pointer group-hover:ring-4 ring-slate-400/30">
        <span className="material-symbols-outlined text-2xl animate-pulse">smart_toy</span>
      </Link>
      
    </div>
  );
}