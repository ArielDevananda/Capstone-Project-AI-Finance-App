"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In a real enterprise app, log this error to Sentry or a similar service
    console.error("Caught by Global Error Boundary:", error);
  }, [error]);

  return (
    <div className="min-h-[400px] w-full flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-red-100 shadow-sm mt-8">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-3xl text-red-600">
          error
        </span>
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 text-center">
        Oops! Terjadi Kesalahan Sistem
      </h2>
      <p className="text-slate-600 dark:text-slate-300 text-center max-w-md mb-8">
        Kami mendeteksi adanya kegagalan pada antarmuka. Mohon maaf atas ketidaknyamanan ini. Anda bisa memuat ulang halaman ini.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => window.location.href = "/dashboard"}
          className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800/60 transition-colors"
        >
          Ke Beranda
        </button>
        <button
          onClick={() => reset()}
          className="px-6 py-2.5 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-900 dark:bg-slate-100 transition-colors shadow-md shadow-slate-300"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
