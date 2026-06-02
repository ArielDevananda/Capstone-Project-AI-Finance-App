"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  KATEGORI_PENGELUARAN,
  getKategoriUI,
  getKategoriLabel,
  formatRupiah,
  formatCurrency,
  formatNominalInput,
  parseNominalInput,
  API_BASE_URL,
  NAMA_BULAN,
} from "@/lib/constants";
import { usePreferences } from "@/context/PreferencesContext";
import { TranslationKey } from "@/lib/translations";

type KategoriData = {
  id?: number;
  kategori: string;
  used: number;
  limit: number;
};

export default function Budgeting() {
  const [totalBudget, setTotalBudget] = useState("");
  const [anggaranData, setAnggaranData] = useState<KategoriData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bulanAktif, setBulanAktif] = useState(new Date().getMonth() + 1);
  const [tahunAktif, setTahunAktif] = useState(new Date().getFullYear());

  const handlePrevMonth = () => {
    if (bulanAktif === 1) {
      setBulanAktif(12);
      setTahunAktif(tahunAktif - 1);
    } else {
      setBulanAktif(bulanAktif - 1);
    }
  };

  const handleNextMonth = () => {
    if (bulanAktif === 12) {
      setBulanAktif(1);
      setTahunAktif(tahunAktif + 1);
    } else {
      setBulanAktif(bulanAktif + 1);
    }
  };
  const { t, language, currency } = usePreferences();


  // Modal state for deleting budget
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // API Fetching Strategy: Loads Budget Limits and Transactions in parallel
  const fetchData = async () => {
    try {
      setIsLoading(true);

      // 1. Fetch Budget Limits
      const resAngg = await fetch(
        `${API_BASE_URL}/api/anggaran?bulan=${bulanAktif}&tahun=${tahunAktif}`,
        { credentials: "include" }
      );
      const dataAngg = await resAngg.json();

      // 2. Fetch Transactions (Expenses)
      const resTrans = await fetch(
        `${API_BASE_URL}/api/transaksi?bulan=${bulanAktif}&tahun=${tahunAktif}`,
        { credentials: "include" }
      );
      const dataTrans = await resTrans.json();

      // Mapping: Aggregates total expenses grouped by category value
      const pemakaianPerKategori: Record<string, number> = {};

      if (dataTrans.data) {
        dataTrans.data.forEach((trx: any) => {
          if (trx.jenis === "pengeluaran") {
            pemakaianPerKategori[trx.kategori] =
              (pemakaianPerKategori[trx.kategori] || 0) + trx.nominal;
          }
        });
      }

      // Loads default categories dynamically from CONSTANTS to prevent hardcoded drift
      const defaultCategories = KATEGORI_PENGELUARAN.map((k) => k.value);
      const combinedData: KategoriData[] = [];
      const budgetDariDB: Record<string, { id: number; batas: number }> = {};

      // 1. Extracts active budget limits retrieved from the database
      if (dataAngg.data) {
        dataAngg.data.forEach((angg: any) => {
          budgetDariDB[angg.kategori] = {
            id: angg.id,
            batas: angg.batas,
          };
        });
      }

      // 2. Permanently maps all predefined default categories.
      // Resolves the "Dead End" bug: Prevents categories from being hidden if they lack transactions,
      // ensuring users can always allocate budgets without needing a "Add Category" button.
      defaultCategories.forEach((kat) => {
        combinedData.push({
          id: budgetDariDB[kat]?.id,
          kategori: kat,
          limit: budgetDariDB[kat]?.batas || 0,
          used: pemakaianPerKategori[kat] || 0,
        });
        delete budgetDariDB[kat];
      });

      // 3. Injects remaining custom or legacy categories found in the database
      Object.keys(budgetDariDB).forEach((customKat) => {
        combinedData.push({
          id: budgetDariDB[customKat].id,
          kategori: customKat,
          limit: budgetDariDB[customKat].batas,
          used: pemakaianPerKategori[customKat] || 0,
        });
      });

      setAnggaranData(combinedData);

      const fetchedTotal = combinedData.reduce((sum, k) => sum + k.limit, 0);
      setTotalBudget((prev) => {
        if (!prev) {
          return fetchedTotal > 0 ? formatNominalInput(fetchedTotal.toString()) : "";
        }
        return prev;
      });
    } catch (error) {
      toast.error(language === "id" ? "Gagal memuat data anggaran!" : "Failed to load budget data!");
    } finally {
      setIsLoading(false);
    }
  };

  // Distributes the Total Input Budget across all predefined categories via AI or fallback rules
  const handleSimpanAnggaran = async () => {
    const totalNum = Number(parseNominalInput(totalBudget));
    if (isNaN(totalNum) || totalNum <= 0) {
      toast.error(language === "id" ? "Total anggaran tidak valid!" : "Invalid total budget!");
      return;
    }

    const totalLimitSekarang = anggaranData.reduce((sum, k) => sum + k.limit, 0);
    let sisaTotalAnggaran = totalNum;

    // 50-30-20 Rule Initialization
    const needs = ['makanan', 'transportasi', 'tagihan', 'tempat_tinggal', 'kesehatan', 'pendidikan', 'cicilan', 'asuransi', 'keluarga'];
    const savings = ['tabungan', 'investasi'];
    
    const countNeeds = anggaranData.filter(k => needs.includes(k.kategori)).length || 1;
    const countSavings = anggaranData.filter(k => savings.includes(k.kategori)).length || 1;
    const countWants = anggaranData.filter(k => !needs.includes(k.kategori) && !savings.includes(k.kategori)).length || 1;

    try {
      for (let i = 0; i < anggaranData.length; i++) {
        const kat = anggaranData[i];
        const isLast = i === anggaranData.length - 1;
        let batasBaru = 0;
        
        if (isLast) {
          batasBaru = sisaTotalAnggaran;
        } else if (totalLimitSekarang === 0) {
          // 50-30-20 Distribution Logic
          if (needs.includes(kat.kategori)) {
            batasBaru = Math.floor((totalNum * 0.5) / countNeeds);
          } else if (savings.includes(kat.kategori)) {
            batasBaru = Math.floor((totalNum * 0.2) / countSavings);
          } else {
            batasBaru = Math.floor((totalNum * 0.3) / countWants);
          }
        } else {
          batasBaru = Math.floor((kat.limit / totalLimitSekarang) * totalNum);
        }

        sisaTotalAnggaran -= batasBaru;

        // Persists budget allocations to the backend
        await fetch(`${API_BASE_URL}/api/anggaran`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            kategori: kat.kategori,
            batas: batasBaru,
            bulan: bulanAktif,
            tahun: tahunAktif,
          }),
        });
      }

      toast.success(language === "id" ? "Anggaran bulanan berhasil disimpan!" : "Monthly budget saved successfully!");
      fetchData();
    } catch (error) {
      toast.error(language === "id" ? "Gagal menyimpan anggaran!" : "Failed to save budget!");
    }
  };

  const handleTriggerHapus = () => {
    setShowDeleteConfirm(true);
  };

  const executeHapusAnggaran = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/anggaran/reset?bulan=${bulanAktif}&tahun=${tahunAktif}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        toast.success(language === "id" ? "Anggaran bulanan berhasil dihapus!" : "Monthly budget deleted successfully!");
        setTotalBudget("");
        setShowDeleteConfirm(false);
        fetchData();
      } else {
        toast.error(language === "id" ? "Gagal menghapus anggaran!" : "Failed to delete budget!");
      }
    } catch (error) {
      toast.error(language === "id" ? "Koneksi ke server terputus!" : "Connection to server lost!");
    } finally {
      setIsDeleting(false);
    }
  };




  useEffect(() => {
    fetchData();
  }, [bulanAktif, tahunAktif]);

  // Calculates accumulated expenses and active budget limits
  const totalUsed = anggaranData.reduce((sum, k) => sum + k.used, 0);
  const totalLimit = anggaranData.reduce((sum, k) => sum + k.limit, 0);

  return (
    <>
    <main className="max-w-8xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            {t("budgeting_title")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
            {t("budgeting_desc")}
          </p>
        </div>

        {/* Month/Year Selector */}
        <div className="flex items-center justify-between md:justify-center gap-3 w-full md:w-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl shadow-sm">
          <button onClick={handlePrevMonth} className="p-1 rounded-md hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 min-w-[120px] text-center flex-1">
            {NAMA_BULAN[bulanAktif - 1]} {tahunAktif}
          </span>
          <button onClick={handleNextMonth} className="p-1 rounded-md hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Input Form Section */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="w-full md:flex-1">
            <label
              className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 uppercase tracking-wide"
              htmlFor="totalBudget"
            >
              {t("total_monthly_budget")}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 dark:text-slate-400 font-medium">
                Rp
              </span>
              <input
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-colors outline-none"
                id="totalBudget"
                name="totalBudget"
                type="text"
                value={totalBudget}
                onChange={(e) => setTotalBudget(formatNominalInput(e.target.value))}
              />
            </div>
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <button
              onClick={handleTriggerHapus}
              className="w-1/2 md:w-auto bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-semibold py-3 px-6 rounded-lg hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors shadow-sm"
            >
              {language === "id" ? "Hapus" : "Delete"}
            </button>
            <button
              onClick={handleSimpanAnggaran}
              className="w-1/2 md:w-auto bg-slate-900 dark:bg-indigo-600 text-white font-semibold py-3 px-8 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
            >
              {t("save_budget")}
            </button>
          </div>
        </div>

        {/* Overview bar: Single Status */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          
          {/* Status: Pengeluaran Nyata (Used vs Limits) */}
          {totalLimit > 0 ? (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {t("used")}: {formatCurrency(totalUsed, currency)} {t("from")} {formatCurrency(totalLimit, currency)}
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    totalUsed > totalLimit ? "bg-rose-500" : "bg-blue-500"
                  }`}
                  style={{
                    width: `${Math.min((totalUsed / totalLimit) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between text-sm mb-2 opacity-50">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {t("used")}: {formatCurrency(totalUsed, currency)} {t("from")} {formatCurrency(0, currency)}
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-200">0%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden opacity-50">
                <div className="h-full w-0 bg-slate-300" />
              </div>
            </div>
          )}

        </div>
      </section>

      {/* Category Grid Section */}
      <section>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
          {t("expense_categories")}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Loading display */}
          {isLoading && (
            <p className="text-slate-500 dark:text-slate-400">{t("loading_budget_data")}</p>
          )}

          {/* ITERATE FROM CONSTANTS */}
          {!isLoading &&
            anggaranData.map((cat, idx) => {
              const ui = getKategoriUI(cat.kategori);
              const isDefaultCategory = KATEGORI_PENGELUARAN.some(
                (kategori) => kategori.value === cat.kategori
              );

              const rawPercent =
                cat.limit > 0 ? (cat.used / cat.limit) * 100 : 0;
              const percentage = Math.min(rawPercent, 100);
              const isOver = rawPercent > 100;

              return (
                <article
                  key={idx}
                  className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 border flex flex-col gap-4 hover:shadow-md transition-shadow ${
                    isOver ? "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30/30" : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${ui.bgColor} ${ui.textColor}`}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {ui.icon}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        {isDefaultCategory 
                          ? t(`cat_${cat.kategori}` as TranslationKey) 
                          : getKategoriLabel(cat.kategori)}
                      </h3>
                    </div>

                  </div>

                  <div className="mt-2">
                    <div className="flex justify-between text-sm mb-2">
                      <span
                        className={
                          isOver
                            ? "text-rose-600 font-medium"
                            : "text-slate-500 dark:text-slate-400"
                        }
                      >
                        {t("used")}: {formatCurrency(cat.used, currency)}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {t("limit")}: {formatCurrency(cat.limit, currency)}
                      </span>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver ? "bg-rose-50 dark:bg-rose-900/300" : ui.fillBar
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {/* Warning if exceeding limit */}
                    {isOver && (
                      <p className="text-xs text-rose-500 mt-2 font-medium">
                        {t("over_limit_warning")}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}

        </div>
      </section>
    </main>


      {/* === DELETE CONFIRMATION MODAL === */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label={language === "id" ? "Tutup konfirmasi hapus" : "Close delete confirmation"}
            onClick={() => setShowDeleteConfirm(false)}
            disabled={isDeleting}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm disabled:cursor-not-allowed"
          />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-rose-100 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6">
              <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-rose-600 text-[30px]">
                  delete_forever
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {language === "id" ? "Hapus seluruh anggaran?" : "Delete all budgets?"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {language === "id" 
                  ? `Seluruh rencana anggaran bulan ${NAMA_BULAN[bulanAktif - 1]} ${tahunAktif} akan dihapus secara permanen.` 
                  : `All budget limits for ${NAMA_BULAN[bulanAktif - 1]} ${tahunAktif} will be permanently deleted.`}
              </p>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  onClick={executeHapusAnggaran}
                  disabled={isDeleting}
                  className="flex-1 bg-rose-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-rose-700 transition-colors shadow-sm shadow-rose-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {language === "id" ? "Menghapus..." : "Deleting..."}
                    </>
                  ) : (
                    language === "id" ? "Ya, Hapus" : "Yes, Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
