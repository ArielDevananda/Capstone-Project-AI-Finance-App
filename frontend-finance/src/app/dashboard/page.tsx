"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { toast } from "react-hot-toast";
import { usePreferences } from "@/context/PreferencesContext";
import {
  KATEGORI_PENGELUARAN,
  KATEGORI_PEMASUKAN,
  getKategoriLabel,
  getKategoriUI,
  formatCurrency,
  formatNominalInput,
  parseNominalInput,
  formatTanggal,
  API_BASE_URL,
  NAMA_BULAN,
  type Transaksi,
} from "@/lib/constants";
import { TranslationKey } from "@/lib/translations";
import { useTheme } from "next-themes";

export default function Dashboard() {
  const { user } = useAuth();
  const { currency, t, language } = usePreferences();
  const { theme, resolvedTheme } = useTheme();
  
  // Detects active dark mode based on explicit or resolved system preferences
  const isDark = theme === "dark" || resolvedTheme === "dark";

  const [jenis, setJenis] = useState("pengeluaran");
  const [nominal, setNominal] = useState("");
  const [kategori, setKategori] = useState("makanan");
  const [deskripsi, setDeskripsi] = useState("");
  const [tanggal, setTanggal] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [bulanAktif, setBulanAktif] = useState(new Date().getMonth() + 1);
  const [tahunAktif, setTahunAktif] = useState(new Date().getFullYear());

  const [daftarTransaksi, setDaftarTransaksi] = useState<Transaksi[]>([]);
  const [totalPengeluaran, setTotalPengeluaran] = useState(0);
  const [totalSaldo, setTotalSaldo] = useState(0);
  const [totalPemasukan, setTotalPemasukan] = useState(0);

  const [editId, setEditId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- STATE FOR 6-MONTH TREND CHART ---
  const [dataTren, setDataTren] = useState<{ bulan: string; Pemasukan: number; Pengeluaran: number }[]>([]);

  // Ensures the selected category is always valid for the active transaction type (income/expense)
  useEffect(() => {
    const validOptions = jenis === "pengeluaran" ? KATEGORI_PENGELUARAN : KATEGORI_PEMASUKAN;
    const isValid = validOptions.some((kat) => kat.value === kategori);
    
    // If the current category doesn't exist in the valid options list,
    // reset it to the first valid option. This handles type switching
    // and edge cases with corrupted historical data.
    if (!isValid) {
      setKategori(validOptions[0].value);
    }
  }, [jenis, kategori]);

  /**
   * Chart Data Aggregator
   * Filters transactions by 'expense' and groups them by category.
   * Calculates the total nominal value for each category to render the PieChart.
   */
  const dataGrafik = KATEGORI_PENGELUARAN.map((kat) => ({
    name: t(`cat_${kat.value}` as TranslationKey),
    value: daftarTransaksi
      .filter((t) => t.kategori === kat.value && t.jenis === "pengeluaran")
      .reduce((sum, item) => sum + item.nominal, 0),
    color: kat.chartColor,
  })).filter((item) => item.value > 0);

  const tarikDataTransaksi = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/transaksi?bulan=${bulanAktif}&tahun=${tahunAktif}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        console.error(`API Error: ${response.status}`);
        return;
      }

      const data = await response.json();

      if (data.status === "success") {
        setDaftarTransaksi(data.data);

        let hitungPengeluaran = 0;
        let hitungPemasukan = 0;

        data.data.forEach((item: Transaksi) => {
          if (item.jenis === "pemasukan") {
            hitungPemasukan += item.nominal;
          } else {
            hitungPengeluaran += item.nominal;
          }
        });

        setTotalPengeluaran(hitungPengeluaran);
        setTotalPemasukan(hitungPemasukan);
        setTotalSaldo(hitungPemasukan - hitungPengeluaran);
      }
      // Refresh bar chart data when fetching transaction data
      fetchTren();
    } catch (error) {
      console.error("Gagal memuat data transaksi:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    tarikDataTransaksi();
  }, [bulanAktif, tahunAktif]);

  /**
   * Fetches the 6-month historical trend data for the BarChart.
   * Maps numerical months to their abbreviated string representations 
   * based on the active language setting.
   */
  const fetchTren = async () => {
    const bulanSingkatId = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const bulanSingkatEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const bulanSingkat = language === "en" ? bulanSingkatEn : bulanSingkatId;

    try {
      const response = await fetch(`${API_BASE_URL}/api/transaksi/tren?months=6`, {
        credentials: "include",
      });
      
      if (response.ok) {
        const json = await response.json();
        if (json.status === "success") {
          const mappedData = json.data.map((item: any) => ({
            bulan: bulanSingkat[item.bulan - 1],
            Pemasukan: item.pemasukan,
            Pengeluaran: item.pengeluaran
          }));
          setDataTren(mappedData);
        }
      }
    } catch (error) {
      console.error("Gagal memuat tren transaksi:", error);
    }
  };

  useEffect(() => {
    fetchTren();
  }, [language]);

  const handleKlikEdit = (item: Transaksi) => {
    setNominal(formatNominalInput(String(item.nominal)));
    setKategori(item.kategori);
    setJenis(item.jenis);
    setDeskripsi(item.deskripsi || "");
    if (item.tanggal) {
      setTanggal(item.tanggal.split(" ")[0]);
    }
    setEditId(item.id);
  };

  const batalEdit = () => {
    setNominal("");
    setJenis("pengeluaran");
    setKategori(KATEGORI_PENGELUARAN[0].value);
    setDeskripsi("");
    const today = new Date();
    setTanggal(today.toISOString().split("T")[0]);
    setEditId(null);
  };

  const handleHapus = async (id: number) => {
    const yakin = window.confirm("Yakin ingin menghapus transaksi ini?");
    if (!yakin) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/transaksi/${id}`,
        { method: "DELETE", credentials: "include" }
      );
      if (response.ok) {
        toast.success(language === "id" ? "Transaksi berhasil dihapus!" : "Transaction deleted successfully!");
        tarikDataTransaksi();
      }
    } catch (error) {
      console.error(error);
      toast.error(language === "id" ? "Gagal menghapus transaksi!" : "Failed to delete transaction!");
    }
  };

  const handleSimpan = async () => {
    if (!nominal) return toast.error(t("amount") + " tidak boleh kosong!");
    if (!tanggal) return toast.error(t("date") + " wajib diisi!");

    const parsedNominal = parseInt(parseNominalInput(nominal) || "0");
    if (parsedNominal <= 0) return toast.error(language === "id" ? "Nominal harus lebih dari 0!" : "Amount must be greater than 0!");

    const payloadData = {
      jenis,
      nominal: parsedNominal,
      kategori,
      deskripsi,
      tanggal,
    };

    try {
      if (editId) {
        const response = await fetch(
          `${API_BASE_URL}/api/transaksi/${editId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payloadData),
          }
        );

        if (response.ok) {
          toast.success(language === "id" ? "Transaksi berhasil diperbarui!" : "Transaction updated successfully!");
          batalEdit();
          tarikDataTransaksi();
        } else {
          toast.error(language === "id" ? "Gagal memperbarui data!" : "Failed to update data!");
        }
      } else {
        const response = await fetch(`${API_BASE_URL}/api/tambah`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payloadData),
        });

        if (response.ok) {
          toast.success(language === "id" ? "Transaksi berhasil disimpan!" : "Transaction saved successfully!");
          setNominal("");
          setDeskripsi("");
          tarikDataTransaksi();
        } else {
          toast.error(language === "id" ? "Gagal menyimpan data!" : "Failed to save data!");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(language === "id" ? "Koneksi ke server terputus!" : "Connection to server lost!");
    }
  };

  // Calculate the percentage of total expenses vs active budget limit
  const persenPengeluaran = totalPemasukan > 0
    ? Math.round((totalPengeluaran / totalPemasukan) * 100)
    : 0;
  const persenSisa = totalPemasukan > 0 ? Math.max(0, 100 - persenPengeluaran) : 0;

  if (isLoading) {
    return (
      <main className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div className="h-8 w-72 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
            <div className="h-4 w-56 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="h-10 w-48 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              </div>
              <div className="h-4 w-28 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-7 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm h-96 animate-pulse" />
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm h-96 animate-pulse" />
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm h-80 animate-pulse" />
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-8xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            {t("hello")}, {user?.nama || "User"}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {t("monthly_summary")}
          </p>
        </div>


      </div>

      {/* --- 3 SUMMARY CARDS (sesuai mockup) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Card 1: Total Anggaran/Pemasukan */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">
                account_balance
              </span>
            </div>

          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {t("income")}
          </p>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">
            {formatCurrency(totalPemasukan, currency)}
          </h2>
        </div>

        {/* Card 2: Sisa Anggaran / Saldo */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-600">
                savings
              </span>
            </div>

          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {t("total_balance")}
          </p>
          <h2 className={`text-2xl font-bold mt-1 ${totalSaldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {totalSaldo < 0 ? "-" : ""}{formatCurrency(Math.abs(totalSaldo), currency)}
          </h2>
          <p className={`text-xs mt-2 flex items-center gap-1 ${totalSaldo < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            <span className="material-symbols-outlined text-sm">{totalSaldo < 0 ? 'warning' : 'trending_up'}</span>
            {totalSaldo < 0 ? t("deficit") : `${persenSisa}% ${t("remaining")}`}
          </p>
        </div>

        {/* Card 3: Total Pengeluaran */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/40 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-rose-600">
                receipt_long
              </span>
            </div>

          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {t("expense")}
          </p>
          <h2 className="text-2xl font-bold text-rose-600 mt-1">
            {formatCurrency(totalPengeluaran, currency)}
          </h2>
          <p className="text-xs text-rose-500 mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">trending_down</span>
            {persenPengeluaran}% {t("used")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* --- EXPENSE INPUT (bottom left per mockup) --- */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-emerald-600">
                  {editId ? "edit_note" : "add_circle"}
                </span>
                {editId ? t("edit_transaction") : t("add_transaction")}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                {editId ? t("edit_desc") : t("add_desc")}
              </p>

              <form className="space-y-4">
                {/* Toggle Jenis */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setJenis("pengeluaran")}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      jenis === "pengeluaran"
                        ? "bg-white dark:bg-slate-900 shadow-sm text-rose-600"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {t("expense")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setJenis("pemasukan")}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      jenis === "pemasukan"
                        ? "bg-white dark:bg-slate-900 shadow-sm text-emerald-600"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {t("income")}
                  </button>
                </div>

                <div>
                  <label htmlFor="tanggal" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 uppercase tracking-wide">
                    {t("date")}
                  </label>
                  <input
                    type="date"
                    id="tanggal"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 outline-none bg-white dark:bg-slate-900 transition-all focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label htmlFor="kategori" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 uppercase tracking-wide">
                    {t("category")}
                  </label>
                  <select
                    id="kategori"
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 outline-none bg-white dark:bg-slate-900 transition-all"
                  >
                    {(jenis === "pengeluaran"
                      ? KATEGORI_PENGELUARAN
                      : KATEGORI_PEMASUKAN
                    ).map((kat) => (
                      <option key={kat.value} value={kat.value}>
                        {t(`cat_${kat.value}` as any)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="deskripsi" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 uppercase tracking-wide">
                    {t("description")} <span className="text-slate-400 font-normal">({t("optional")})</span>
                  </label>
                  <input
                    type="text"
                    id="deskripsi"
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition-all"
                    placeholder={t("note")}
                  />
                </div>

                <div>
                  <label htmlFor="nominal" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1 uppercase tracking-wide">
                    {t("amount")}
                  </label>
                  <input
                    type="text"
                    id="nominal"
                    value={nominal}
                    onChange={(e) => setNominal(formatNominalInput(e.target.value))}
                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none transition-all"
                    placeholder="0"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSimpan}
                  className={`w-full text-white font-medium py-3 rounded-lg transition-colors shadow-md flex items-center justify-center gap-2 active:scale-95 ${
                    editId
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white"
                  }`}
                >
                  {editId ? t("update_transaction") : t("save_expense")}
                </button>
                {editId && (
                  <button
                    type="button"
                    onClick={batalEdit}
                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium py-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                  >
                    {t("cancel")}
                  </button>
                )}
              </form>
            </div>
        </div>

        {/* --- RIGHT SIDEBAR: CHARTS --- */}
        <div className="lg:h-0 lg:min-h-full">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col h-full">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-slate-400">
                pie_chart
              </span>
              {t("expense_by_category")}
            </h3>

            <div className="flex-1 min-h-0 relative flex flex-col items-center justify-start pt-4">
              {dataGrafik.length === 0 ? (
                <p className="text-slate-400 text-sm text-center">
                  {t("no_data")}
                </p>
              ) : (
                <>
                  <div className="h-64 w-full shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dataGrafik}
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {dataGrafik.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => {
                            const percent = totalPengeluaran > 0 ? ((Number(value) / totalPengeluaran) * 100).toFixed(1) : "0";
                            return [`${formatCurrency(Number(value), currency)} (${percent}%)`, name];
                          }}
                          contentStyle={{
                            borderRadius: "12px",
                            border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                            background: isDark ? "#1e293b" : "#ffffff",
                            color: isDark ? "#f8fafc" : "#0f172a",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                            fontSize: "13px",
                          }}
                          itemStyle={{ color: isDark ? "#f8fafc" : "#0f172a" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Custom Scrollable Legend */}
                  <div className="w-full mt-4 overflow-y-auto flex-1 min-h-0 px-2 custom-scrollbar">
                    <ul className="space-y-2">
                      {dataGrafik.map((entry, index) => {
                        const percent = totalPengeluaran > 0 ? ((entry.value / totalPengeluaran) * 100).toFixed(1) : "0";
                        return (
                          <li key={index} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                              <span className="truncate text-slate-600 dark:text-slate-300 font-medium" title={entry.name}>
                                {entry.name}
                              </span>
                            </div>
                            <span className="text-slate-500 font-semibold pl-2">
                              {percent}%
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- BARCHART: LAST 6 MONTHS TREND --- */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-400">
            bar_chart
          </span>
          {t("trend_6_months")}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{t("trend_desc") || "Perbandingan pemasukan dan pengeluaran bulanan."}</p>

        <div className="h-72 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dataTren}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#e2e8f0"} />
              <XAxis dataKey="bulan" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? "#94a3b8" : "#64748b" }} dy={10} />
              <YAxis
                tickFormatter={(value: number) => {
                  if (value === 0) return "0";
                  if (currency === "USD") return `$${(value / 15000 / 1000).toFixed(1)}k`;
                  return `Rp ${(value / 1_000_000).toFixed(0)}jt`;
                }}
                tick={{ fontSize: 11, fill: isDark ? "#94a3b8" : "#64748b" }}
                axisLine={false}
                tickLine={false}
                width={64}
              />
              <Tooltip
                formatter={(value: any, name: any) => [
                  formatCurrency(Number(value ?? 0), currency),
                  name,
                ]}
                contentStyle={{
                  borderRadius: "12px",
                  border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
                  background: isDark ? "#1e293b" : "#ffffff",
                  color: isDark ? "#f8fafc" : "#0f172a",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                  fontSize: "13px",
                }}
                itemStyle={{ color: isDark ? "#f8fafc" : "#0f172a" }}
                cursor={{ fill: isDark ? "rgba(51, 65, 85, 0.4)" : "rgba(226,232,240,0.4)" }}
              />
              <Legend
                wrapperStyle={{ 
                  fontSize: "13px", 
                  paddingTop: "12px",
                  color: isDark ? "#94a3b8" : "#475569"
                }}
              />
              <Bar
                dataKey="Pemasukan"
                name={t("income")}
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="Pengeluaran"
                name={t("expense")}
                fill="#f43f5e"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}
