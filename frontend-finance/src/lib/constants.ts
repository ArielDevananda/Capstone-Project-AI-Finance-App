// =============================================================
// SINGLE SOURCE OF TRUTH — WealthVision AI Transaction Categories
// =============================================================
// All pages (Dashboard, Expenses, Budgeting) MUST import from this file.
// DO NOT hardcode categories elsewhere.
// =============================================================

export interface KategoriConfig {
  value: string;
  label: string;
  icon: string;
  bgColor: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
  fillBar: string;
  chartColor: string;
}

export const KATEGORI_PENGELUARAN: KategoriConfig[] = [
  {
    value: "makanan",
    label: "Makanan & Minuman",
    icon: "restaurant",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/40",
    textColor: "text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-emerald-100 dark:bg-emerald-900/40",
    badgeText: "text-emerald-700 dark:text-emerald-400",
    fillBar: "bg-emerald-500",
    chartColor: "#10b981",
  },
  {
    value: "transportasi",
    label: "Transportasi",
    icon: "directions_car",
    bgColor: "bg-blue-100 dark:bg-blue-900/40",
    textColor: "text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-100 dark:bg-blue-900/40",
    badgeText: "text-blue-700 dark:text-blue-400",
    fillBar: "bg-blue-500",
    chartColor: "#3b82f6",
  },
  {
    value: "hiburan",
    label: "Hiburan",
    icon: "movie",
    bgColor: "bg-rose-100 dark:bg-rose-900/40",
    textColor: "text-rose-600 dark:text-rose-400",
    badgeBg: "bg-rose-100 dark:bg-rose-900/40",
    badgeText: "text-rose-700 dark:text-rose-400",
    fillBar: "bg-rose-500",
    chartColor: "#f43f5e",
  },
  {
    value: "tagihan",
    label: "Tagihan & Utilitas",
    icon: "receipt_long",
    bgColor: "bg-amber-100 dark:bg-amber-900/40",
    textColor: "text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-100 dark:bg-amber-900/40",
    badgeText: "text-amber-700 dark:text-amber-400",
    fillBar: "bg-amber-500",
    chartColor: "#f59e0b",
  },
  {
    value: "tempat_tinggal",
    label: "Tempat Tinggal",
    icon: "home",
    bgColor: "bg-slate-200 dark:bg-slate-700",
    textColor: "text-slate-800 dark:text-slate-100",
    badgeBg: "bg-slate-200 dark:bg-slate-700",
    badgeText: "text-slate-900 dark:text-white",
    fillBar: "bg-slate-950",
    chartColor: "#6366f1",
  },
  {
    value: "kesehatan",
    label: "Kesehatan",
    icon: "medical_services",
    bgColor: "bg-violet-100 dark:bg-violet-900/30",
    textColor: "text-violet-600 dark:text-violet-400",
    badgeBg: "bg-violet-100 dark:bg-violet-900/30",
    badgeText: "text-violet-700 dark:text-violet-300",
    fillBar: "bg-violet-500",
    chartColor: "#7c3aed",
  },
  {
    value: "belanja",
    label: "Belanja",
    icon: "shopping_bag",
    bgColor: "bg-pink-100",
    textColor: "text-pink-600",
    badgeBg: "bg-pink-100",
    badgeText: "text-pink-700",
    fillBar: "bg-pink-500",
    chartColor: "#ec4899",
  },
  {
    value: "pendidikan",
    label: "Pendidikan",
    icon: "school",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/40",
    textColor: "text-cyan-600 dark:text-cyan-400",
    badgeBg: "bg-cyan-100 dark:bg-cyan-900/40",
    badgeText: "text-cyan-700 dark:text-cyan-400",
    fillBar: "bg-cyan-500",
    chartColor: "#06b6d4",
  },
  {
    value: "cicilan",
    label: "Cicilan & Utang",
    icon: "credit_card",
    bgColor: "bg-orange-100 dark:bg-orange-900/40",
    textColor: "text-orange-600 dark:text-orange-400",
    badgeBg: "bg-orange-100 dark:bg-orange-900/40",
    badgeText: "text-orange-700 dark:text-orange-400",
    fillBar: "bg-orange-500",
    chartColor: "#f97316",
  },
  {
    value: "tabungan",
    label: "Tabungan & Investasi",
    icon: "savings",
    bgColor: "bg-teal-100 dark:bg-teal-900/40",
    textColor: "text-teal-600 dark:text-teal-400",
    badgeBg: "bg-teal-100 dark:bg-teal-900/40",
    badgeText: "text-teal-700 dark:text-teal-400",
    fillBar: "bg-teal-500",
    chartColor: "#14b8a6",
  },
  {
    value: "keluarga",
    label: "Keluarga & Anak",
    icon: "family_restroom",
    bgColor: "bg-fuchsia-100 dark:bg-fuchsia-900/40",
    textColor: "text-fuchsia-600 dark:text-fuchsia-400",
    badgeBg: "bg-fuchsia-100 dark:bg-fuchsia-900/40",
    badgeText: "text-fuchsia-700 dark:text-fuchsia-400",
    fillBar: "bg-fuchsia-500",
    chartColor: "#d946ef",
  },
  {
    value: "zakat_donasi",
    label: "Zakat & Donasi",
    icon: "volunteer_activism",
    bgColor: "bg-red-100 dark:bg-red-900/40",
    textColor: "text-red-600 dark:text-red-400",
    badgeBg: "bg-red-100 dark:bg-red-900/40",
    badgeText: "text-red-700 dark:text-red-400",
    fillBar: "bg-red-500",
    chartColor: "#ef4444",
  },
  {
    value: "asuransi",
    label: "Asuransi & Pajak",
    icon: "health_and_safety",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/40",
    textColor: "text-indigo-600 dark:text-indigo-400",
    badgeBg: "bg-indigo-100 dark:bg-indigo-900/40",
    badgeText: "text-indigo-700 dark:text-indigo-400",
    fillBar: "bg-indigo-500",
    chartColor: "#6366f1",
  },
  {
    value: "lainnya",
    label: "Lainnya",
    icon: "more_horiz",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    textColor: "text-slate-600 dark:text-slate-300",
    badgeBg: "bg-slate-100 dark:bg-slate-800",
    badgeText: "text-slate-700 dark:text-slate-200",
    fillBar: "bg-slate-500",
    chartColor: "#64748b",
  },
];

