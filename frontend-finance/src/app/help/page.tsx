"use client";

import { useState } from "react";
import { usePreferences } from "@/context/PreferencesContext";

export default function HelpFAQ() {
  const { t } = usePreferences();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    { q: t("help_q1"), a: t("help_a1") },
    { q: t("help_q2"), a: t("help_a2") },
    { q: t("help_q3"), a: t("help_a3") },
    { q: t("help_q4"), a: t("help_a4") },
  ];

  return (
    <main className="max-w-[1440px] mx-auto px-6 py-8 md:py-12 space-y-12">
      {/* Header Section */}
      <header className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
          {t("help_title")}
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300">
          {t("help_subtitle")}
        </p>
      </header>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {faqs.map((faq, idx) => {
          const isOpen = openFaq === idx;
          return (
            <article
              key={idx}
              onClick={() => toggleFaq(idx)}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-6 border ${
                isOpen ? "border-slate-300 dark:border-slate-600 shadow-md" : "border-slate-200 dark:border-slate-700 shadow-sm"
              } transition-all duration-300 hover:shadow-md cursor-pointer group`}
            >
              <div className="flex justify-between items-start gap-4">
                <h3 className={`text-lg font-semibold transition-colors ${isOpen ? "text-slate-900 dark:text-white" : "text-slate-800 dark:text-slate-100"}`}>
                  {faq.q}
                </h3>
                <span
                  className={`material-symbols-outlined transition-all duration-300 ${
                    isOpen ? "text-slate-800 dark:text-slate-100 rotate-180" : "text-slate-400 group-hover:text-slate-800 dark:text-slate-100"
                  }`}
                >
                  expand_more
                </span>
              </div>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isOpen ? "max-h-40 opacity-100 mt-4" : "max-h-0 opacity-0 mt-0"
                }`}
              >
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      {/* Support Card */}
      <section className="max-w-4xl mx-auto mt-16 pb-12">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-100 shrink-0">
              <span className="material-symbols-outlined text-3xl">headset_mic</span>
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white">{t("help_support_title")}</h4>
              <p className="text-slate-600 dark:text-slate-300 mt-1">{t("help_support_desc")}</p>
            </div>
          </div>
          <a
            href="mailto:wealthvisionid@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 dark:bg-indigo-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-slate-300 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[20px]">mail</span>
            {t("help_support_btn")}
          </a>
        </div>
      </section>
    </main>
  );
}
