"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatRupiah, formatCurrency, formatNominalInput, parseNominalInput, API_BASE_URL } from "@/lib/constants";
import { usePreferences } from "@/context/PreferencesContext";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SavingsForm {
  namaGoal: string;
  targetAmount: string;
  currentSavings: string;
  monthlyIncome: string;
  monthlyExpenses: string;
  deadline: string; // "YYYY-MM"
}

interface SavingsGoal extends SavingsForm {
  id: number;
  aiPlan: string;
  status: "active" | "completed" | "paused";
  updated_at?: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getMonthsRemaining(deadline: string): number {
  if (!deadline) return 0;
  const [year, month] = deadline.split("-").map(Number);
  const now = new Date();
  const diff =
    (year - now.getFullYear()) * 12 + (month - (now.getMonth() + 1));
  return Math.max(0, diff);
}

// Minimum deadline = current month + 1
function getMinDeadline(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function SavingsGoalPage() {
  const { t, language, currency } = usePreferences();

  const PRESETS = [
    {
      label: t("savings_emergency_fund"),
      icon: "shield",
      namaGoal: t("savings_emergency_fund"),
      targetAmount: 30000000,
      hint: language === "id" ? "3–6x gaji bulanan" : "3-6x monthly salary",
    },
    {
      label: t("savings_vacation"),
      icon: "travel_explore",
      namaGoal: t("savings_vacation"),
      targetAmount: 10000000,
      hint: language === "id" ? "Liburan impian" : "Dream vacation",
    },
    {
      label: t("savings_new_gadget"),
      icon: "devices",
      namaGoal: t("savings_new_gadget"),
      targetAmount: 15000000,
      hint: language === "id" ? "Upgrade perangkat" : "Device upgrade",
    },
    {
      label: t("savings_investment"),
      icon: "trending_up",
      namaGoal: t("savings_investment"),
      targetAmount: 5000000,
      hint: language === "id" ? "Modal awal investasi" : "Initial investment capital",
    },
  ];

  const [form, setForm] = useState<SavingsForm>({
    namaGoal: "",
    targetAmount: "",
    currentSavings: "",
    monthlyIncome: "",
    monthlyExpenses: "",
    deadline: "",
  });

  const [aiResult, setAiResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [isLoadingGoals, setIsLoadingGoals] = useState(true);
  const [goalToDelete, setGoalToDelete] = useState<SavingsGoal | null>(null);
  const [isDeletingGoal, setIsDeletingGoal] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const streamTextRef = useRef("");

  // ── Derived stats ────────────────────────────────────────────────────────────

  const target = Number(parseNominalInput(form.targetAmount)) || 0;
  const current = Number(parseNominalInput(form.currentSavings)) || 0;
  const income = Number(parseNominalInput(form.monthlyIncome)) || 0;
  const expenses = Number(parseNominalInput(form.monthlyExpenses)) || 0;
  const monthsLeft = getMonthsRemaining(form.deadline);
  const remaining = Math.max(0, target - current);
  const percentage = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const monthlySurplus = income - expenses;
  const monthlyNeeded = monthsLeft > 0 ? remaining / monthsLeft : remaining;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const fetchGoals = async () => {
    setIsLoadingGoals(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/savings-goals`, {
        credentials: "include",
      });
      const data = await response.json();

      if (response.ok && data.status === "success") {
        setGoals(data.data || []);
      }
    } catch (error) {
      console.error("Gagal memuat goal tabungan:", error);
      toast.error(language === "id" ? "Gagal memuat daftar goal tabungan." : "Failed to load savings goals.");
    } finally {
      setIsLoadingGoals(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const resetPlanner = () => {
    setForm({
      namaGoal: "",
      targetAmount: "",
      currentSavings: "",
      monthlyIncome: "",
      monthlyExpenses: "",
      deadline: "",
    });
    setAiResult("");
    setSelectedGoalId(null);
  };

  const handlePreset = (preset: { label: string; icon: string; namaGoal: string; targetAmount: number; hint: string }) => {
    setForm((prev) => ({
      ...prev,
      namaGoal: preset.namaGoal,
      targetAmount: formatNominalInput(preset.targetAmount.toString()),
    }));
    setSelectedGoalId(null);
    toast.success(language === "id" ? `Preset "${preset.label}" diterapkan!` : `Preset "${preset.label}" applied!`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const nominalFields = ["targetAmount", "currentSavings", "monthlyIncome", "monthlyExpenses"];
    setForm((prev) => ({
      ...prev,
      [name]: nominalFields.includes(name) ? formatNominalInput(value) : value,
    }));
  };

  const handleSelectGoal = (goal: SavingsGoal) => {
    setSelectedGoalId(goal.id);
    setForm({
      namaGoal: goal.namaGoal,
      targetAmount: formatNominalInput(goal.targetAmount.toString()),
      currentSavings: formatNominalInput(goal.currentSavings.toString()),
      monthlyIncome: formatNominalInput(goal.monthlyIncome.toString()),
      monthlyExpenses: formatNominalInput(goal.monthlyExpenses.toString()),
      deadline: goal.deadline,
    });
    setAiResult(goal.aiPlan || "");
    toast.success(language === "id" ? `Goal "${goal.namaGoal}" dibuka.` : `Goal "${goal.namaGoal}" opened.`);
  };

  const saveGoal = async (planText = aiResult) => {
    if (!form.namaGoal.trim()) {
      toast.error(language === "id" ? "Nama goal tabungan wajib diisi." : "Savings goal name is required.");
      return null;
    }
    if (!target || target <= 0) {
      toast.error(language === "id" ? "Target tabungan harus lebih dari 0." : "Target savings must be greater than 0.");
      return null;
    }
    if (!form.deadline) {
      toast.error(language === "id" ? "Pilih deadline bulan terlebih dahulu." : "Please select a target month first.");
      return null;
    }

    setIsSavingGoal(true);
    try {
      const payload = {
        ...form,
        targetAmount: target,
        currentSavings: current,
        monthlyIncome: income,
        monthlyExpenses: expenses,
        aiPlan: planText,
      };

      const response = await fetch(
        selectedGoalId
          ? `${API_BASE_URL}/api/savings-goals/${selectedGoalId}`
          : `${API_BASE_URL}/api/savings-goals`,
        {
          method: selectedGoalId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || (language === "id" ? "Gagal menyimpan goal tabungan." : "Failed to save savings goal."));
      }

      if (!selectedGoalId && data.data?.id) {
        setSelectedGoalId(data.data.id);
      }

      await fetchGoals();
      toast.success(selectedGoalId ? (language === "id" ? "Goal tabungan diperbarui!" : "Savings goal updated!") : (language === "id" ? "Goal tabungan disimpan!" : "Savings goal saved!"));
      return data.data as SavingsGoal;
    } catch (error) {
      console.error("Save goal error:", error);
      toast.error(error instanceof Error ? error.message : (language === "id" ? "Gagal menyimpan goal tabungan." : "Failed to save savings goal."));
      return null;
    } finally {
      setIsSavingGoal(false);
    }
  };

  const handleConfirmDelete = (goal: SavingsGoal) => {
    setGoalToDelete(goal);
  };

  const executeDeleteGoal = async () => {
    if (!goalToDelete) return;
    setIsDeletingGoal(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/savings-goals/${goalToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || (language === "id" ? "Gagal menghapus goal tabungan." : "Failed to delete savings goal."));
      }

      if (selectedGoalId === goalToDelete.id) {
        resetPlanner();
      }

      await fetchGoals();
      toast.success(language === "id" ? "Goal tabungan dihapus." : "Savings goal deleted.");
      setGoalToDelete(null);
    } catch (error) {
      console.error("Delete goal error:", error);
      toast.error(error instanceof Error ? error.message : (language === "id" ? "Gagal menghapus goal tabungan." : "Failed to delete savings goal."));
    } finally {
      setIsDeletingGoal(false);
    }
  };

  const handleGenerate = async () => {
    // Validation
    if (!form.namaGoal.trim()) {
      toast.error(language === "id" ? "Nama goal tabungan wajib diisi." : "Savings goal name is required.");
      return;
    }
    if (!target || target <= 0) {
      toast.error(language === "id" ? "Target tabungan harus lebih dari 0." : "Target savings must be greater than 0.");
      return;
    }
    if (!form.deadline) {
      toast.error(language === "id" ? "Pilih deadline bulan terlebih dahulu." : "Please select a target month first.");
      return;
    }
    if (monthsLeft === 0) {
      toast.error(language === "id" ? "Deadline harus lebih dari bulan ini." : "Deadline must be greater than this month.");
      return;
    }

    setAiResult("");
    setIsLoading(true);

    // Scroll to result area after a brief moment
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);

    const prompt = language === "id" ? `Saya memiliki tujuan tabungan berikut:

📌 Nama Goal: ${form.namaGoal}
🎯 Target Tabungan: ${formatCurrency(target, currency)}
💰 Tabungan Saat Ini: ${formatCurrency(current, currency)}
📅 Deadline: ${form.deadline} (${monthsLeft} bulan lagi)
📈 Pemasukan Bulanan: ${formatCurrency(income, currency)}
📉 Pengeluaran Bulanan: ${formatCurrency(expenses, currency)}
💵 Surplus Bulanan: ${formatCurrency(Math.max(0, monthlySurplus), currency)}
🔢 Dana yang Masih Dibutuhkan: ${formatCurrency(remaining, currency)}
📊 Perlu Ditabung per Bulan: ${formatCurrency(Math.ceil(monthlyNeeded), currency)}

Berdasarkan data di atas, buatkan rencana tabungan yang lengkap dan terperinci meliputi:
1. Evaluasi apakah target ini realistis berdasarkan kondisi keuangan saya
2. Strategi tabungan bulanan yang konkret dan bisa dilakukan
3. Cara-cara untuk mempercepat pencapaian target (pengurangan pengeluaran, penambahan pemasukan)
4. Tips motivasi untuk konsisten menabung
5. Simulasi progres tabungan per kuartal (setiap 3 bulan)
6. Alternatif apabila target tidak tercapai tepat waktu

Berikan analisis yang personal, actionable, dan penuh semangat!`
: `I have the following savings goal:

📌 Goal Name: ${form.namaGoal}
🎯 Target Amount: ${formatCurrency(target, currency)}
💰 Current Savings: ${formatCurrency(current, currency)}
📅 Deadline: ${form.deadline} (${monthsLeft} months left)
📈 Monthly Income: ${formatCurrency(income, currency)}
📉 Monthly Expenses: ${formatCurrency(expenses, currency)}
💵 Monthly Surplus: ${formatCurrency(Math.max(0, monthlySurplus), currency)}
🔢 Remaining Amount Needed: ${formatCurrency(remaining, currency)}
📊 Amount Needed to Save per Month: ${formatCurrency(Math.ceil(monthlyNeeded), currency)}

Based on the data above, create a comprehensive and detailed savings plan covering:
1. Evaluation of whether this target is realistic based on my financial condition
2. Concrete and actionable monthly savings strategy
3. Ways to accelerate achieving the target (reducing expenses, increasing income)
4. Motivational tips for consistent saving
5. Simulation of savings progress per quarter (every 3 months)
6. Alternatives if the target is not achieved on time

Provide a personalized, actionable, and encouraging analysis!`;

    try {
      const response = await fetch(`${API_BASE_URL}/api/analisis-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pesan: prompt,
          konteks: {
            currency,
            language,
            pemasukan: income,
            pengeluaran: expenses,
            saldo: monthlySurplus,
            breakdown: {},
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      // Streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (reader) {
        streamTextRef.current = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          streamTextRef.current += chunk;
          setAiResult((prev) => prev + chunk);
        }
      }

      toast.success(language === "id" ? "Rencana tabungan berhasil dibuat! 🎉" : "Savings plan created successfully! 🎉");

      await saveGoal(streamTextRef.current);
    } catch (error) {
      console.error("AI Error:", error);
      toast.error(language === "id" ? "Gagal menghubungi AI. Pastikan backend sedang berjalan." : "Failed to contact AI. Make sure the backend is running.");
      setAiResult(
        t("ai_offline")
      );
    } finally {
      setIsLoading(false);
    }
  };



  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-8xl mx-auto space-y-6">
      {/* ── Gradient Header ───────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 p-8 shadow-lg">
        {/* Decorative circles */}
        <div className="relative flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-white/20 dark:bg-slate-900 backdrop-blur-sm flex items-center justify-center shadow-inner shrink-0 border border-white/10">
            <span
              className="material-symbols-outlined text-white text-3xl"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              savings
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              {t("savings_title")}
            </h1>
            <p className="text-slate-300 mt-1 text-sm">
              {t("savings_subtitle")}
            </p>
          </div>
        </div>

        {/* Quick Preset Buttons */}
        <div className="relative mt-6 flex flex-wrap gap-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-4 py-2 rounded-full border border-white/20 transition-all backdrop-blur-sm"
            >
              <span
                className="material-symbols-outlined text-base"
                style={{ fontVariationSettings: '"FILL" 1' }}
              >
                {preset.icon}
              </span>
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Saved Goals ────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-600">
                flag
              </span>
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">{language === "id" ? "Goal Tabungan Tersimpan" : "Saved Savings Goals"}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === "id" ? "Pantau progres dan lanjutkan rencana tabungan Anda kapan saja" : "Monitor progress and continue your savings plan anytime"}
              </p>
            </div>
          </div>
          <button
            onClick={resetPlanner}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-xl transition-colors"
          >
            <span className="material-symbols-outlined text-base">add</span>
            {language === "id" ? "Goal Baru" : "New Goal"}
          </button>
        </div>

        <div className="p-6">
          {isLoadingGoals ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : goals.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <span className="material-symbols-outlined text-4xl text-slate-300">
                savings
              </span>
              <p className="mt-2 font-semibold text-slate-700 dark:text-slate-200">{language === "id" ? "Belum ada goal tersimpan" : "No saved goals yet"}</p>
              <p className="text-sm text-slate-400">
                {language === "id" ? "Buat rencana pertama Anda lewat form di bawah." : "Create your first plan via the form below."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {goals.map((goal) => {
                const goalTarget = Number(goal.targetAmount) || 0;
                const goalCurrent = Number(goal.currentSavings) || 0;
                const goalProgress = goalTarget > 0 ? Math.min(100, (goalCurrent / goalTarget) * 100) : 0;

                return (
                  <div
                    key={goal.id}
                    className={`rounded-2xl border p-4 transition-all ${
                      selectedGoalId === goal.id
                        ? "border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800/70 shadow-sm"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:border-slate-600 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => handleSelectGoal(goal)}
                        className="text-left flex-1"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="material-symbols-outlined text-slate-800 dark:text-slate-100 text-lg">
                            savings
                          </span>
                          <h3 className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                            {goal.namaGoal}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Deadline {goal.deadline} • {goal.status === "completed" ? (language === "id" ? "Selesai" : "Completed") : (language === "id" ? "Aktif" : "Active")}
                        </p>
                      </button>
                      <button
                        onClick={() => handleConfirmDelete(goal)}
                        className="w-8 h-8 rounded-lg hover:bg-rose-50 dark:bg-rose-900/30 text-slate-400 hover:text-rose-500 transition-colors"
                        title={language === "id" ? "Hapus goal" : "Delete goal"}
                      >
                        <span className="material-symbols-outlined text-base">
                          delete
                        </span>
                      </button>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500 dark:text-slate-400">Progress</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {goalProgress.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-600 rounded-full"
                          style={{ width: `${goalProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3">
                        <p className="text-slate-400">{language === "id" ? "Terkumpul" : "Gathered"}</p>
                        <p className="font-bold text-emerald-600">
                          {language === "id" ? "Rp" : "IDR"} {formatRupiah(goalCurrent)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-3">
                        <p className="text-slate-400">{language === "id" ? "Target" : "Target"}</p>
                        <p className="font-bold text-slate-700 dark:text-slate-200">
                          {language === "id" ? "Rp" : "IDR"} {formatRupiah(goalTarget)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Two-Column Layout ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start xl:items-stretch">
        {/* ── LEFT: Input Form ──────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-slate-800 dark:text-slate-100 text-lg">
                edit_note
              </span>
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                {selectedGoalId ? (language === "id" ? "Edit Goal Tabungan" : "Edit Savings Goal") : (language === "id" ? "Detail Rencana Tabungan" : "Savings Plan Details")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === "id" ? "Isi semua informasi untuk analisis terbaik" : "Fill in all information for the best analysis"}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Goal Name */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("savings_goal_name")}
              </label>
              <input
                type="text"
                name="namaGoal"
                value={form.namaGoal}
                onChange={handleChange}
                placeholder={language === "id" ? "Contoh: Beli Laptop, DP Rumah, Liburan Eropa…" : "Example: Buy Laptop, House Downpayment..."}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition"
              />
            </div>

            {/* Target & Current Savings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("savings_target_amount")} ({currency})
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 dark:text-slate-400 font-medium">
                    Rp
                  </span>
                  <input
                    type="text"
                    name="targetAmount"
                    value={form.targetAmount}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("savings_current_savings")} ({currency})
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 dark:text-slate-400 font-medium">
                    Rp
                  </span>
                  <input
                    type="text"
                    name="currentSavings"
                    value={form.currentSavings}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition"
                  />
                </div>
              </div>
            </div>

            {/* Income & Expenses */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("savings_monthly_income")} ({currency})
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 dark:text-slate-400 font-medium">
                    Rp
                  </span>
                  <input
                    type="text"
                    name="monthlyIncome"
                    value={form.monthlyIncome}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t("savings_monthly_expense")} ({currency})
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 dark:text-slate-400 font-medium">
                    Rp
                  </span>
                  <input
                    type="text"
                    name="monthlyExpenses"
                    value={form.monthlyExpenses}
                    onChange={handleChange}
                    placeholder="0"
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition"
                  />
                </div>
              </div>
            </div>

            {/* Deadline */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("savings_target_date")}
              </label>
              <input
                type="month"
                name="deadline"
                value={form.deadline}
                onChange={handleChange}
                min={getMinDeadline()}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition"
              />
            </div>

            {/* Visual Progress Tracker */}
            {target > 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {t("savings_tracker")}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {percentage.toFixed(1)}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-600 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                      {language === "id" ? "Sudah Terkumpul" : "Already Gathered"}
                    </p>
                    <p className="font-bold text-emerald-600 text-sm">
                      {formatCurrency(current, currency)}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                      {language === "id" ? "Sisa Target" : "Target Remaining"}
                    </p>
                    <p className="font-bold text-rose-500 text-sm">
                      {formatCurrency(remaining, currency)}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                      {language === "id" ? "Sisa Waktu" : "Time Remaining"}
                    </p>
                    <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                      {monthsLeft > 0 ? `${monthsLeft} ${language === "id" ? "bulan" : "months"}` : "—"}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                      {language === "id" ? "Perlu/Bulan" : "Needed/Month"}
                    </p>
                    <p
                      className={`font-bold text-sm ${
                        monthlyNeeded > monthlySurplus && monthlySurplus > 0
                          ? "text-amber-600"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {monthsLeft > 0
                        ? `${formatCurrency(Math.ceil(monthlyNeeded), currency)}`
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Surplus Warning */}
                {monthlySurplus > 0 && monthlyNeeded > monthlySurplus && (
                  <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                    <span className="material-symbols-outlined text-amber-500 text-base mt-0.5">
                      warning
                    </span>
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {language === "id" 
                        ? `Surplus bulanan Anda ${formatCurrency(monthlySurplus, currency)} lebih kecil dari yang dibutuhkan. AI akan memberikan strategi untuk menutup gap ini.`
                        : `Your monthly surplus ${formatCurrency(monthlySurplus, currency)} is smaller than needed. AI will provide a strategy to close this gap.`}
                    </p>
                  </div>
                )}
                {monthlySurplus > 0 && monthlyNeeded <= monthlySurplus && monthlyNeeded > 0 && (
                  <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
                    <span className="material-symbols-outlined text-emerald-500 text-base mt-0.5">
                      check_circle
                    </span>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      {language === "id"
                        ? "Target realistis! Surplus bulanan Anda mencukupi untuk mencapai goal ini tepat waktu."
                        : "Realistic target! Your monthly surplus is sufficient to achieve this goal on time."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isLoading || isSavingGoal}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-slate-900 text-white font-semibold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-xl animate-spin">
                    progress_activity
                  </span>
                  <span>{language === "id" ? "Membuat Rencana Tabungan…" : "Generating Savings Plan..."}</span>
                </>
              ) : (
                <>
                  <span
                    className="material-symbols-outlined text-xl"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    auto_awesome
                  </span>
                  <span>{t("savings_generate_btn")}</span>
                </>
              )}
            </button>

            <button
              onClick={() => saveGoal()}
              disabled={isLoading || isSavingGoal}
              className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 font-semibold py-3 rounded-xl border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">
                {isSavingGoal ? "progress_activity" : "save"}
              </span>
              {isSavingGoal
                ? (language === "id" ? "Menyimpan..." : "Saving...")
                : selectedGoalId
                  ? (language === "id" ? "Simpan Perubahan Goal" : "Save Goal Changes")
                  : (language === "id" ? "Simpan Goal Tanpa Generate AI" : "Save Goal Without AI Generation")}
            </button>
          </div>
        </div>

        {/* ── RIGHT: AI Result Card ─────────────────────────────────────── */}
        <div
          ref={resultRef}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col xl:h-0 xl:min-h-full"
        >
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center p-1 border border-slate-200 dark:border-slate-700">
              <img src="/logo.png" alt="AI" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                {t("savings_result_title")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === "id" ? "Analisis personal dari WealthVision AI" : "Personal analysis from WealthVision AI"}
              </p>
            </div>
            {isLoading && (
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-medium">
                <span className="material-symbols-outlined text-sm animate-spin">
                  progress_activity
                </span>
                {t("savings_generating")}
              </span>
            )}
          </div>

          <div className="flex-1 p-6 overflow-y-auto min-h-0 relative">
            {/* Empty State */}
            {!aiResult && !isLoading && (
              <div className="h-full min-h-64 flex flex-col items-center justify-center text-center space-y-4 py-16">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-4xl text-slate-500 dark:text-slate-400"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    savings
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    {language === "id" ? "Rencana AI Menunggu" : "AI Plan Waiting"}
                  </p>
                  <p className="text-sm text-slate-400 mt-1 max-w-xs">
                    {language === "id" ? "Isi form di sebelah kiri, lalu klik" : "Fill the form on the left, then click"}{" "}
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      &quot;{t("savings_generate_btn")}&quot;
                    </span>{" "}
                    {language === "id" ? "untuk mendapatkan analisis personal dari AI." : "to get personalized AI analysis."}
                  </p>
                </div>
                {/* Feature badges */}
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  {(language === "id" ? [
                    "Evaluasi Realistis",
                    "Strategi Bulanan",
                    "Tips Hemat",
                    "Simulasi Progres",
                  ] : [
                    "Realistic Evaluation",
                    "Monthly Strategy",
                    "Saving Tips",
                    "Progress Simulation"
                  ]).map((f) => (
                    <span
                      key={f}
                      className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Skeleton */}
            {isLoading && !aiResult && (
              <div className="space-y-3 animate-pulse">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-4 rounded bg-slate-100 dark:bg-slate-800 ${
                      i % 3 === 2 ? "w-2/3" : "w-full"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* AI Result Text (streaming) */}
            {aiResult && (
              <div className="prose prose-sm max-w-none markdown-body">
                <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {aiResult}
                  </ReactMarkdown>
                  {/* Blinking cursor while streaming */}
                  {isLoading && (
                    <span className="inline-block w-0.5 h-4 bg-slate-900 dark:bg-slate-100 ml-0.5 animate-pulse align-middle" />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer — copy button when result is available */}
          {aiResult && !isLoading && (
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                {language === "id" ? "Dihasilkan oleh WealthVision AI" : "Generated by WealthVision AI"}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(aiResult);
                  toast.success(language === "id" ? "Rencana disalin ke clipboard!" : "Plan copied to clipboard!");
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 hover:text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-sm">
                  content_copy
                </span>
                {language === "id" ? "Salin Rencana" : "Copy Plan"}
              </button>
            </div>
          )}
        </div>
      </div>
      {/* ── Modal Delete Goal ────────────────────────────────────────────── */}
      {goalToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in transition-opacity"
            onClick={() => !isDeletingGoal && setGoalToDelete(null)}
          ></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6">
              <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-rose-600 text-[30px]">
                  delete_forever
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {language === "id" ? "Hapus goal tabungan ini?" : "Delete this savings goal?"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {language === "id" 
                  ? "Rencana tabungan berikut akan dihapus secara permanen dari daftar Anda." 
                  : "The following savings plan will be permanently deleted from your list."}
              </p>

              <div className="mt-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">
                      savings
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                      {goalToDelete.namaGoal}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Target: {formatCurrency(parseInt(goalToDelete.targetAmount) || 0, currency)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-900/30 p-3 flex gap-3">
                <span className="material-symbols-outlined text-rose-500 text-[20px] flex-shrink-0">
                  warning
                </span>
                <p className="text-xs text-rose-700 dark:text-rose-400">
                  {language === "id" 
                    ? "Tindakan ini tidak dapat dibatalkan setelah dihapus." 
                    : "This action cannot be undone once deleted."}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setGoalToDelete(null)}
                disabled={isDeletingGoal}
                className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={executeDeleteGoal}
                disabled={isDeletingGoal}
                className="px-4 py-2.5 rounded-lg bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {isDeletingGoal ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      progress_activity
                    </span>
                    {t("deleting")}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">
                      delete
                    </span>
                    {language === "id" ? "Ya, Hapus" : "Yes, Delete"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