export type KategoriPemasukanConfig = KategoriConfig;

export const KATEGORI_PEMASUKAN: KategoriPemasukanConfig[] = [
  { value: "gaji", label: "Gaji / Upah", icon: "payments", bgColor: "bg-emerald-100 dark:bg-emerald-900/40", textColor: "text-emerald-600 dark:text-emerald-400", badgeBg: "bg-emerald-100 dark:bg-emerald-900/40", badgeText: "text-emerald-700 dark:text-emerald-400", fillBar: "bg-emerald-500", chartColor: "#10b981" },
  { value: "bonus", label: "Bonus", icon: "redeem", bgColor: "bg-blue-100 dark:bg-blue-900/40", textColor: "text-blue-600 dark:text-blue-400", badgeBg: "bg-blue-100 dark:bg-blue-900/40", badgeText: "text-blue-700 dark:text-blue-400", fillBar: "bg-blue-500", chartColor: "#3b82f6" },
  { value: "investasi", label: "Hasil Investasi", icon: "trending_up", bgColor: "bg-slate-200 dark:bg-slate-700", textColor: "text-slate-800 dark:text-slate-100", badgeBg: "bg-slate-200 dark:bg-slate-700", badgeText: "text-slate-900 dark:text-white", fillBar: "bg-slate-950", chartColor: "#6366f1" },
  { value: "pemberian", label: "Pemberian / Hadiah", icon: "featured_seasonal_and_gifts", bgColor: "bg-pink-100 dark:bg-pink-900/40", textColor: "text-pink-600 dark:text-pink-400", badgeBg: "bg-pink-100 dark:bg-pink-900/40", badgeText: "text-pink-700 dark:text-pink-400", fillBar: "bg-pink-500", chartColor: "#ec4899" },
  { value: "penjualan", label: "Hasil Penjualan", icon: "storefront", bgColor: "bg-amber-100 dark:bg-amber-900/40", textColor: "text-amber-600 dark:text-amber-400", badgeBg: "bg-amber-100 dark:bg-amber-900/40", badgeText: "text-amber-700 dark:text-amber-400", fillBar: "bg-amber-500", chartColor: "#f59e0b" },
  { value: "lainnya", label: "Lainnya", icon: "add_circle", bgColor: "bg-slate-100 dark:bg-slate-800", textColor: "text-slate-600 dark:text-slate-300", badgeBg: "bg-slate-100 dark:bg-slate-800", badgeText: "text-slate-700 dark:text-slate-200", fillBar: "bg-slate-500", chartColor: "#64748b" },
];

