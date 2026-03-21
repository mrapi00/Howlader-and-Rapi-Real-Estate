"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Edit3,
  EyeOff,
  FileText,
  Filter,
  Image,
  Mail,
  Paperclip,
  Phone,
  Plus,
  Save,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";

interface TenantDetail {
  id: string;
  name: string;
  dob: string;
  phone: string | null;
  email: string | null;
  tenancies: {
    id: string;
    isActive: boolean;
    monthlyRent: number;
    startDate: string;
    endDate: string | null;
    apartment: { id: string; unit: string; property: { id: string; address: string } };
    payments: {
      id: string;
      amount: number;
      paidAmount: number;
      dueDate: string;
      paidDate: string | null;
      note: string | null;
    }[];
    documents: {
      id: string;
      name: string;
      fileType: string;
      isPrivate: boolean;
      createdAt: string;
    }[];
  }[];
}

interface PropertyOption {
  id: string;
  address: string;
  apartments: { id: string; unit: string }[];
}

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const [editingTenancy, setEditingTenancy] = useState<string | null>(null);
  const [editRent, setEditRent] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editPropertyId, setEditPropertyId] = useState("");
  const [editApartmentId, setEditApartmentId] = useState("");
  const [properties, setProperties] = useState<PropertyOption[]>([]);

  const [showRecordPayment, setShowRecordPayment] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNote, setPaymentNote] = useState("");

  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaidAmount, setEditPaidAmount] = useState("");
  const [editPaidDate, setEditPaidDate] = useState("");
  const [editPaymentNote, setEditPaymentNote] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchTenant = () => {
    fetch(`/api/tenants?id=${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setTenant(data);
        setEditName(data.name);
        setEditDob(data.dob.split("T")[0]);
        setEditPhone(data.phone || "");
        setEditEmail(data.email || "");
      });
  };

  useEffect(() => {
    fetchTenant();
    fetch("/api/properties")
      .then((r) => r.json())
      .then(setProperties);
  }, [params.id]);

  const saveEdit = async () => {
    await fetch("/api/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: tenant!.id,
        name: editName,
        dob: editDob,
        phone: editPhone || null,
        email: editEmail || null,
      }),
    });
    setEditing(false);
    fetchTenant();
  };

  const saveTenancyEdit = async (tenancyId: string) => {
    await fetch("/api/tenancies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: tenancyId,
        monthlyRent: parseFloat(editRent),
        startDate: editStartDate,
        apartmentId: editApartmentId,
      }),
    });
    setEditingTenancy(null);
    fetchTenant();
  };

  const togglePaymentSelection = (paymentId: string) => {
    setSelectedPayments((prev) => {
      const next = new Set(prev);
      if (next.has(paymentId)) next.delete(paymentId);
      else next.add(paymentId);
      return next;
    });
  };

  const toggleSelectAll = (payments: { id: string; amount: number; paidAmount: number }[]) => {
    const unpaid = payments.filter((p) => p.amount - p.paidAmount > 0);
    if (unpaid.every((p) => selectedPayments.has(p.id))) {
      setSelectedPayments(new Set());
    } else {
      setSelectedPayments(new Set(unpaid.map((p) => p.id)));
    }
  };

  const markSelectedAsPaid = async (payments: { id: string; amount: number }[]) => {
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
    fetchTenant();
  };

  const startEditPayment = (p: { id: string; paidAmount: number; paidDate: string | null; note: string | null }) => {
    setEditingPaymentId(p.id);
    setEditPaidAmount(String(p.paidAmount));
    setEditPaidDate(p.paidDate ? p.paidDate.split("T")[0] : new Date().toISOString().split("T")[0]);
    setEditPaymentNote(p.note || "");
  };

  const savePaymentEdit = async () => {
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
    fetchTenant();
  };

  const recordPayment = async (e: React.FormEvent, tenancyId: string) => {
    e.preventDefault();
    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenancyId,
        amount: parseFloat(paymentAmount),
        paidDate: paymentDate,
        note: paymentNote || undefined,
      }),
    });
    setPaymentAmount("");
    setPaymentNote("");
    setShowRecordPayment(null);
    fetchTenant();
  };

  const uploadDocument = async (tenancyId: string, file: File, isPrivate: boolean) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tenancyId", tenancyId);
    formData.append("isPrivate", String(isPrivate));
    await fetch("/api/documents", { method: "POST", body: formData });
    fetchTenant();
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm("Delete this document?")) return;
    await fetch(`/api/documents?id=${docId}`, { method: "DELETE" });
    fetchTenant();
  };

  const markVacant = async (tenancyId: string) => {
    if (!confirm("Mark this unit as vacant? The tenant data will be archived.")) return;
    await fetch(`/api/tenancies?id=${tenancyId}`, { method: "DELETE" });
    fetchTenant();
  };

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="w-8 h-8 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const activeTenancy = tenant.tenancies.find((t) => t.isActive);
  const archivedTenancies = tenant.tenancies.filter((t) => !t.isActive);

  let outstandingBalance = 0;
  if (activeTenancy) {
    const now = new Date();
    activeTenancy.payments.forEach((p) => {
      if (new Date(p.dueDate) <= now) {
        outstandingBalance += p.amount - p.paidAmount;
      }
    });
  }

  const selectedProperty = properties.find((p) => p.id === editPropertyId);

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/dashboard/tenants"
          className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Tenants
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <h1 className="page-title">{tenant.name}</h1>
      </div>

      {/* Tenant Info Card */}
      <div className="glass-card-solid p-6 mb-6 animate-slide-up">
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-brand-50 rounded-2xl flex items-center justify-center">
              <User className="w-5 h-5 text-brand-600" />
            </div>
            <h2 className="section-title">Tenant Information</h2>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className={`btn-ghost text-xs font-semibold flex items-center gap-1.5 ${editing ? "text-red-500" : "text-brand-600"}`}
          >
            {editing ? <><X className="w-3.5 h-3.5" /> Cancel</> : <><Edit3 className="w-3.5 h-3.5" /> Edit</>}
          </button>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Name</label>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="label">Date of Birth</label>
                <input type="date" value={editDob} onChange={(e) => setEditDob(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="input-field" placeholder="Optional" />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="input-field" placeholder="Optional" />
              </div>
            </div>
            <button onClick={saveEdit} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Name</p>
              <p className="text-sm font-bold text-gray-800">{tenant.name}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date of Birth</p>
              <p className="text-sm font-bold text-gray-800">
                {new Date(tenant.dob).toLocaleDateString("en-US", { timeZone: "UTC" })}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone</p>
              <p className="text-sm font-bold text-gray-800">{tenant.phone || "---"}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email</p>
              <p className="text-sm font-bold text-gray-800">{tenant.email || "---"}</p>
            </div>
          </div>
        )}
      </div>

      {/* Active Tenancy */}
      {activeTenancy && (
        <div className="glass-card-solid p-6 mb-6 animate-slide-up">
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 bg-emerald-50 rounded-2xl flex items-center justify-center mt-0.5">
                <Building2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {activeTenancy.apartment.property.address} - Apt {activeTenancy.apartment.unit}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    Since {new Date(activeTenancy.startDate).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <DollarSign className="w-3 h-3" />
                    ${activeTenancy.monthlyRent.toLocaleString()}/mo
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (editingTenancy === activeTenancy.id) {
                    setEditingTenancy(null);
                  } else {
                    setEditingTenancy(activeTenancy.id);
                    setEditRent(String(activeTenancy.monthlyRent));
                    setEditStartDate(activeTenancy.startDate.split("T")[0]);
                    setEditPropertyId(activeTenancy.apartment.property.id);
                    setEditApartmentId(activeTenancy.apartment.id);
                  }
                }}
                className="btn-ghost text-xs font-semibold text-brand-600 flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {editingTenancy === activeTenancy.id ? "Cancel" : "Edit"}
              </button>
              <button
                onClick={() => markVacant(activeTenancy.id)}
                className="btn-ghost text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                Mark Vacant
              </button>
            </div>
          </div>

          {/* Edit Tenancy Form */}
          {editingTenancy === activeTenancy.id && (
            <div className="bg-brand-50/50 rounded-xl p-4 mb-5 space-y-4 border border-brand-100 animate-slide-up">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Property</label>
                  <select
                    value={editPropertyId}
                    onChange={(e) => { setEditPropertyId(e.target.value); setEditApartmentId(""); }}
                    className="select-field"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>{p.address}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Unit</label>
                  <select
                    value={editApartmentId}
                    onChange={(e) => setEditApartmentId(e.target.value)}
                    className="select-field"
                  >
                    <option value="">Select unit...</option>
                    {selectedProperty?.apartments.map((a) => (
                      <option key={a.id} value={a.id}>Apt {a.unit}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Monthly Rent ($)</label>
                  <input type="number" step="0.01" value={editRent} onChange={(e) => setEditRent(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="label">Start Date</label>
                  <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} className="input-field" />
                </div>
              </div>
              <button onClick={() => saveTenancyEdit(activeTenancy.id)} className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Tenancy Changes
              </button>
            </div>
          )}

          {/* Outstanding Balance */}
          {outstandingBalance > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center gap-3">
              <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-700">
                  Outstanding Balance: ${outstandingBalance.toLocaleString()}
                </p>
                <p className="text-xs text-red-500 mt-0.5">Payment is past due</p>
              </div>
            </div>
          )}

          {/* Payments Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="section-title">Rent Payments</h3>
              <div className="flex gap-2">
                {selectedPayments.size > 0 && (
                  <button
                    onClick={() => markSelectedAsPaid(activeTenancy.payments)}
                    className="btn-success flex items-center gap-1.5 text-xs animate-slide-up"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark {selectedPayments.size} as Paid
                  </button>
                )}
                <button
                  onClick={() =>
                    setShowRecordPayment(
                      showRecordPayment === activeTenancy.id ? null : activeTenancy.id
                    )
                  }
                  className="btn-success flex items-center gap-1.5 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Record Payment
                </button>
              </div>
            </div>

            {showRecordPayment === activeTenancy.id && (
              <form
                onSubmit={(e) => recordPayment(e, activeTenancy.id)}
                className="glass-card-solid p-4 mb-4 space-y-4 border border-emerald-100 animate-slide-up"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Amount</label>
                    <input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="input-field" placeholder="0.00" required />
                  </div>
                  <div>
                    <label className="label">Date Paid</label>
                    <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="input-field" required />
                  </div>
                </div>
                <div>
                  <label className="label">Note</label>
                  <input value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} className="input-field" placeholder="Optional note" />
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="btn-success">Record Payment</button>
                  <button type="button" onClick={() => setShowRecordPayment(null)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            )}

            {/* Date Filter Bar */}
            {(() => {
              const allPayments = activeTenancy.payments;
              const dateFilteredPayments = allPayments.filter((p) => {
                const d = new Date(p.dueDate);
                if (filterYear && d.getFullYear() !== parseInt(filterYear)) return false;
                if (filterMonth && d.getMonth() !== parseInt(filterMonth)) return false;
                return true;
              });
              const paymentYears = Array.from(
                new Set(allPayments.map((p) => new Date(p.dueDate).getFullYear()))
              ).sort((a, b) => b - a);
              const totalPages = Math.ceil(dateFilteredPayments.length / ITEMS_PER_PAGE);
              const paginatedPayments = dateFilteredPayments.slice(
                (currentPage - 1) * ITEMS_PER_PAGE,
                currentPage * ITEMS_PER_PAGE
              );

              return (
                <>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-400" />
                      <select
                        value={filterYear}
                        onChange={(e) => { setFilterYear(e.target.value); setCurrentPage(1); }}
                        className="select-field py-2 px-3 text-sm min-w-[120px]"
                      >
                        <option value="">All Years</option>
                        {paymentYears.map((y) => (
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
                    {(filterYear || filterMonth) && (
                      <button
                        onClick={() => { setFilterYear(""); setFilterMonth(""); setCurrentPage(1); }}
                        className="btn-ghost text-xs font-semibold text-gray-500 flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Clear
                      </button>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">
                      {dateFilteredPayments.length} record{dateFilteredPayments.length !== 1 ? "s" : ""}
                    </span>
                  </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="table-header">
                    <th className="text-center py-3 px-3 w-10">
                      <input
                        type="checkbox"
                        checked={
                          dateFilteredPayments.filter((p) => p.amount - p.paidAmount > 0).length > 0 &&
                          dateFilteredPayments
                            .filter((p) => p.amount - p.paidAmount > 0)
                            .every((p) => selectedPayments.has(p.id))
                        }
                        onChange={() => toggleSelectAll(dateFilteredPayments)}
                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        title="Select all unpaid"
                      />
                    </th>
                    <th className="text-left py-3 px-3">Due Date</th>
                    <th className="text-right py-3 px-3">Due</th>
                    <th className="text-right py-3 px-3">Paid</th>
                    <th className="text-right py-3 px-3">Balance</th>
                    <th className="text-left py-3 px-3">Status</th>
                    <th className="text-left py-3 px-3">Note</th>
                    <th className="text-center py-3 px-3 w-20">Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map((p) => {
                    const balance = p.amount - p.paidAmount;
                    const isPast = new Date(p.dueDate) < new Date();
                    const isPaid = balance === 0;
                    const isEditing = editingPaymentId === p.id;

                    if (isEditing) {
                      return (
                        <tr key={p.id} className="border-b border-brand-100 bg-brand-50/50">
                          <td className="py-3 px-3" />
                          <td className="py-3 px-3 text-gray-800 font-medium">
                            {new Date(p.dueDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 text-right text-gray-800">
                            ${p.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number" step="0.01" min="0" max={p.amount}
                              value={editPaidAmount}
                              onChange={(e) => setEditPaidAmount(e.target.value)}
                              className="w-24 input-field text-right py-1.5 px-2 text-sm"
                              autoFocus
                            />
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-gray-500">
                            ${(p.amount - parseFloat(editPaidAmount || "0")).toLocaleString()}
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="date" value={editPaidDate}
                              onChange={(e) => setEditPaidDate(e.target.value)}
                              className="input-field py-1.5 px-2 text-xs"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <input
                              value={editPaymentNote}
                              onChange={(e) => setEditPaymentNote(e.target.value)}
                              className="w-full input-field py-1.5 px-2 text-xs"
                              placeholder="Note"
                            />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex gap-1 justify-center">
                              <button onClick={savePaymentEdit} className="bg-brand-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-brand-600 transition-colors">
                                Save
                              </button>
                              <button onClick={() => setEditingPaymentId(null)} className="btn-ghost p-1.5">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={p.id} className={`table-row ${selectedPayments.has(p.id) ? "!bg-brand-50/60" : ""}`}>
                        <td className="py-3 px-3 text-center">
                          {!isPaid ? (
                            <input
                              type="checkbox"
                              checked={selectedPayments.has(p.id)}
                              onChange={() => togglePaymentSelection(p.id)}
                              className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                            />
                          ) : (
                            <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                              <Check className="w-3 h-3 text-emerald-600" />
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-800 font-medium">
                          {new Date(p.dueDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3 text-right text-gray-800">
                          ${p.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right text-gray-800">
                          ${p.paidAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold">
                          <span className={balance > 0 ? "text-red-600" : "text-emerald-600"}>
                            ${balance.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {isPaid ? (
                            <span className="badge-success">Paid</span>
                          ) : isPast ? (
                            <span className="badge-danger">{p.paidAmount > 0 ? "Partial" : "Late"}</span>
                          ) : (
                            <span className="badge-warning">Upcoming</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-500 text-xs">{p.note}</td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => startEditPayment(p)}
                            className="btn-ghost p-1.5 text-gray-400 hover:text-brand-600"
                            title="Edit payment"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {dateFilteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">No payments match this filter</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, dateFilteredPayments.length)} of {dateFilteredPayments.length}
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
                </>
              );
            })()}
          </div>

          {/* Documents Section */}
          <div>
            <h3 className="section-title mb-4">Documents & Bookkeeping</h3>
            <div className="space-y-2 mb-4">
              {activeTenancy.documents.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No documents uploaded yet</p>
                </div>
              )}
              {activeTenancy.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between bg-gray-50 rounded-xl p-3.5 hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center">
                      {doc.fileType.includes("pdf") ? (
                        <FileText className="w-4 h-4 text-brand-600" />
                      ) : doc.fileType.includes("image") ? (
                        <Image className="w-4 h-4 text-brand-600" />
                      ) : (
                        <Paperclip className="w-4 h-4 text-brand-600" />
                      )}
                    </div>
                    <div>
                      <a
                        href={`/api/documents?id=${doc.id}`}
                        target="_blank"
                        className="text-sm font-semibold text-gray-800 hover:text-brand-600 transition-colors"
                      >
                        {doc.name}
                      </a>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                        {doc.isPrivate && (
                          <span className="badge-warning flex items-center gap-1">
                            <EyeOff className="w-2.5 h-2.5" />
                            Private
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="btn-ghost p-2 text-red-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <label className="btn-primary flex items-center gap-2 cursor-pointer text-xs">
                <Upload className="w-3.5 h-3.5" />
                Upload Document
                <input type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadDocument(activeTenancy.id, file, false); }} />
              </label>
              <label className="btn-secondary flex items-center gap-2 cursor-pointer text-xs">
                <EyeOff className="w-3.5 h-3.5" />
                Upload Private Doc
                <input type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadDocument(activeTenancy.id, file, true); }} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Archived Tenancies */}
      {archivedTenancies.length > 0 && (
        <div className="glass-card-solid p-6 animate-slide-up">
          <h3 className="section-title mb-4">Previous Tenancies</h3>
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-2.5 top-1 bottom-1 w-0.5 bg-gray-200 rounded-full" />
            {archivedTenancies.map((t) => (
              <div key={t.id} className="relative flex items-start gap-4">
                <div className="absolute -left-3.5 top-1.5 w-3 h-3 rounded-full bg-gray-300 border-2 border-white shadow-sm" />
                <div className="flex-1 bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                  <p className="text-sm font-semibold text-gray-700">
                    {t.apartment.property.address} - Apt {t.apartment.unit}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(t.startDate).toLocaleDateString()} -{" "}
                      {t.endDate ? new Date(t.endDate).toLocaleDateString() : "N/A"}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <DollarSign className="w-3 h-3" />
                      ${t.monthlyRent.toLocaleString()}/mo
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
