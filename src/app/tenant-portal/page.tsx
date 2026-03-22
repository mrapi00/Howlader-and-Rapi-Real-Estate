"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  FileText,
  Filter,
  Home,
  LogOut,
  Paperclip,
  Phone,
  Send,
  User,
  X,
} from "lucide-react";

interface PropertyOption {
  id: string;
  address: string;
}

interface ApartmentOption {
  id: string;
  unit: string;
}

interface TenantData {
  tenant: { name: string };
  property: string;
  unit: string;
  monthlyRent: number;
  startDate: string;
  outstandingBalance: number;
  payments: {
    id: string;
    amount: number;
    paidAmount: number;
    dueDate: string;
    paidDate: string | null;
    note: string | null;
    paymentSubmissions?: { id: string; amount: number; method: string; status: string }[];
  }[];
  documents: {
    id: string;
    name: string;
    fileType: string;
    createdAt: string;
  }[];
}

export default function TenantPortalPage() {
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [apartments, setApartments] = useState<ApartmentOption[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedApartment, setSelectedApartment] = useState("");
  const [verifyName, setVerifyName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tenantData, setTenantData] = useState<TenantData | null>(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Payment submission modal state
  const [submitPayment, setSubmitPayment] = useState<{ id: string; amount: number } | null>(null);
  const [submitAmount, setSubmitAmount] = useState("");
  const [submitMethod, setSubmitMethod] = useState("Zelle");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Cancel confirmation state
  const [cancelConfirm, setCancelConfirm] = useState<{ submissionId: string; paymentId: string } | null>(null);

  // Document viewer state (for in-app viewing on mobile)
  const [viewingDoc, setViewingDoc] = useState<{ id: string; name: string; fileType: string } | null>(null);

  // Install app state
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showIOSInstall, setShowIOSInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);
    if (standalone) return;

    // Android/Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari
    const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    if (isIOS) setShowIOSInstall(true);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      (installPrompt as unknown as { prompt(): void }).prompt();
      setInstallPrompt(null);
    } else if (showIOSInstall) {
      setShowIOSInstall(false);
      // Show a temporary alert with instructions
      alert('To install this app:\n\n1. Tap the Share button (square with arrow)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add"');
    }
  };

  // Restore session on page load
  useEffect(() => {
    fetch("/api/tenant-portal")
      .then((r) => r.json())
      .then(setProperties);

    const saved = sessionStorage.getItem("tenantSession");
    if (saved) {
      const { apartmentId, name: savedName } = JSON.parse(saved);
      fetch("/api/tenant-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apartmentId, name: savedName }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setTenantData(data);
          else sessionStorage.removeItem("tenantSession");
        });
    }
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      fetch(`/api/tenant-portal?propertyId=${selectedProperty}`)
        .then((r) => r.json())
        .then((data) => {
          setApartments(data);
          setSelectedApartment("");
        });
    }
  }, [selectedProperty]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/tenant-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apartmentId: selectedApartment,
        name: verifyName,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      setTenantData(null);
    } else {
      setTenantData(data);
      sessionStorage.setItem("tenantSession", JSON.stringify({ apartmentId: selectedApartment, name: verifyName }));
    }
  };

  const openPaymentModal = (paymentId: string, balance: number, pendingTotal: number) => {
    const remaining = Math.max(0, balance - pendingTotal);
    setSubmitPayment({ id: paymentId, amount: remaining });
    setSubmitAmount(String(remaining));
    setSubmitMethod("Zelle");
    setSubmitSuccess(false);
  };

  const handleSubmitPayment = async () => {
    if (!submitPayment || !tenantData) return;
    setSubmitting(true);
    const res = await fetch("/api/payment-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentId: submitPayment.id,
        amount: parseFloat(submitAmount),
        tenantName: tenantData.tenant.name,
        method: submitMethod,
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      setSubmitSuccess(true);
      setTenantData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          payments: prev.payments.map((p) =>
            p.id === submitPayment.id
              ? {
                  ...p,
                  paymentSubmissions: [
                    ...(p.paymentSubmissions || []),
                    { id: "temp", amount: parseFloat(submitAmount), method: submitMethod, status: "PENDING" },
                  ],
                }
              : p
          ),
        };
      });
      setTimeout(() => {
        setSubmitPayment(null);
        setSubmitSuccess(false);
      }, 2000);
    }
  };

  const cancelSubmission = async (submissionId: string, paymentId: string) => {
    await fetch("/api/payment-submissions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: submissionId }),
    });
    setCancelConfirm(null);
    setTenantData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        payments: prev.payments.map((p) =>
          p.id === paymentId
            ? { ...p, paymentSubmissions: (p.paymentSubmissions || []).filter((s) => s.id !== submissionId) }
            : p
        ),
      };
    });
  };

  // Tenant Dashboard View
  if (tenantData) {
    const filteredPayments = tenantData.payments.filter((p) => {
      const due = new Date(p.dueDate);
      if (dateFrom && due < new Date(dateFrom + "T00:00:00")) return false;
      if (dateTo && due > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });

    const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
    const paginatedPayments = filteredPayments.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );

    return (
      <div className="min-h-screen bg-[#f8f9fb]">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 12l10-9 10 9M4 10v10a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h4a1 1 0 001-1V10" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Tenant Portal</p>
                <p className="text-xs text-gray-500">Welcome, {tenantData.tenant.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isStandalone && (installPrompt || showIOSInstall) && (
                <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install App
                </button>
              )}
              <button
                onClick={() => {
                  setTenantData(null);
                  setVerifyName("");
                  setDateFrom("");
                  setDateTo("");
                  setCurrentPage(1);
                  sessionStorage.removeItem("tenantSession");
                }}
                className="btn-ghost flex items-center gap-2 text-xs text-gray-500"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 py-8 animate-fade-in">
          {/* Property Info */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
            <Building2 className="w-3.5 h-3.5" />
            <span>{tenantData.property} - Apt {tenantData.unit}</span>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="stat-card animate-slide-up">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Monthly Rent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${tenantData.monthlyRent.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="stat-card animate-slide-up">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tenant Since</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {new Date(tenantData.startDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="stat-card animate-slide-up">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  tenantData.outstandingBalance > 0 ? "bg-red-50" : "bg-emerald-50"
                }`}>
                  <DollarSign className={`w-5 h-5 ${
                    tenantData.outstandingBalance > 0 ? "text-red-600" : "text-emerald-600"
                  }`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding</p>
                  <p className={`text-2xl font-bold ${
                    tenantData.outstandingBalance > 0 ? "text-red-600" : "text-emerald-600"
                  }`}>
                    ${tenantData.outstandingBalance.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="glass-card-solid overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-brand-600" />
              </div>
              <h2 className="text-sm font-bold text-gray-800">Payment History</h2>
            </div>

            {/* Date Range Filter */}
            <div className="px-6 py-3 border-b border-gray-50 flex flex-wrap items-center gap-3">
              <Filter className="w-4 h-4 text-gray-400" />
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 font-medium">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                  className="input-field py-1.5 px-2.5 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 font-medium">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                  className="input-field py-1.5 px-2.5 text-sm"
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  onClick={() => { setDateFrom(""); setDateTo(""); setCurrentPage(1); }}
                  className="btn-ghost text-xs font-semibold text-gray-500 flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
              <span className="text-xs text-gray-400 ml-auto">
                {filteredPayments.length} record{filteredPayments.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="text-left py-3 px-4">Due Date</th>
                    <th className="text-right py-3 px-4">Amount Due</th>
                    <th className="text-right py-3 px-4">Paid</th>
                    <th className="text-right py-3 px-4">Balance</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-center py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map((p) => {
                    const balance = p.amount - p.paidAmount;
                    const isPast = new Date(p.dueDate) < new Date();
                    const pending = p.paymentSubmissions || [];
                    const pendingTotal = pending.reduce((sum, s) => sum + s.amount, 0);
                    const remainingAfterPending = balance - pendingTotal;
                    return (
                      <tr key={p.id} className="table-row">
                        <td className="py-3 px-4 text-gray-800 font-medium">
                          {new Date(p.dueDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-800">
                          ${p.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-800">
                          ${p.paidAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          <span className={balance > 0 ? "text-red-600" : "text-emerald-600"}>
                            ${balance.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {balance === 0 ? (
                            <span className="badge-success">Paid</span>
                          ) : isPast ? (
                            <span className="badge-danger">
                              {p.paidAmount > 0 ? "Partial" : "Late"}
                            </span>
                          ) : (
                            <span className="badge-warning">Upcoming</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col items-center gap-1.5">
                            {pending.map((s) => (
                              <div key={s.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                                <Clock className="w-3 h-3" />
                                ${s.amount.toLocaleString()} {s.method}
                                <button
                                  onClick={() => setCancelConfirm({ submissionId: s.id, paymentId: p.id })}
                                  className="ml-0.5 hover:text-red-600 transition-colors"
                                  title="Cancel this submission"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            {balance > 0 && remainingAfterPending > 0 && (
                              <button
                                onClick={() => openPaymentModal(p.id, balance, pendingTotal)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-sm"
                              >
                                <Send className="w-3 h-3" />
                                {pending.length > 0 ? `Pay $${remainingAfterPending.toLocaleString()}` : "Submit Payment"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">No payments in this date range</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredPayments.length)} of {filteredPayments.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce<(number | "...")[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1]) > 1) acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "..." ? (
                        <span key={`dots-${i}`} className="px-2 text-gray-400 text-xs">...</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-200 ${
                            currentPage === p
                              ? "bg-brand-500 text-white shadow-md shadow-brand-500/25"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Payment Submission Modal */}
          {submitPayment && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
                {submitSuccess ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Submitted!</h3>
                    <p className="text-sm text-gray-500">Your landlord will verify and confirm the payment.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-lg font-bold text-gray-900">Submit Payment</h3>
                      <button
                        onClick={() => setSubmitPayment(null)}
                        className="btn-ghost p-1.5 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="mb-5">
                      <label className="label">Payment Method</label>
                      <div className="grid grid-cols-3 gap-2">
                        {["Zelle", "Cash App", "Cash"].map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setSubmitMethod(method)}
                            className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                              submitMethod === method
                                ? "bg-brand-600 text-white border-brand-600 shadow-md"
                                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(submitMethod === "Zelle" || submitMethod === "Cash App") && (
                      <div className="bg-blue-50 rounded-xl p-4 mb-5">
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
                          Send {submitMethod} to
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Phone className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-gray-900 tracking-wide">(646) 427-4284</p>
                            <p className="text-xs text-gray-500">Moslah Howlader</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mb-5">
                      <label className="label">Amount</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={submitPayment.amount}
                          value={submitAmount}
                          onChange={(e) => setSubmitAmount(e.target.value)}
                          className="input-field pl-10 text-lg font-semibold"
                        />
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
                      {submitMethod === "Cash" ? (
                        <p className="text-xs text-amber-800">
                          After paying <strong>${parseFloat(submitAmount || "0").toLocaleString()}</strong> in cash to your landlord, click below to record it.
                        </p>
                      ) : (
                        <>
                          <p className="text-xs text-amber-800">
                            <strong>Step 1:</strong> Send <strong>${parseFloat(submitAmount || "0").toLocaleString()}</strong> via {submitMethod} to <strong>(646) 427-4284</strong>.
                          </p>
                          <p className="text-xs text-amber-800 mt-1">
                            <strong>Step 2:</strong> After sending, click the button below to notify your landlord.
                          </p>
                        </>
                      )}
                    </div>

                    <button
                      onClick={handleSubmitPayment}
                      disabled={submitting || !submitAmount || parseFloat(submitAmount) <= 0}
                      className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Submitting...
                        </span>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          I&apos;ve Made This Payment
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Cancel Confirmation Modal */}
          {cancelConfirm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-slide-up">
                <div className="text-center">
                  <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X className="w-7 h-7 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Cancel Submission?</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Are you sure you want to cancel this pending payment? This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCancelConfirm(null)}
                      className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      Keep It
                    </button>
                    <button
                      onClick={() => cancelSubmission(cancelConfirm.submissionId, cancelConfirm.paymentId)}
                      className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
                    >
                      Yes, Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents */}
          {tenantData.documents.length > 0 && (
            <div className="glass-card-solid p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-brand-600" />
                </div>
                <h2 className="text-sm font-bold text-gray-800">Your Documents</h2>
              </div>
              <div className="space-y-2">
                {tenantData.documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setViewingDoc(doc)}
                    className="flex items-center gap-3 bg-gray-50 rounded-xl p-3.5 hover:bg-brand-50/50 transition-colors group w-full text-left"
                  >
                    <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center border border-gray-200 group-hover:border-brand-200 transition-colors">
                      {doc.fileType.includes("pdf") ? (
                        <FileText className="w-4 h-4 text-brand-500" />
                      ) : (
                        <Paperclip className="w-4 h-4 text-brand-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 group-hover:text-brand-600 transition-colors">
                        {doc.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Document Viewer Modal */}
          {viewingDoc && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
                <p className="text-sm font-semibold text-gray-800 truncate flex-1 mr-3">{viewingDoc.name}</p>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="w-9 h-9 bg-gray-100 hover:bg-red-100 rounded-xl flex items-center justify-center text-gray-600 hover:text-red-600 transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <iframe
                  src={`/api/documents?id=${viewingDoc.id}`}
                  className="w-full h-full min-h-[80vh]"
                  title={viewingDoc.name}
                />
              </div>
            </div>
          )}
        </div>

      </div>
    );
  }

  // Login View
  return (
    <div className="min-h-screen bg-hero-pattern flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 12l10-9 10 9M4 10v10a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h4a1 1 0 001-1V10" />
              </svg>
            </div>
            <span className="text-white text-xl font-bold tracking-tight">Howlader Estate</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-glass-lg p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <User className="w-7 h-7 text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tenant Portal</h1>
            <p className="text-sm text-gray-500 mt-1">
              Select your building, apartment, and enter your full name
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-5 text-sm font-medium flex items-center gap-2 ring-1 ring-red-200">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
              {error}
            </div>
          )}

          <form onSubmit={handleLookup} className="space-y-5">
            <div>
              <label className="label">Building</label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="select-field pl-10"
                  required
                >
                  <option value="">Select a building...</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.address}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Apartment</label>
              <div className="relative">
                <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedApartment}
                  onChange={(e) => setSelectedApartment(e.target.value)}
                  className="select-field pl-10"
                  required
                  disabled={!selectedProperty}
                >
                  <option value="">Select an apartment...</option>
                  {apartments.map((a) => (
                    <option key={a.id} value={a.id}>
                      Apt {a.unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={verifyName}
                  onChange={(e) => setVerifyName(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Looking up...
                </span>
              ) : (
                "View My Account"
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6">
          <Link href="/" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