// --- HELPER FUNCTIONS ---

/**
 * Get display label from category value.
 * Example: "makanan" → "Makanan & Minuman"
 */
export function getKategoriLabel(value: string): string {
  const allKategori = [...KATEGORI_PENGELUARAN, ...KATEGORI_PEMASUKAN];
  const found = allKategori.find((k) => k.value === value);
  return found?.label || value;
}

/**
 * Get full UI configuration for expenditure category.
 * If not found, return default configuration (gray).
 */
export function getKategoriUI(value: string): KategoriConfig {
  const allKategori = [...KATEGORI_PENGELUARAN, ...KATEGORI_PEMASUKAN];
  const found = allKategori.find((k) => k.value === value);
  return (
    found || {
      value,
      label: value,
      icon: "category",
      bgColor: "bg-slate-100 dark:bg-slate-800",
      textColor: "text-slate-600 dark:text-slate-300",
      badgeBg: "bg-slate-100 dark:bg-slate-800",
      badgeText: "text-slate-700 dark:text-slate-200",
      fillBar: "bg-slate-500",
      chartColor: "#64748b",
    }
  );
}

/**
 * Type for transaction data from API.
 */
export interface Transaksi {
  id: number;
  jenis: string;
  nominal: number;
  kategori: string;
  deskripsi: string;
  tanggal: string;
}

/**
 * Month names in Indonesian.
 */
export const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/**
 * Format number to Rupiah format: 1500000 → "1.500.000"
 */
export function formatRupiah(value: number): string {
  return value.toLocaleString("id-ID");
}

/**
 * Format currency dynamically based on user preference.
 * If USD, assume value is divided by 15.000 (mock conversion).
 */
export function formatCurrency(value: number, currencyCode: string = "IDR"): string {
  if (isNaN(value)) return "Rp 0";
  if (currencyCode === "USD") {
    const converted = value / 15000;
    return `$ ${converted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `Rp ${value.toLocaleString("id-ID")}`;
}

/**
 * Format input string into string with thousand separators.
 * Example: "1000000" -> "1.000.000"
 */
export function formatNominalInput(value: string): string {
  if (!value) return "";
  // Remove dots and other non-digit characters
  const numericString = value.replace(/\D/g, "");
  if (!numericString) return "";
  
  // Reformat with thousands separators
  return new Intl.NumberFormat("id-ID").format(parseInt(numericString, 10));
}

/**
 * Convert formatted string back into number.
 * Example: "1.000.000" -> "1000000"
 */
export function parseNominalInput(value: string): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

/**
 * Format date from "YYYY-MM-DD HH:MM:SS" to "12 Oct 2023"
 */
export function formatTanggal(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    // Ensure a numeric string is returned without currency formatting
    const d = new Date(dateStr.replace(/\s/g, "T"));
    if (isNaN(d.getTime())) return dateStr;
    const bulanSingkat = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    return `${d.getDate()} ${bulanSingkat[d.getMonth()]} ${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Base URL untuk API backend.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
