"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getKategoriLabel,
  formatRupiah,
  API_BASE_URL,
  type Transaksi,
} from "@/lib/constants";
import { usePreferences } from "@/context/PreferencesContext";

import { useSearchParams, useRouter } from "next/navigation";

interface ChatMessage {
  id: number | string;
  role: "user" | "ai";
  content: string;
  timestamp: string;
}

interface FinancialContext {
  currency: string;
  language: string;
  pemasukan: number;
  pengeluaran: number;
  saldo: number;
  breakdown: Record<string, number>;
}

export default function AIAdvisor() {
  const { t, language, currency } = usePreferences();
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasAutoSent = useRef(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: "ai",
      content: t("ai_welcome"),
      timestamp: new Date().toLocaleTimeString(language === "id" ? "id-ID" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [financialContext, setFinancialContext] = useState<FinancialContext>({
    currency: "USD",
    language: "en",
    pemasukan: 0,
    pengeluaran: 0,
    saldo: 0,
    breakdown: {},
  });
  const [isContextLoaded, setIsContextLoaded] = useState(false);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- FETCH FINANCIAL CONTEXT ---
  useEffect(() => {
    const fetchFinancialContext = async () => {
      try {
        const bulan = new Date().getMonth() + 1;
        const tahun = new Date().getFullYear();

        const response = await fetch(
          `${API_BASE_URL}/api/transaksi?bulan=${bulan}&tahun=${tahun}`,
          { credentials: "include" }
        );

        if (!response.ok) return;

        const data = await response.json();

        if (data.status === "success") {
          let pemasukan = 0;
          let pengeluaran = 0;
          const breakdown: Record<string, number> = {};

          data.data.forEach((item: Transaksi) => {
            if (item.jenis === "pemasukan") {
              pemasukan += item.nominal;
            } else {
              pengeluaran += item.nominal;
              const label = getKategoriLabel(item.kategori);
              breakdown[label] = (breakdown[label] || 0) + item.nominal;
            }
          });

          setFinancialContext({
            currency,
            language,
            pemasukan,
            pengeluaran,
            saldo: pemasukan - pengeluaran,
            breakdown,
          });
          setIsContextLoaded(true);
        }
      } catch (error) {
        console.error("Gagal memuat konteks keuangan:", error);
      }
    };

    fetchFinancialContext();
  }, [currency, language]);

  // --- AUTO SCROLL ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- SEND MESSAGE (SUBMIT) ---
  const handleSend = async (customMessage?: string) => {
    const messageText = customMessage || inputText.trim();
    if (!messageText) return;

    // Append user message to chat UI
    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: messageText,
      timestamp: new Date().toLocaleTimeString(language === "id" ? "id-ID" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch(`${API_BASE_URL}/api/analisis-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          pesan: messageText,
          konteks: financialContext,
          history: historyPayload
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      // STREAMING LOGIC
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
      const aiMessageId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: aiMessageId,
          role: "ai",
          content: "",
          timestamp: new Date().toLocaleTimeString(language === "id" ? "id-ID" : "en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId ? { ...msg, content: msg.content + chunk } : msg
            )
          );
        }
      }
    } catch (error) {
      console.error("AI Error:", error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        content: t("ai_offline"),
        timestamp: new Date().toLocaleTimeString(language === "id" ? "id-ID" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- AUTO-SEND FROM URL PROMPT ---
  useEffect(() => {
    if (isContextLoaded && !hasAutoSent.current) {
      const prompt = searchParams.get("prompt");
      if (prompt) {
        hasAutoSent.current = true;
        
        // Clean URL prompt parameter without triggering a page reload
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);

        // Automatically trigger send with a slight delay for smooth UI animation
        setTimeout(() => {
          handleSend(prompt);
        }, 600);
      }
    }
  }, [isContextLoaded, searchParams]);

  // --- QUICK ACTION BUTTONS ---
  const quickActions = [
    {
      label: t("ai_qa_1_label"),
      message: language === "id" 
        ? "Tolong analisis kondisi keuangan saya bulan ini secara menyeluruh. Berikan skor kesehatan finansial dan rekomendasi perbaikan."
        : "Please comprehensively analyze my financial condition this month. Provide a financial health score and improvement recommendations.",
    },
    {
      label: t("ai_qa_2_label"),
      message: language === "id"
        ? "Berdasarkan pola pengeluaran saya bulan ini, di kategori mana saya bisa menghemat? Berikan tips spesifik."
        : "Based on my spending patterns this month, in which categories can I save money? Provide specific tips.",
    },
    {
      label: t("ai_qa_3_label"),
      message: language === "id"
        ? "Dengan kondisi saldo saya saat ini, apakah ada peluang investasi yang bisa saya pertimbangkan? Berikan saran yang sesuai."
        : "With my current balance, are there any investment opportunities I should consider? Provide appropriate advice.",
    },
    {
      label: t("ai_qa_4_label"),
      message: language === "id"
        ? "Buatkan rencana tabungan bulanan yang realistis berdasarkan pemasukan dan pengeluaran saya saat ini."
        : "Create a realistic monthly savings plan based on my current income and expenses.",
    },
  ];



  return (
    <main className="w-full max-w-8xl bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[calc(100vh-120px)] mx-auto">
      {/* Header */}
      <header className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center bg-white dark:bg-slate-900 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm p-1.5 border border-slate-200 dark:border-slate-700">
            <img src="/logo.png" alt="AI" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {t("ai_advisor_title")}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("ai_advisor_subtitle")}</p>
          </div>
        </div>

        {/* Financial Context Summary */}
        {isContextLoaded && (
          <div className="flex items-center gap-4 mt-4 text-xs">
            <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full font-semibold">
              {t("income")}: {language === "id" ? "Rp" : "IDR"} {formatRupiah(financialContext.pemasukan)}
            </span>
            <span className="bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 px-3 py-1 rounded-full font-semibold">
              {t("expense")}: {language === "id" ? "Rp" : "IDR"} {formatRupiah(financialContext.pengeluaran)}
            </span>
            <span className={`px-3 py-1 rounded-full font-semibold ${
              financialContext.saldo >= 0
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400"
                : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
            }`}>
              {language === "id" ? "Saldo" : "Balance"}: {language === "id" ? "Rp" : "IDR"} {formatRupiah(Math.abs(financialContext.saldo))}
            </span>
          </div>
        )}
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-800/50">
        <div className="space-y-4 mb-6">
          {/* ── Financial Health Check-up Panel ───────────────────────────────────── */}
          <div className="shrink-0">
            <button
              onClick={() => {
                handleSend(
                  "Tolong lakukan Medical Check-up Keuangan pada data saya bulan ini. Analisis secara menyeluruh rasio pemasukan dan pengeluaran saya, lalu berikan SKOR KESEHATAN KEUANGAN (Skala A/B/C/D) beserta penjelasan dan resep perbaikannya."
                );
              }}
              disabled={isLoading}
              className="w-full relative overflow-hidden group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all p-1 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-slate-800 via-slate-800 to-slate-700 opacity-10 group-hover:opacity-20 transition-opacity"></div>
              <div className="relative flex items-center justify-between p-4 bg-white dark:bg-slate-900 backdrop-blur-sm rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-center text-white shadow-inner">
                    <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>health_and_safety</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg group-hover:text-slate-900 dark:text-white transition-colors">{t("ai_med_checkup")}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t("ai_med_checkup_desc")}</p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-100 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined">arrow_forward</span>
                </div>
              </div>
            </button>
          </div>


          {/* ── Investment Guidance Panel ───────────────────────────────────── */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden shrink-0">
            {/* Panel Header */}
            <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <span
                  className="material-symbols-outlined text-white text-base"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  rocket_launch
                </span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("ai_inv_guidance")}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("ai_inv_guidance_desc")}</p>
              </div>
            </div>

            {/* Risk Level Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 p-4">
              {/* Konservatif */}
              <button
                onClick={() => {
                  setSelectedRiskLevel("konservatif");
                  handleSend(
                    language === "id"
                      ? "Berdasarkan profil risiko RENDAH (konservatif) saya, berikan panduan investasi yang cocok, produk investasi yang direkomendasikan, dan alokasi portofolio yang tepat untuk kondisi keuangan saya saat ini."
                      : "Based on my LOW (conservative) risk profile, provide suitable investment guidance, recommended investment products, and the right portfolio allocation for my current financial condition."
                  );
                }}
                disabled={isLoading}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  selectedRiskLevel === "konservatif"
                    ? "border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-900/40"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-emerald-300 hover:bg-emerald-50 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/40"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedRiskLevel === "konservatif" ? "bg-emerald-500" : "bg-emerald-100 dark:bg-emerald-900/40"
                }`}>
                  <span
                    className={`material-symbols-outlined text-xl ${
                      selectedRiskLevel === "konservatif" ? "text-white" : "text-emerald-600 dark:text-emerald-400"
                    }`}
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    shield
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                    {language === "id" ? "Konservatif" : "Conservative"}{" "}
                    <span className="text-emerald-600 font-normal">({language === "id" ? "Rendah" : "Low"})</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {language === "id" ? "Deposito, obligasi, reksa dana pasar uang" : "Time deposits, bonds, money market funds"}
                  </p>
                </div>
                {selectedRiskLevel === "konservatif" && (
                  <span
                    className="material-symbols-outlined text-emerald-500 text-lg ml-auto shrink-0"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    check_circle
                  </span>
                )}
              </button>

              {/* Moderat */}
              <button
                onClick={() => {
                  setSelectedRiskLevel("moderat");
                  handleSend(
                    language === "id"
                      ? "Berdasarkan profil risiko MENENGAH (moderat) saya, berikan panduan investasi yang seimbang antara pertumbuhan dan keamanan, serta rekomendasi alokasi portofolio yang tepat."
                      : "Based on my MEDIUM (moderate) risk profile, provide investment guidance that balances growth and security, along with the right portfolio allocation recommendations."
                  );
                }}
                disabled={isLoading}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  selectedRiskLevel === "moderat"
                    ? "border-amber-500 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/40"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-amber-300 hover:bg-amber-50 dark:hover:border-amber-700 dark:hover:bg-amber-900/40"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedRiskLevel === "moderat" ? "bg-amber-500" : "bg-amber-100 dark:bg-amber-900/40"
                }`}>
                  <span
                    className={`material-symbols-outlined text-xl ${
                      selectedRiskLevel === "moderat" ? "text-white" : "text-amber-600 dark:text-amber-400"
                    }`}
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    balance
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                    {language === "id" ? "Moderat" : "Moderate"}{" "}
                    <span className="text-amber-600 font-normal">({language === "id" ? "Menengah" : "Medium"})</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {language === "id" ? "Reksa dana campuran, saham blue-chip" : "Balanced mutual funds, blue-chip stocks"}
                  </p>
                </div>
                {selectedRiskLevel === "moderat" && (
                  <span
                    className="material-symbols-outlined text-amber-500 text-lg ml-auto shrink-0"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    check_circle
                  </span>
                )}
              </button>

              {/* Agresif */}
              <button
                onClick={() => {
                  setSelectedRiskLevel("agresif");
                  handleSend(
                    language === "id"
                      ? "Berdasarkan profil risiko TINGGI (agresif) saya, berikan panduan investasi yang berorientasi pertumbuhan maksimal, termasuk instrumen saham, reksa dana, dan aset digital yang sesuai."
                      : "Based on my HIGH (aggressive) risk profile, provide investment guidance oriented towards maximum growth, including appropriate stocks, mutual funds, and digital assets."
                  );
                }}
                disabled={isLoading}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                  selectedRiskLevel === "agresif"
                    ? "border-rose-500 bg-rose-50 dark:border-rose-500 dark:bg-rose-900/40"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-rose-300 hover:bg-rose-50 dark:hover:border-rose-700 dark:hover:bg-rose-900/40"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  selectedRiskLevel === "agresif" ? "bg-rose-500" : "bg-rose-100 dark:bg-rose-900/40"
                }`}>
                  <span
                    className={`material-symbols-outlined text-xl ${
                      selectedRiskLevel === "agresif" ? "text-white" : "text-rose-600 dark:text-rose-400"
                    }`}
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    bolt
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                    {language === "id" ? "Agresif" : "Aggressive"}{" "}
                    <span className="text-rose-600 font-normal">({language === "id" ? "Tinggi" : "High"})</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {language === "id" ? "Saham, kripto, reksa dana saham global" : "Stocks, crypto, global equity funds"}
                  </p>
                </div>
                {selectedRiskLevel === "agresif" && (
                  <span
                    className="material-symbols-outlined text-rose-500 text-lg ml-auto shrink-0"
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    check_circle
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "ai" ? (
              /* AI Message — Left Aligned */
              <div className="flex items-start gap-3 max-w-[85%]">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-sm p-1.5 border border-slate-200 dark:border-slate-700">
                  <img src="/logo.png" alt="AI" className="w-full h-full object-contain" />
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl rounded-tl-sm shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ) : (
              /* User Message — Right Aligned */
              <div className="flex flex-col items-end gap-1 ml-auto max-w-[80%]">
                <div className="bg-slate-800 p-4 rounded-xl rounded-tr-sm shadow-sm">
                  <p className="text-sm text-white">{msg.content}</p>
                </div>
                <span className="text-xs text-slate-400 mr-1">
                  {msg.timestamp}
                </span>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (messages.length === 0 || messages[messages.length - 1].role === "user" || messages[messages.length - 1].content === "") && (
          <div className="flex items-start gap-3 max-w-[85%]">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-sm p-1.5 border border-slate-200 dark:border-slate-700">
              <img src="/logo.png" alt="AI" className="w-full h-full object-contain animate-pulse" />
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl rounded-tl-sm shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="material-symbols-outlined text-sm animate-spin">
                  progress_activity
                </span>
                <span className="text-sm">{t("ai_analyzing")}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
        <div className="relative flex items-end">
          <textarea
            ref={inputRef as any}
            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-shadow resize-none custom-scrollbar"
            placeholder={t("ai_input_placeholder")}
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !inputText.trim()}
            className="absolute right-2 bottom-2 w-10 h-10 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span
              className="material-symbols-outlined text-lg"
              style={{ fontVariationSettings: '"FILL" 1' }}
            >
              send
            </span>
          </button>
        </div>

        {/* Quick Action Chips */}
        <div className="flex flex-wrap justify-center mt-4 gap-2">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleSend(action.message)}
              disabled={isLoading}
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 hover:border-slate-300 dark:border-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
