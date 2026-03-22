"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Image,
  Mail,
  Paperclip,
  Phone,
  Plus,
  Trash2,
  Upload,
  User,
  UserPlus,
  X,
} from "lucide-react";

interface TenancyDetail {
  id: string;
  isActive: boolean;
  monthlyRent: number;
  startDate: string;
  endDate: string | null;
  tenant: { id: string; name: string; dob: string; phone: string | null; email: string | null };
  payments: {
    id: string;
    amount: number;
    paidAmount: number;
    dueDate: string;
    paidDate: string | null;
    note: string | null;
  }[];
  transactions: {
    id: string;
    amount: number;
    paidDate: string;
    note: string | null;
    createdAt: string;
  }[];
  documents: {
    id: string;
    name: string;
    fileType: string;
    isPrivate: boolean;
    createdAt: string;
  }[];
}

interface ApartmentDetail {
  id: string;
  unit: string;
  tenancies: TenancyDetail[];
}

interface PropertyDetail {
  id: string;
  address: string;
  apartments: ApartmentDetail[];
}

export default function PropertyDetailPage() {
  const params = useParams();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [selectedApt, setSelectedApt] = useState<string | null>(null);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState<string | null>(null);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnit, setNewUnit] = useState("");

  // Add tenant form
  const [tenantName, setTenantName] = useState("");
  const [tenantDob, setTenantDob] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [occupancySince, setOccupancySince] = useState("");

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentNote, setPaymentNote] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchProperty = () => {
    fetch(`/api/properties?id=${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setProperty(data);
        if (!selectedApt && data.apartments.length > 0) {
          setSelectedApt(data.apartments[0].id);
        }
      });
  };

  useEffect(() => {
    fetchProperty();
  }, [params.id]);

  const addUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/properties", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: property!.id, unit: newUnit }),
    });
    setNewUnit("");
    setShowAddUnit(false);
    fetchProperty();
  };

  const registerTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/tenancies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apartmentId: selectedApt,
        tenantName,
        tenantDob,
        tenantPhone: tenantPhone || undefined,
        tenantEmail: tenantEmail || undefined,
        monthlyRent: parseFloat(monthlyRent),
        startDate,
        occupancySince: occupancySince || undefined,
      }),
    });
    setTenantName("");
    setTenantDob("");
    setTenantPhone("");
    setTenantEmail("");
    setMonthlyRent("");
    setOccupancySince("");
    setShowAddTenant(false);
    fetchProperty();
  };

  const markVacant = async (tenancyId: string) => {
    if (!confirm("Mark this unit as vacant? The tenant data will be archived.")) return;
    await fetch(`/api/tenancies?id=${tenancyId}`, { method: "DELETE" });
    fetchProperty();
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
    fetchProperty();
  };

  const uploadDocument = async (tenancyId: string, file: File, isPrivate: boolean) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tenancyId", tenancyId);
    formData.append("isPrivate", String(isPrivate));
    const res = await fetch("/api/documents", { method: "POST", body: formData });
    if (!res.ok) {
      const data = await res.json();
      alert(`Upload failed: ${data.error || "Unknown error"}`);
      return;
    }
    fetchProperty();
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm("Delete this document?")) return;
    await fetch(`/api/documents?id=${docId}`, { method: "DELETE" });
    fetchProperty();
  };

  if (!property) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="w-8 h-8 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const apt = property.apartments.find((a) => a.id === selectedApt);
  const activeTenancy = apt?.tenancies.find((t) => t.isActive);
  const archivedTenancies = apt?.tenancies.filter((t) => !t.isActive) || [];

  let outstandingBalance = 0;
  if (activeTenancy) {
    const now = new Date();
    activeTenancy.payments.forEach((p) => {
      if (new Date(p.dueDate) <= now) {
        outstandingBalance += p.amount - p.paidAmount;
      }
    });
  }

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/dashboard/properties"
          className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Properties
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <h1 className="page-title">{property.address}</h1>
      </div>

      {/* Unit Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap items-center">
        {property.apartments.map((a) => {
          const activeTen = a.tenancies.find((t) => t.isActive);
          return (
            <button
              key={a.id}
              onClick={() => { setSelectedApt(a.id); setFilterYear(""); setFilterMonth(""); setCurrentPage(1); }}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 text-left ${
                selectedApt === a.id
                  ? "bg-brand-500 text-white shadow-md shadow-brand-500/25"
                  : activeTen
                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
              }`}
            >
              <span>Apt {a.unit}</span>
              {activeTen && (
                <span className={`block text-xs font-medium mt-0.5 ${
                  selectedApt === a.id ? "text-white/80" : "text-emerald-500"
                }`}>
                  ${activeTen.monthlyRent.toLocaleString()}/mo
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={() => setShowAddUnit(!showAddUnit)}
          className="btn-ghost p-2.5 rounded-xl"
          title="Add unit"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Add Unit Panel */}
      {showAddUnit && (
        <div className="glass-card-solid p-5 mb-6 animate-slide-up">
          <form onSubmit={addUnit} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="label">New Unit Name</label>
              <input
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                className="input-field"
                placeholder="e.g. 3F"
                required
              />
            </div>
            <button type="submit" className="btn-primary">Add Unit</button>
            <button type="button" onClick={() => setShowAddUnit(false)} className="btn-secondary">
              Cancel
            </button>
          </form>
        </div>
      )}

      {apt && (
        <div className="space-y-6">
          {/* Active Tenant Card */}
          {activeTenancy ? (
            <div className="glass-card-solid p-6 animate-slide-up">
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                    <User className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {activeTenancy.tenant.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        Since {new Date(activeTenancy.startDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <DollarSign className="w-3 h-3" />
                        ${activeTenancy.monthlyRent.toLocaleString()}/mo
                      </span>
                      {activeTenancy.tenant.phone && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="w-3 h-3" />
                          {activeTenancy.tenant.phone}
                        </span>
                      )}
                      {activeTenancy.tenant.email && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Mail className="w-3 h-3" />
                          {activeTenancy.tenant.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => markVacant(activeTenancy.id)}
                  className="btn-ghost text-red-500 hover:text-red-600 hover:bg-red-50 text-xs font-semibold"
                >
                  Mark Vacant
                </button>
              </div>

              {/* Outstanding Balance Alert */}
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

                {showRecordPayment === activeTenancy.id && (
                  <form
                    onSubmit={(e) => recordPayment(e, activeTenancy.id)}
                    className="glass-card-solid p-4 mb-4 space-y-4 animate-slide-up border border-emerald-100"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="input-field"
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div>
                        <label className="label">Date Paid</label>
                        <input
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="input-field"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Note</label>
                      <input
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        className="input-field"
                        placeholder="Optional note"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" className="btn-success">Record Payment</button>
                      <button type="button" onClick={() => setShowRecordPayment(null)} className="btn-secondary">
                        Cancel
                      </button>
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
                        <th className="text-left py-3 px-4">Due Date</th>
                        <th className="text-right py-3 px-4">Due</th>
                        <th className="text-right py-3 px-4">Paid</th>
                        <th className="text-right py-3 px-4">Balance</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPayments.map((p) => {
                        const balance = p.amount - p.paidAmount;
                        const isPast = new Date(p.dueDate) < new Date();
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
                            <td className="py-3 px-4 text-gray-500 text-xs">{p.note}</td>
                          </tr>
                        );
                      })}
                      {dateFilteredPayments.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center">
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

              {/* Payment History */}
              <div className="mb-6">
                <h3 className="section-title mb-4">Payment History</h3>
                {activeTenancy.transactions && activeTenancy.transactions.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="table-header">
                          <th className="text-left py-3 px-4">Date Paid</th>
                          <th className="text-right py-3 px-4">Amount</th>
                          <th className="text-left py-3 px-4">Note</th>
                          <th className="text-left py-3 px-4">Recorded</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeTenancy.transactions.map((tx) => (
                          <tr key={tx.id} className="table-row">
                            <td className="py-3 px-4 text-gray-800 font-medium">
                              {new Date(tx.paidDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                              ${tx.amount.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-xs">
                              {tx.note || "---"}
                            </td>
                            <td className="py-3 px-4 text-gray-400 text-xs">
                              {new Date(tx.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 rounded-xl border border-gray-200">
                    <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No payments recorded yet</p>
                  </div>
                )}
              </div>

              {/* Documents Section */}
              <div>
                <h3 className="section-title mb-4">Documents</h3>
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
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadDocument(activeTenancy.id, file, false);
                      }}
                    />
                  </label>
                  <label className="btn-secondary flex items-center gap-2 cursor-pointer text-xs">
                    <EyeOff className="w-3.5 h-3.5" />
                    Upload Private Doc
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadDocument(activeTenancy.id, file, true);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card-solid p-10 text-center animate-slide-up">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-700 mb-1">This unit is vacant</h3>
              <p className="text-gray-400 text-sm mb-5">No tenant is currently registered</p>
              <button
                onClick={() => setShowAddTenant(!showAddTenant)}
                className="btn-primary flex items-center gap-2 mx-auto"
              >
                <UserPlus className="w-4 h-4" />
                Register New Tenant
              </button>
            </div>
          )}

          {/* Add Tenant Form */}
          {showAddTenant && !activeTenancy && (
            <div className="glass-card-solid p-6 animate-slide-up">
              <div className="flex justify-between items-center mb-5">
                <h2 className="section-title">Register New Tenant</h2>
                <button onClick={() => setShowAddTenant(false)} className="btn-ghost p-1.5">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={registerTenant} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Tenant Name</label>
                    <input
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      className="input-field"
                      placeholder="Full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Date of Birth</label>
                    <input
                      type="date"
                      value={tenantDob}
                      onChange={(e) => setTenantDob(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input
                      value={tenantPhone}
                      onChange={(e) => setTenantPhone(e.target.value)}
                      className="input-field"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      value={tenantEmail}
                      onChange={(e) => setTenantEmail(e.target.value)}
                      className="input-field"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="label">Monthly Rent ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={monthlyRent}
                      onChange={(e) => setMonthlyRent(e.target.value)}
                      className="input-field"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Occupancy Since (optional)</label>
                    <input
                      type="date"
                      value={occupancySince}
                      onChange={(e) => setOccupancySince(e.target.value)}
                      className="input-field"
                      placeholder="When tenant moved in"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="btn-primary">Register Tenant</button>
                  <button type="button" onClick={() => setShowAddTenant(false)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tenant History Timeline */}
          {archivedTenancies.length > 0 && (
            <div className="glass-card-solid p-6 animate-slide-up">
              <h3 className="section-title mb-4">Tenant History</h3>
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2.5 top-1 bottom-1 w-0.5 bg-gray-200 rounded-full" />
                {archivedTenancies.map((t) => (
                  <div key={t.id} className="relative flex items-start gap-4">
                    <div className="absolute -left-3.5 top-1.5 w-3 h-3 rounded-full bg-gray-300 border-2 border-white shadow-sm" />
                    <div className="flex-1 bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                      <p className="text-sm font-semibold text-gray-700">{t.tenant.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(t.startDate).toLocaleDateString()} -{" "}
                          {t.endDate ? new Date(t.endDate).toLocaleDateString() : "Present"}
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
      )}
    </div>
  );
}
