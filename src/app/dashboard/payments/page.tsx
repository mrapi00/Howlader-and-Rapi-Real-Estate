"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Edit3,
  Filter,
  X,
} from "lucide-react";

interface PendingSubmission {
  id: string;
  amount: number;
  tenantName: string;
  method: string;
  status: string;
  createdAt: string;
  payment: {
    id: string;
    amount: number;
    paidAmount: number;
    dueDate: string;
    tenancy: {
      tenant: { name: string };
      apartment: { unit: string; property: { address: string } };
    };
  };
}

interface PaymentRow {
  id: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  paidDate: string | null;
  note: string | null;
  tenancy: {
    tenant: { id: string; name: string };
    apartment: { unit: string; property: { address: string } };
  };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "late" | "paid">("all");
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaidAmount, setEditPaidAmount] = useState("");
  const [editPaidDate, setEditPaidDate] = useState("");
  const [editPaymentNote, setEditPaymentNote] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterProperty, setFilterProperty] = useState("");
  const [filterTenant, setFilterTenant] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Payment submissions state
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPayments = () => {
    fetch("/api/payments")
      .then((r) => r.json())
      .then((data) => {
        setPayments(data);
        setLoading(false);
      });
  };

  const fetchPendingSubmissions = () => {
    fetch("/api/payment-submissions")
      .then((r) => r.json())
      .then(setPendingSubmissions);
  };

  useEffect(() => {
    fetchPayments();
    fetchPendingSubmissions();
  }, []);

  const handleSubmissionAction = async (id: string, action: "confirm" | "reject") => {
    setProcessingId(id);
    await fetch("/api/payment-submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    setProcessingId(null);
    fetchPendingSubmissions();
    fetchPayments();
  };

  const toggleSelection = (id: string) => {
    setSelectedPayments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    const unpaid = filtered.filter((p) => p.amount - p.paidAmount > 0);
    if (unpaid.every((p) => selectedPayments.has(p.id))) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(new Set(unpaid.map((p) => p.id)));
    }
  };

  const markSelectedAsPaid = async () => {
    const toMark = payments.filter((p) => selectedPayments.has(p.id));
    await Promise.all(
      toMark.map((p) =>
        fetch("/api/payments", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: p.id, paidAmount: p.amount, paidDate: new Date().toISOString() }),
        })
      )
    );
    setSelectedPayments(new Set());
    fetchPayments();
  };

  const startEdit = (p: PaymentRow) => {
    setEditingPaymentId(p.id);
    setEditPaidAmount(String(p.paidAmount));
    setEditPaidDate(p.paidDate ? p.paidDate.split("T")[0] : new Date().toISOString().split("T")[0]);
    setEditPaymentNote(p.note || "");
  };

  const saveEdit = async () => {
    if (!editingPaymentId) return;
    await fetch("/api/payments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingPaymentId,
        paidAmount: parseFloat(editPaidAmount),
        paidDate: parseFloat(editPaidAmount) > 0 ? editPaidDate : null,
        note: editPaymentNote || null,
      }),
    });
    setEditingPaymentId(null);
    fetchPayments();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="w-8 h-8 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const now = new Date();
  const filtered = payments.filter((p) => {
    const balance = p.amount - p.paidAmount;
    const isPast = new Date(p.dueDate) < now;
    if (filter === "late") return balance > 0 && isPast;
    if (filter === "paid") return balance === 0;
    return true;
  });

  const dateFiltered = filtered.filter((p) => {
    const d = new Date(p.dueDate);
    if (filterYear && d.getFullYear() !== parseInt(filterYear)) return false;
    if (filterMonth && d.getMonth() !== parseInt(filterMonth)) return false;
    if (filterProperty && p.tenancy.apartment.property.address !== filterProperty) return false;
    if (filterTenant && p.tenancy.tenant.name !== filterTenant) return false;
    return true;
  });

  const availableYears = Array.from(
    new Set(payments.map((p) => new Date(p.dueDate).getFullYear()))
  ).sort((a, b) => b - a);

  const availableProperties = Array.from(
    new Set(payments.map((p) => p.tenancy.apartment.property.address))
  ).sort();

  const availableTenants = Array.from(
    new Set(
      payments
        .filter((p) => !filterProperty || p.tenancy.apartment.property.address === filterProperty)
        .map((p) => p.tenancy.tenant.name)
    )
  ).sort();

  const totalPages = Math.ceil(dateFiltered.length / ITEMS_PER_PAGE);
  const paginatedPayments = dateFiltered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalOutstanding = payments
    .filter((p) => new Date(p.dueDate) < now)
    .reduce((sum, p) => sum + (p.amount - p.paidAmount), 0);

  const lateCount = payments.filter(
    (p) => p.amount - p.paidAmount > 0 && new Date(p.dueDate) < now
  ).length;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="text-gray-500 text-sm mt-1">{payments.length} total payment records</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card animate-slide-up">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${totalOutstanding > 0 ? "bg-red-50" : "bg-emerald-50"}`}>
              <DollarSign className={`w-5 h-5 ${totalOutstanding > 0 ? "text-red-600" : "text-emerald-600"}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding</p>
              <p className={`text-2xl font-bold ${totalOutstanding > 0 ? "text-red-600" : "text-emerald-600"}`}>
                ${totalOutstanding.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="stat-card animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Late Payments</p>
              <p className="text-2xl font-bold text-gray-900">{lateCount}</p>
            </div>
          </div>
        </div>
        <div className="stat-card animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Payment Submissions */}
      {pendingSubmissions.length > 0 && (
        <div className="glass-card-solid overflow-hidden mb-6 border-l-4 border-amber-500 animate-slide-up">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="text-sm font-bold text-gray-800">
              Pending Payment Submissions
            </h2>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
              {pendingSubmissions.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingSubmissions.map((s) => (
              <div key={s.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">{s.tenantName}</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                      {s.method}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {s.payment.tenancy.apartment.property.address} - Apt {s.payment.tenancy.apartment.unit}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Submitted {new Date(s.createdAt).toLocaleDateString()} &middot; For{" "}
                    {new Date(s.payment.dueDate).toLocaleDateString()} rent
                  </p>
                </div>
                <div className="text-right mr-4">
                  <p className="text-lg font-bold text-gray-900">${s.amount.toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSubmissionAction(s.id, "confirm")}
                    disabled={processingId === s.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Confirm
                  </button>
                  <button
                    onClick={() => handleSubmissionAction(s.id, "reject")}
                    disabled={processingId === s.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterProperty}
            onChange={(e) => { setFilterProperty(e.target.value); setFilterTenant(""); setCurrentPage(1); }}
            className="select-field py-2 px-3 text-sm min-w-[160px]"
          >
            <option value="">All Properties</option>
            {availableProperties.map((addr) => (
              <option key={addr} value={addr}>{addr}</option>
            ))}
          </select>
          <select
            value={filterTenant}
            onChange={(e) => { setFilterTenant(e.target.value); setCurrentPage(1); }}
            className="select-field py-2 px-3 text-sm min-w-[160px]"
          >
            <option value="">All Tenants</option>
            {availableTenants.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={(e) => { setFilterYear(e.target.value); setCurrentPage(1); }}
            className="select-field py-2 px-3 text-sm min-w-[120px]"
          >
            <option value="">All Years</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={filterMonth}
            onChange={(e) => { setFilterMonth(e.target.value); setCurrentPage(1); }}
            className="select-field py-2 px-3 text-sm min-w-[140px]"
          >
            <option value="">All Months</option>
            {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
        </div>
        {(filterYear || filterMonth || filterProperty || filterTenant) && (
          <button
            onClick={() => { setFilterYear(""); setFilterMonth(""); setFilterProperty(""); setFilterTenant(""); setCurrentPage(1); }}
            className="btn-ghost text-xs font-semibold text-gray-500 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Clear Filters
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {dateFiltered.length} record{dateFiltered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Payments Table */}
      <div className="glass-card-solid overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-3">
          <div className="flex gap-2">
            {(["all", "late", "paid"] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  filter === f
                    ? "bg-brand-500 text-white shadow-md shadow-brand-500/25"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f === "all" ? "All" : f === "late" ? "Late / Partial" : "Paid"}
              </button>
            ))}
          </div>
          {selectedPayments.size > 0 && (
            <button
              onClick={markSelectedAsPaid}
              className="btn-success flex items-center gap-2 text-xs animate-slide-up"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mark {selectedPayments.size} Selected as Paid
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-center py-3 px-3 w-10">
                  <input
                    type="checkbox"
                    checked={
                      filtered.filter((p) => p.amount - p.paidAmount > 0).length > 0 &&
                      filtered
                        .filter((p) => p.amount - p.paidAmount > 0)
                        .every((p) => selectedPayments.has(p.id))
                    }
                    onChange={toggleSelectAllFiltered}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    title="Select all unpaid"
                  />
                </th>
                <th className="text-left py-3 px-4">Tenant</th>
                <th className="text-left py-3 px-4">Property</th>
                <th className="text-left py-3 px-4">Due Date</th>
                <th className="text-right py-3 px-4">Due</th>
                <th className="text-right py-3 px-4">Paid</th>
                <th className="text-right py-3 px-4">Balance</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-center py-3 px-4 w-20">Edit</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPayments.map((p) => {
                const balance = p.amount - p.paidAmount;
                const isPast = new Date(p.dueDate) < now;
                const isPaid = balance === 0;
                const isEditing = editingPaymentId === p.id;

                if (isEditing) {
                  return (
                    <tr key={p.id} className="border-b border-brand-100 bg-brand-50/50">
                      <td className="py-3 px-3" />
                      <td className="py-3 px-4 font-semibold text-gray-800">
                        <Link href={`/dashboard/tenants/${p.tenancy.tenant.id}`} className="text-brand-600 hover:text-brand-700 hover:underline transition-colors">
                          {p.tenancy.tenant.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-xs">
                        {p.tenancy.apartment.property.address} - {p.tenancy.apartment.unit}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(p.dueDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-800">
                        ${p.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={p.amount}
                          value={editPaidAmount}
                          onChange={(e) => setEditPaidAmount(e.target.value)}
                          className="w-24 input-field text-right py-1.5 px-2 text-sm"
                          autoFocus
                        />
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-500">
                        ${(p.amount - parseFloat(editPaidAmount || "0")).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          value={editPaymentNote}
                          onChange={(e) => setEditPaymentNote(e.target.value)}
                          className="w-full input-field py-1.5 px-2 text-xs"
                          placeholder="Note"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            onClick={saveEdit}
                            className="bg-brand-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-brand-600 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingPaymentId(null)}
                            className="btn-ghost p-1.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={p.id}
                    className={`table-row ${selectedPayments.has(p.id) ? "!bg-brand-50/60" : ""}`}
                  >
                    <td className="py-3 px-3 text-center">
                      {!isPaid ? (
                        <input
                          type="checkbox"
                          checked={selectedPayments.has(p.id)}
                          onChange={() => toggleSelection(p.id)}
                          className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        />
                      ) : (
                        <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                          <Check className="w-3 h-3 text-emerald-600" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      <Link href={`/dashboard/tenants/${p.tenancy.tenant.id}`} className="text-brand-600 hover:text-brand-700 hover:underline transition-colors">
                        {p.tenancy.tenant.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {p.tenancy.apartment.property.address} - {p.tenancy.apartment.unit}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
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
                      {isPaid ? (
                        <span className="badge-success">Paid</span>
                      ) : isPast ? (
                        <span className="badge-danger">
                          {p.paidAmount > 0 ? "Partial" : "Late"}
                        </span>
                      ) : (
                        <span className="badge-warning">Upcoming</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => startEdit(p)}
                        className="btn-ghost p-1.5 text-gray-400 hover:text-brand-600"
                        title="Edit payment"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {dateFiltered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">No payments match this filter</p>
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
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, dateFiltered.length)} of {dateFiltered.length}
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
    </div>
  );
}
