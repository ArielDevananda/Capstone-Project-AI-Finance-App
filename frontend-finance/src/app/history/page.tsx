"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import {
  KATEGORI_PENGELUARAN,
  KATEGORI_PEMASUKAN,
  getKategoriLabel,
  getKategoriUI,
  formatRupiah,
  formatCurrency,
  formatNominalInput,
  parseNominalInput,
  formatTanggal,
  API_BASE_URL,
  NAMA_BULAN,
  type Transaksi,
} from "@/lib/constants";
import { usePreferences } from "@/context/PreferencesContext";
import { TranslationKey } from "@/lib/translations";
import { Skeleton } from "@/components/ui/skeleton";

const ITEMS_PER_PAGE = 8;

export default function History() {
  // --- COMPONENT STATE ---
  const [daftarTransaksi, setDaftarTransaksi] = useState<Transaksi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t, language, currency } = usePreferences();
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterJenis, setFilterJenis] = useState("all");
  const [filterKategori, setFilterKategori] = useState("all");
  const [bulanAktif, setBulanAktif] = useState(new Date().getMonth() + 1);
  const [tahunAktif, setTahunAktif] = useState(new Date().getFullYear());
  
  const [currentPage, setCurrentPage] = useState(1);

  // State management for Create/Update transaction modals
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transaksi | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    jenis: "pengeluaran",
    nominal: "",
    kategori: "makanan",
    deskripsi: "",
    tanggal: new Date().toISOString().split("T")[0],
  });

  // --- CSV BATCH IMPORT STATE ---
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<
    { tanggal: string; jenis: string; kategori: string; nominal: number; deskripsi: string }[]
  >([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvProgress, setCsvProgress] = useState({ current: 0, total: 0 });
  const [csvParsed, setCsvParsed] = useState(false);

  const VALID_KATEGORI_PENGELUARAN = KATEGORI_PENGELUARAN.map((k) => k.value);
  const VALID_KATEGORI_PEMASUKAN = KATEGORI_PEMASUKAN.map((k) => k.value);

  // --- DATA FETCHING (API) ---
  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
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
      }
    } catch (error) {
      console.error("Gagal memuat data:", error);
      toast.error(language === "id" ? "Gagal memuat riwayat transaksi!" : "Failed to load transaction history!");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulanAktif, tahunAktif]);

  // --- CLIENT-SIDE FILTERING & SEARCH ---
  const filteredData = daftarTransaksi.filter((item) => {
    const matchSearch =
      searchQuery === "" ||
      (item.deskripsi || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      getKategoriLabel(item.kategori).toLowerCase().includes(searchQuery.toLowerCase()) ||
      t(`cat_${item.kategori}` as any).toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nominal.toString().includes(searchQuery);

    const matchJenis = filterJenis === "all" || item.jenis === filterJenis;
    const matchKategori = filterKategori === "all" || item.kategori === filterKategori;

    return matchSearch && matchJenis && matchKategori;
  });

  // --- CLIENT-SIDE PAGINATION ---
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE) || 1;
  const paginatedData = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterJenis, filterKategori]);

  // Reset category filter if it doesn't match selected type filter
  useEffect(() => {
    if (filterJenis === "pengeluaran") {
      const isValid = KATEGORI_PENGELUARAN.some(k => k.value === filterKategori);
      if (!isValid && filterKategori !== "all") setFilterKategori("all");
    } else if (filterJenis === "pemasukan") {
      const isValid = KATEGORI_PEMASUKAN.some(k => k.value === filterKategori);
      if (!isValid && filterKategori !== "all") setFilterKategori("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterJenis]);

  // Auto-reset category in modal when type changes
  useEffect(() => {
    if (!editId && showModal) {
      const validOptions = formData.jenis === "pengeluaran" ? KATEGORI_PENGELUARAN : KATEGORI_PEMASUKAN;
      const isValid = validOptions.some((kat) => kat.value === formData.kategori);
      if (!isValid) {
        setFormData(prev => ({ ...prev, kategori: validOptions[0].value }));
      }
    }
  }, [formData.jenis, showModal]);

  // --- CRUD OPERATIONS ---
  const handleOpenModal = (item?: Transaksi) => {
    if (item) {
      setEditId(item.id);
      setFormData({
        jenis: item.jenis,
        nominal: formatNominalInput(item.nominal.toString()),
        kategori: item.kategori,
        deskripsi: item.deskripsi || "",
        tanggal: item.tanggal.split(" ")[0],
      });
    } else {
      setEditId(null);
      setFormData({
        jenis: "pengeluaran",
        nominal: "",
        kategori: "makanan",
        deskripsi: "",
        tanggal: new Date().toISOString().split("T")[0],
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditId(null);
  };

  const handleSaveExpense = async () => {
    if (!formData.nominal || parseInt(formData.nominal) <= 0) {
      toast.error(language === "id" ? "Nominal harus lebih dari 0!" : "Amount must be greater than 0!");
      return;
    }

    // Validates that the submitted category aligns with the selected transaction type (Income/Expense)
    const validOptions = formData.jenis === "pengeluaran" ? KATEGORI_PENGELUARAN : KATEGORI_PEMASUKAN;
    const isValid = validOptions.some((kat) => kat.value === formData.kategori);
    const finalKategori = isValid ? formData.kategori : validOptions[0].value;

    const payload = {
      jenis: formData.jenis,
      nominal: parseInt(parseNominalInput(formData.nominal) || "0"),
      kategori: finalKategori,
      deskripsi: formData.deskripsi,
      tanggal: formData.tanggal,
    };

    try {
      let response;
      if (editId) {
        response = await fetch(`${API_BASE_URL}/api/transaksi/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/tambah`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        toast.success(editId ? (language === "id" ? "Transaksi berhasil diperbarui!" : "Transaction updated successfully!") : (language === "id" ? "Transaksi berhasil ditambahkan!" : "Transaction added successfully!"));
        handleCloseModal();
        fetchExpenses();
      } else {
        toast.error(language === "id" ? "Gagal menyimpan data!" : "Failed to save data!");
      }
    } catch (error) {
      toast.error(language === "id" ? "Koneksi ke server terputus!" : "Connection to server lost!");
    }
  };

  const handleOpenDeleteConfirm = (item: Transaksi) => {
    setDeleteTarget(item);
    setShowDeleteConfirm(true);
  };

  const handleCloseDeleteConfirm = () => {
    if (isDeleting) return;
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/transaksi/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        toast.success(language === "id" ? "Transaksi berhasil dihapus!" : "Transaction deleted successfully!");
        setShowDeleteConfirm(false);
        setDeleteTarget(null);
        fetchExpenses();
      } else {
        toast.error(language === "id" ? "Gagal menghapus transaksi!" : "Failed to delete transaction!");
      }
    } catch (error) {
      toast.error(language === "id" ? "Gagal menghapus data!" : "Failed to delete data!");
    } finally {
      setIsDeleting(false);
    }
  };

  // --- CSV IMPORT HANDLERS ---
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvPreview([]);
    setCsvErrors([]);
    setCsvParsed(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

      // Skip header row if it starts with 'tanggal'
      const dataLines = lines[0]?.toLowerCase().startsWith("tanggal") ? lines.slice(1) : lines;

      const parsed: { tanggal: string; jenis: string; kategori: string; nominal: number; deskripsi: string }[] = [];
      const errors: string[] = [];

      dataLines.forEach((line, idx) => {
        const rowNum = idx + 1;
        const cols = line.split(",");
        if (cols.length < 5) {
          errors.push(`Baris ${rowNum}: Kolom tidak lengkap (butuh 5 kolom).`);
          return;
        }

        const [tanggal, jenis, kategori, nominalStr, ...descParts] = cols;
        const deskripsi = descParts.join(",").replace(/"/g, "").trim();
        const nominal = parseInt(nominalStr?.replace(/"/g, "").trim() || "0", 10);
        const jenisTrimmed = jenis?.replace(/"/g, "").trim().toLowerCase();
        const kategoriTrimmed = kategori?.replace(/"/g, "").trim().toLowerCase();
        const tanggalTrimmed = tanggal?.replace(/"/g, "").trim();

        if (!jenisTrimmed || (jenisTrimmed !== "pemasukan" && jenisTrimmed !== "pengeluaran")) {
          errors.push(`Baris ${rowNum}: Jenis harus 'pemasukan' atau 'pengeluaran' (ditemukan: '${jenisTrimmed}').`);
          return;
        }

        if (isNaN(nominal) || nominal <= 0) {
          errors.push(`Baris ${rowNum}: Nominal harus angka lebih dari 0 (ditemukan: '${nominalStr?.trim()}').`);
          return;
        }

        const validKat = jenisTrimmed === "pengeluaran" ? VALID_KATEGORI_PENGELUARAN : VALID_KATEGORI_PEMASUKAN;
        if (!validKat.includes(kategoriTrimmed)) {
          errors.push(`Baris ${rowNum}: Kategori '${kategoriTrimmed}' tidak valid untuk jenis '${jenisTrimmed}'.`);
          return;
        }

        if (!tanggalTrimmed || !/^\d{4}-\d{2}-\d{2}$/.test(tanggalTrimmed)) {
          errors.push(`Baris ${rowNum}: Format tanggal harus YYYY-MM-DD (ditemukan: '${tanggalTrimmed}').`);
          return;
        }

        parsed.push({
          tanggal: tanggalTrimmed,
          jenis: jenisTrimmed,
          kategori: kategoriTrimmed,
          nominal,
          deskripsi: deskripsi || "",
        });
      });

      setCsvPreview(parsed);
      setCsvErrors(errors);
      setCsvParsed(true);
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (csvPreview.length === 0) {
      toast.error(language === "id" ? "Tidak ada data valid untuk diimpor!" : "No valid data to import!");
      return;
    }
    setCsvImporting(true);
    setCsvProgress({ current: 0, total: csvPreview.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < csvPreview.length; i++) {
      const row = csvPreview[i];
      setCsvProgress({ current: i + 1, total: csvPreview.length });
      try {
        const res = await fetch(`${API_BASE_URL}/api/tambah`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(row),
        });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setCsvImporting(false);
    if (successCount > 0) {
      toast.success(language === "id" ? `${successCount} transaksi berhasil diimpor!${failCount > 0 ? ` (${failCount} gagal)` : ""}` : `${successCount} transactions imported successfully!${failCount > 0 ? ` (${failCount} failed)` : ""}`);
    } else {
      toast.error(language === "id" ? "Semua transaksi gagal diimpor!" : "All transactions failed to import!");
    }
    setShowCsvModal(false);
    setCsvFile(null);
    setCsvPreview([]);
    setCsvErrors([]);
    setCsvParsed(false);
    fetchExpenses();
  };

  const handleCloseCsvModal = () => {
    if (csvImporting) return;
    setShowCsvModal(false);
    setCsvFile(null);
    setCsvPreview([]);
    setCsvErrors([]);
    setCsvParsed(false);
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      '"tanggal","jenis","kategori","nominal","deskripsi"\n' +
      '"2026-05-01","pengeluaran","makanan","50000","Makan siang"\n' +
      '"2026-05-02","pemasukan","gaji","5000000","Gaji bulan Mei"';
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "template_import_transaksi.csv");
    link.click();
  };

  // --- EXPORT CSV ---
  const handleExport = () => {
    if (filteredData.length === 0) {
      toast.error(language === "id" ? "Tidak ada data untuk diekspor!" : "No data to export!");
      return;
    }

    const headers = ["tanggal", "jenis", "kategori", "nominal", "deskripsi"];
    const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;
    
    const rows = filteredData.map((item) => [
      escapeCSV(item.tanggal.split(" ")[0]),
      escapeCSV(item.jenis.toLowerCase()),
      escapeCSV(item.kategori),
      escapeCSV(item.nominal.toString()),
      escapeCSV(item.deskripsi || ""),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `riwayat_${NAMA_BULAN[bulanAktif - 1]}_${tahunAktif}.csv`);
    link.click();
    toast.success(language === "id" ? "Data berhasil diekspor!" : "Data exported successfully!");
  };

  // --- EXPORT PDF ---
  const handleExportPDF = () => {
    if (filteredData.length === 0) {
      toast.error(language === "id" ? "Tidak ada data untuk diekspor!" : "No data to export!");
      return;
    }

    const bulanLabel = NAMA_BULAN[bulanAktif - 1];
    const totalMasuk = filteredData
      .filter((i) => i.jenis === "pemasukan")
      .reduce((s, i) => s + i.nominal, 0);
    const totalKeluar = filteredData
      .filter((i) => i.jenis === "pengeluaran")
      .reduce((s, i) => s + i.nominal, 0);
    const net = totalMasuk - totalKeluar;

    const bulanSingkat = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
    const formatTgl = (dateStr: string) => {
      const d = new Date(dateStr.replace(" ", "T"));
      return `${d.getDate()} ${bulanSingkat[d.getMonth()]} ${d.getFullYear()}`;
    };
    const curr_symbol = currency === "IDR" ? "Rp" : "$";
    const fmtCurrency = (v: number) => {
      return currency === "IDR" ? `Rp ${v.toLocaleString("id-ID")}` : `$${v.toLocaleString("en-US", {minimumFractionDigits: 2})}`;
    }

    const rows = filteredData
      .map(
        (item) => `
        <tr>
          <td>${formatTgl(item.tanggal)}</td>
          <td>${item.deskripsi || item.kategori}</td>
          <td>${t(`cat_${item.kategori}` as TranslationKey) || item.kategori}</td>
          <td class="jenis ${item.jenis === "pemasukan" ? "masuk" : "keluar"}">${item.jenis === "pemasukan" ? t("income") : t("expense")}</td>
          <td class="nominal ${item.jenis === "pemasukan" ? "masuk" : "keluar"}">${item.jenis === "pemasukan" ? "+" : "-"} ${fmtCurrency(item.nominal)}</td>
        </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Laporan Keuangan — ${bulanLabel} ${tahunAktif}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1e293b; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 2px solid #0f172a; padding-bottom: 16px; }
    .brand { font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px; }
    .brand span { color: #10b981; }
    .meta { text-align: right; font-size: 12px; color: #64748b; line-height: 1.6; }
    .meta strong { color: #1e293b; font-size: 14px; }
    h2 { font-size: 15px; font-weight: 600; margin-bottom: 12px; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #0f172a; color: #fff; }
    thead th { padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    tbody tr { border-bottom: 1px solid #e2e8f0; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    td { padding: 9px 12px; vertical-align: middle; }
    .masuk { color: #059669; }
    .keluar { color: #e11d48; }
    .nominal { font-weight: 600; text-align: right; }
    .summary { display: flex; gap: 16px; margin-top: 8px; }
    .summary-card { flex: 1; border-radius: 10px; padding: 14px 18px; }
    .summary-card.green { background: #ecfdf5; border: 1px solid #a7f3d0; }
    .summary-card.red { background: #fff1f2; border: 1px solid #fecdd3; }
    .summary-card.blue { background: #eff6ff; border: 1px solid #bfdbfe; }
    .summary-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; font-weight: 600; }
    .summary-card .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
    .summary-card.green .value { color: #059669; }
    .summary-card.red .value { color: #e11d48; }
    .summary-card.blue .value { color: #2563eb; }
    .footer { margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print {
      body { padding: 16px; }
      @page { margin: 15mm; size: A4 portrait; }
      thead { display: table-header-group; }
      tbody { display: table-row-group; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Wealth<span>Vision</span> AI</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px">Laporan Keuangan Pribadi</div>
    </div>
    <div class="meta">
      <strong>${bulanLabel} ${tahunAktif}</strong><br/>
      Dicetak: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
    </div>
  </div>

  <h2>Detail Transaksi (${filteredData.length} data)</h2>
  <table>
    <thead>
      <tr>
        <th>Tanggal</th>
        <th>Deskripsi</th>
        <th>Kategori</th>
        <th>Jenis</th>
        <th style="text-align:right">Jumlah</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <h2>Ringkasan</h2>
  <div class="summary">
    <div class="summary-card green">
      <div class="label">Total Pemasukan</div>
      <div class="value">${fmtCurrency(totalMasuk)}</div>
    </div>
    <div class="summary-card red">
      <div class="label">Total Pengeluaran</div>
      <div class="value">${fmtCurrency(totalKeluar)}</div>
    </div>
    <div class="summary-card blue">
      <div class="label">Net (Saldo)</div>
      <div class="value">${net >= 0 ? "+" : "-"} ${fmtCurrency(Math.abs(net))}</div>
    </div>
  </div>

  <div class="footer">WealthVision AI &bull; Laporan digenerate otomatis &bull; Hanya untuk keperluan pribadi</div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      toast.error(language === "id" ? "Popup diblokir oleh browser. Harap izinkan popup." : "Popup blocked by browser. Please allow popups.");
    }
  };

  // Helper function to dynamically retrieve category lists based on the active transaction type filter
  const getFilterCategories = () => {
    if (filterJenis === "pengeluaran") return KATEGORI_PENGELUARAN;
    if (filterJenis === "pemasukan") return KATEGORI_PEMASUKAN;
    
    // Merges arrays and removes duplicate categories based on their 'value' property
    const all = [...KATEGORI_PENGELUARAN, ...KATEGORI_PEMASUKAN];
    const uniqueMap = new Map();
    all.forEach(item => {
      if (!uniqueMap.has(item.value)) {
        uniqueMap.set(item.value, item);
      }
    });
    return Array.from(uniqueMap.values());
  };

  // Form category helper
  const getFormCategories = () => {
    return formData.jenis === "pengeluaran" ? KATEGORI_PENGELUARAN : KATEGORI_PEMASUKAN;
  };

  // Calculates total balance derived from the filtered transaction dataset
  const { totalPemasukanFiltered, totalPengeluaranFiltered } = useMemo(() => {
    return {
      totalPemasukanFiltered: filteredData.filter(i => i.jenis === "pemasukan").reduce((sum, item) => sum + item.nominal, 0),
      totalPengeluaranFiltered: filteredData.filter(i => i.jenis === "pengeluaran").reduce((sum, item) => sum + item.nominal, 0)
    };
  }, [filteredData]);
  
  const netTotal = totalPemasukanFiltered - totalPengeluaranFiltered;

  return (
    <main className="max-w-8xl mx-auto space-y-6">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t("history_title")}</h1>
          <p className="text-base text-slate-500 dark:text-slate-400 mt-2">
            {t("history_desc")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 transition-colors duration-200 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">
              download
            </span>
            {t("export_csv")}
          </button>
          <button
            onClick={handleExportPDF}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 transition-colors duration-200 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
            {t("export_pdf")}
          </button>
          <button
            onClick={() => setShowCsvModal(true)}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 transition-colors duration-200 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">upload_file</span>
            {t("import_csv")}
          </button>

        </div>
      </header>

      {/* Controls / Filter Bar */}
      <section className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            search
          </span>
          <input
            className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-slate-800 outline-none transition-all duration-200"
            placeholder={t("search_history_placeholder")}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Jenis Filter */}
          <div className="relative flex-1 md:flex-none">
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none cursor-pointer appearance-none pr-10"
            >
              <option value="all">{t("all_types")}</option>
              <option value="pemasukan">{t("income")}</option>
              <option value="pengeluaran">{t("expense")}</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Category Filter */}
          <div className="relative flex-1 md:flex-none">
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none cursor-pointer appearance-none pr-10"
            >
              <option value="all">{t("all_categories")}</option>
              {getFilterCategories().map((kat) => (
                <option key={kat.value} value={kat.value}>
                  {t(`cat_${kat.value}` as TranslationKey)}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Month/Year Filter */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 w-full md:w-auto">
            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-[18px] shrink-0">
              calendar_today
            </span>
            <div className="flex items-center flex-1 md:flex-none">
              <select
                value={bulanAktif}
                onChange={(e) => setBulanAktif(parseInt(e.target.value))}
                className="w-full md:w-auto bg-transparent outline-none text-sm text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {NAMA_BULAN.map((nama, i) => (
                  <option key={i + 1} value={i + 1}>
                    {nama}
                  </option>
                ))}
              </select>
              <div className="h-5 w-px bg-slate-300 dark:bg-slate-600 mx-2 shrink-0" />
              <select
                value={tahunAktif}
                onChange={(e) => setTahunAktif(parseInt(e.target.value))}
                className="w-full md:w-auto bg-transparent outline-none text-sm text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(
                  (year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Data Table Card */}
      <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse hidden md:table">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("date")}
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("description")}
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("category")}
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                  {t("amount")}
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                  {t("action")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={`skeleton-${i}`}>
                      <td className="py-4 px-6"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-10 h-10 rounded-xl" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </td>
                      <td className="py-4 px-6"><Skeleton className="h-5 w-20" /></td>
                      <td className="py-4 px-6 text-right"><Skeleton className="h-5 w-28 ml-auto" /></td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Skeleton className="w-8 h-8 rounded-lg" />
                          <Skeleton className="w-8 h-8 rounded-lg" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl mb-2">
                      receipt_long
                    </span>
                    <p className="text-sm">
                      {searchQuery || filterKategori !== "all" || filterJenis !== "all"
                        ? t("no_match_filter")
                        : t("no_transactions_month")}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => {
                  const ui = getKategoriUI(item.kategori);
                  const isPemasukan = item.jenis === "pemasukan";
                  
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800/60 transition-colors duration-150 group"
                    >
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="text-sm text-slate-700 dark:text-slate-200">
                          {formatTanggal(item.tanggal)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {item.deskripsi || t(`cat_${item.kategori}` as TranslationKey)}
                          </span>
                          <span className={`text-xs ${isPemasukan ? "text-emerald-500" : "text-rose-500"}`}>
                            {isPemasukan ? t("income") : t("expense")}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${ui.badgeBg} ${ui.badgeText}`}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {ui.icon}
                          </span>
                          {t(`cat_${item.kategori}` as TranslationKey)}
                        </span>
                      </td>
                      <td className={`py-4 px-6 whitespace-nowrap text-right text-sm font-bold ${isPemasukan ? "text-emerald-600" : "text-rose-600"}`}>
                        {isPemasukan ? "+" : "-"} {formatCurrency(item.nominal, currency)}
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(item);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            aria-label={`Edit transaksi ${item.deskripsi || ui.label}`}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              edit
                            </span>
                            {t("edit")}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteConfirm(item);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-100 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-900/40 transition-colors"
                            aria-label={`Hapus transaksi ${item.deskripsi || ui.label}`}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              delete
                            </span>
                            {t("delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* --- MOBILE CARDS VIEW --- */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={`mob-skel-${i}`} className="flex gap-4 items-center">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : paginatedData.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2">receipt_long</span>
                <p className="text-sm">
                  {searchQuery || filterKategori !== "all" || filterJenis !== "all"
                    ? t("no_match_filter")
                    : t("no_transactions_month")}
                </p>
              </div>
            ) : (
              paginatedData.map((item) => {
                const ui = getKategoriUI(item.kategori);
                const isPemasukan = item.jenis === "pemasukan";
                return (
                  <div key={item.id} className="p-4 flex flex-col gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${ui.badgeBg} ${ui.badgeText}`}>
                          <span className="material-symbols-outlined text-lg">{ui.icon}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                            {item.deskripsi || t(`cat_${item.kategori}` as TranslationKey)}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {formatTanggal(item.tanggal)}
                          </span>
                        </div>
                      </div>
                      <div className={`shrink-0 text-right text-sm font-bold ${isPemasukan ? "text-emerald-600" : "text-rose-600"}`}>
                        {isPemasukan ? "+" : "-"}{formatCurrency(item.nominal, currency)}
                      </div>
                    </div>
                    
                    {/* Card Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                        {t("edit")}
                      </button>
                      <button
                        onClick={() => handleOpenDeleteConfirm(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-100 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-900/40"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        {t("delete")}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Table Footer / Pagination */}
        <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col gap-1 text-center sm:text-left">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Menampilkan {filteredData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}{" "}
              - {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length)} dari{" "}
              {filteredData.length} data
            </span>
            <div className="flex items-center justify-center sm:justify-start gap-3 mt-1">
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                Masuk: {formatCurrency(totalPemasukanFiltered, currency)}
              </span>
              <span className="text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded">
                Keluar: {formatCurrency(totalPengeluaranFiltered, currency)}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${netTotal >= 0 ? "text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800" : "text-amber-600 bg-amber-50 dark:bg-amber-900/30"}`}>
                Net: {netTotal >= 0 ? "+" : "-"} {formatCurrency(Math.abs(netTotal), currency)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800/60 text-slate-400 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">
                chevron_left
              </span>
            </button>
            {(() => {
              const group = [];
              if (totalPages <= 5) {
                for (let i = 1; i <= totalPages; i++) group.push(i);
              } else {
                if (currentPage <= 3) {
                  group.push(1, 2, 3, 4, '...', totalPages);
                } else if (currentPage >= totalPages - 2) {
                  group.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                } else {
                  group.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                }
              }
              return group.map((page, idx) => (
                <button
                  key={`${page}-${idx}`}
                  onClick={() => typeof page === 'number' && setCurrentPage(page)}
                  disabled={page === '...'}
                  className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-colors ${
                    currentPage === page
                      ? "bg-slate-900 dark:bg-indigo-600 text-white"
                      : page === '...'
                      ? "text-slate-400 cursor-default"
                      : "hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 cursor-pointer"
                  }`}
                >
                  {page}
                </button>
              ));
            })()}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 rounded-lg hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">
                chevron_right
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* === ADD/EDIT TRANSACTION MODAL === */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {editId ? (language === "id" ? "Edit Transaksi" : "Edit Transaction") : t("new_transaction")}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-300"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form className="space-y-4">
              {/* Type Toggle (Only visible when not editing) */}
              {!editId && (
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, jenis: "pengeluaran" })}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      formData.jenis === "pengeluaran"
                        ? "bg-white dark:bg-slate-900 shadow-sm text-rose-600"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {t("expense")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, jenis: "pemasukan" })}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      formData.jenis === "pemasukan"
                        ? "bg-white dark:bg-slate-900 shadow-sm text-emerald-600"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {t("income")}
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  {t("date")}
                </label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) =>
                    setFormData({ ...formData, tanggal: e.target.value })
                  }
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 outline-none bg-white dark:bg-slate-900 focus:ring-2 focus:ring-slate-800"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  {t("category")}
                </label>
                <select
                  value={formData.kategori}
                  onChange={(e) =>
                    setFormData({ ...formData, kategori: e.target.value })
                  }
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 outline-none bg-white dark:bg-slate-900"
                >
                  {getFormCategories().map((kat) => (
                    <option key={kat.value} value={kat.value}>
                      {t(`cat_${kat.value}` as TranslationKey)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  {t("description")}
                </label>
                <input
                  type="text"
                  value={formData.deskripsi}
                  onChange={(e) =>
                    setFormData({ ...formData, deskripsi: e.target.value })
                  }
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-slate-800"
                  placeholder="Contoh: Makan siang klien"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                  {t("amount")}
                </label>
                <input
                  type="text"
                  value={formData.nominal}
                  onChange={(e) =>
                    setFormData({ ...formData, nominal: formatNominalInput(e.target.value) })
                  }
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-slate-800"
                  placeholder="0"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium py-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveExpense}
                  className={`flex-1 text-white font-medium py-3 rounded-lg transition-colors shadow-sm ${
                    formData.jenis === "pemasukan" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-900 dark:bg-indigo-600 text-white hover:bg-slate-800 dark:hover:bg-indigo-700"
                  }`}
                >
                  {editId ? (language === "id" ? "Perbarui" : "Update") : t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === MODAL IMPORT CSV === */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t("import_csv")}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {language === "id" ? "Impor banyak transaksi sekaligus dari file CSV." : "Import multiple transactions at once from a CSV file."}
                </p>
              </div>
              <button
                onClick={handleCloseCsvModal}
                disabled={csvImporting}
                className="text-slate-400 hover:text-slate-600 dark:text-slate-300 disabled:opacity-40"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Template Info */}
            <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-slate-800 dark:text-slate-100 mt-0.5">info</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                    {language === "id" ? "Format kolom CSV yang diharapkan:" : "Expected CSV column format:"}
                  </p>
                  <code className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 block text-slate-900 dark:text-white font-mono">
                    tanggal, jenis, kategori, nominal, deskripsi
                  </code>
                  <p className="text-xs text-slate-800 dark:text-slate-100 mt-2">
                    Contoh: <span className="font-mono">2026-05-01,pengeluaran,makanan,50000,Makan siang</span>
                  </p>
                  <div className="mt-2 text-xs text-slate-800 dark:text-slate-100 space-y-0.5">
                    <p><strong>Jenis:</strong> pemasukan | pengeluaran</p>
                    <p><strong>Kategori Pengeluaran:</strong> makanan, transportasi, hiburan, kesehatan, tagihan, belanja, pendidikan, lainnya</p>
                    <p><strong>Kategori Pemasukan:</strong> gaji, bonus, investasi, lainnya</p>
                  </div>
                  <button
                    onClick={handleDownloadTemplate}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white hover:text-slate-900 dark:text-white underline underline-offset-2"
                  >
                    <span className="material-symbols-outlined text-[14px]">download</span>
                    {language === "id" ? "Unduh Template CSV" : "Download CSV Template"}
                  </button>
                </div>
              </div>
            </div>

            {/* File Input */}
            {!csvImporting && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                  {language === "id" ? "Pilih File CSV" : "Select CSV File"}
                </label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800/40 transition-colors group">
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleCsvFileChange}
                    disabled={csvImporting}
                  />
                  <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-slate-800 dark:text-slate-100 transition-colors">upload_file</span>
                  {csvFile ? (
                    <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{csvFile.name}</p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-400">
                      {language === "id" ? "Klik untuk memilih file " : "Click to select a "}
                      <span className="font-semibold text-slate-600 dark:text-slate-300">.csv</span>
                      {language === "id" ? "" : " file"}
                    </p>
                  )}
                </label>
              </div>
            )}

            {/* Validation Errors */}
            {csvErrors.length > 0 && (
              <div className="bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-rose-500 text-[18px]">error</span>
                  <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                    {csvErrors.length} {language === "id" ? "baris memiliki kesalahan (baris ini dilewati):" : "rows have errors (these will be skipped):"}
                  </p>
                </div>
                <ul className="space-y-1 max-h-28 overflow-y-auto">
                  {csvErrors.map((err, i) => (
                    <li key={i} className="text-xs text-rose-600 flex items-start gap-1.5">
                      <span className="material-symbols-outlined text-[12px] mt-0.5">chevron_right</span>
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview Table */}
            {csvParsed && csvPreview.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Preview Data Valid
                    <span className="ml-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">
                      {csvPreview.length} {language === "id" ? "baris" : "rows"}
                    </span>
                  </p>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                      <tr>
                        <th className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t("date")}</th>
                        <th className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{language === "id" ? "Jenis" : "Type"}</th>
                        <th className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t("category")}</th>
                        <th className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase text-right">{t("amount")}</th>
                        <th className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">{t("description")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {csvPreview.slice(0, 5).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800/60">
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200 whitespace-nowrap">{row.tanggal}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              row.jenis === "pemasukan" ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400" : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400"
                            }`}>
                              {row.jenis}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-600 dark:text-slate-300 capitalize">{row.kategori}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200 text-right font-medium whitespace-nowrap">Rp {formatRupiah(row.nominal)}</td>
                          <td className="px-3 py-2 text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{row.deskripsi || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {csvPreview.length > 5 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                    ... {language === "id" ? "dan" : "and"} <strong>{csvPreview.length - 5}</strong> {language === "id" ? "baris lainnya" : "more rows"}
                  </p>
                )}
              </div>
            )}

            {csvParsed && csvPreview.length === 0 && csvErrors.length === 0 && (
              <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
                {language === "id" ? "File CSV kosong atau tidak ada data yang dapat dibaca." : "CSV file is empty or no readable data found."}
              </div>
            )}

            {/* Progress Bar */}
            {csvImporting && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {language === "id" ? "Mengimpor" : "Importing"} {csvProgress.current} {t("from")} {csvProgress.total} {language === "id" ? "transaksi" : "transactions"}...
                  </p>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {Math.round((csvProgress.current / csvProgress.total) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
                  <div
                    className="bg-slate-800 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${(csvProgress.current / csvProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 text-center">
                  {language === "id" ? "Mohon jangan tutup halaman ini..." : "Please do not close this page..."}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {!csvImporting && (
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseCsvModal}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium py-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleCsvImport}
                  disabled={!csvParsed || csvPreview.length === 0}
                  className="flex-1 bg-slate-800 text-white font-semibold py-3 rounded-lg hover:bg-slate-900 dark:bg-slate-100 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">upload</span>
                  {language === "id" ? "Upload & Proses" : "Upload & Process"} ({csvPreview.length} {language === "id" ? "transaksi" : "transactions"})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === DELETE CONFIRMATION MODAL === */}
      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Tutup konfirmasi hapus transaksi"
            onClick={handleCloseDeleteConfirm}
            disabled={isDeleting}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm disabled:cursor-not-allowed"
          />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-rose-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-6">
              <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-rose-600 text-[30px]">
                  delete_forever
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {language === "id" ? "Hapus transaksi ini?" : "Delete this transaction?"}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {language === "id" 
                  ? "Transaksi berikut akan dihapus secara permanen dari riwayat keuangan Anda." 
                  : "The following transaction will be permanently deleted from your financial history."}
              </p>

              <div className="mt-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                      {deleteTarget.deskripsi ||
                        getKategoriLabel(deleteTarget.kategori)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${
                          deleteTarget.jenis === "pemasukan"
                            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                            : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        {deleteTarget.jenis === "pemasukan"
                          ? t("income")
                          : t("expense")}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatTanggal(deleteTarget.tanggal)}
                      </span>
                    </div>
                  </div>
                  <p
                    className={`text-sm font-extrabold whitespace-nowrap ${
                      deleteTarget.jenis === "pemasukan"
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {deleteTarget.jenis === "pemasukan" ? "+" : "-"} Rp{" "}
                    {formatRupiah(deleteTarget.nominal)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-100 p-3 flex gap-3">
                <span className="material-symbols-outlined text-rose-500 text-[20px] flex-shrink-0">
                  warning
                </span>
                <p className="text-xs text-rose-700 dark:text-rose-400">
                  {language === "id" 
                    ? "Tindakan ini tidak dapat dibatalkan setelah transaksi dihapus." 
                    : "This action cannot be undone once the transaction is deleted."}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-lg bg-rose-600 text-sm font-semibold text-white hover:bg-rose-700 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {isDeleting ? (
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
    </main>
  );
}
