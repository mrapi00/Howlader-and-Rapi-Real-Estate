"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  ChevronRight,
  DollarSign,
  Mail,
  Phone,
  Plus,
  Search,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";

interface TenantRow {
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
  }[];
}

interface PropertyOption {
  id: string;
  address: string;
  apartments: { id: string; unit: string }[];
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [properties, setProperties] = useState<PropertyOption[]>([]);

  // Add tenant form
  const [tenantName, setTenantName] = useState("");
  const [tenantDob, setTenantDob] = useState("");
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedApartmentId, setSelectedApartmentId] = useState("");

  const fetchTenants = () => {
    fetch("/api/tenants")
      .then((r) => r.json())
      .then((data) => {
        setTenants(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTenants();
    fetch("/api/properties")
      .then((r) => r.json())
      .then(setProperties);
  }, []);

  const addTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/tenancies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apartmentId: selectedApartmentId,
        tenantName,
        tenantDob,
        tenantPhone: tenantPhone || undefined,
        tenantEmail: tenantEmail || undefined,
        monthlyRent: parseFloat(monthlyRent),
        startDate,
      }),
    });
    setTenantName("");
    setTenantDob("");
    setTenantPhone("");
    setTenantEmail("");
    setMonthlyRent("");
    setSelectedPropertyId("");
    setSelectedApartmentId("");
    setShowAddTenant(false);
    fetchTenants();
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

  const activeTenants = tenants.filter((t) => t.tenancies.some((tc) => tc.isActive));
  const archivedTenants = tenants.filter((t) => !t.tenancies.some((tc) => tc.isActive));
  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="page-title">Tenants</h1>
          <p className="text-gray-500 text-sm mt-1">
            {activeTenants.length} active {activeTenants.length === 1 ? "tenant" : "tenants"}
          </p>
        </div>
        <button
          onClick={() => setShowAddTenant(!showAddTenant)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add New Tenant
        </button>
      </div>

      {/* Add Tenant Panel */}
      {showAddTenant && (
        <div className="glass-card-solid p-6 mb-6 animate-slide-up">
          <div className="flex justify-between items-center mb-5">
            <h2 className="section-title">Register New Tenant</h2>
            <button onClick={() => setShowAddTenant(false)} className="btn-ghost p-1.5">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={addTenant} className="space-y-4">
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
                <label className="label">Property</label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => {
                    setSelectedPropertyId(e.target.value);
                    setSelectedApartmentId("");
                  }}
                  className="select-field"
                  required
                >
                  <option value="">Select property...</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.address}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Unit</label>
                <select
                  value={selectedApartmentId}
                  onChange={(e) => setSelectedApartmentId(e.target.value)}
                  className="select-field"
                  required
                  disabled={!selectedPropertyId}
                >
                  <option value="">Select unit...</option>
                  {selectedProperty?.apartments.map((a) => (
                    <option key={a.id} value={a.id}>
                      Apt {a.unit}
                    </option>
                  ))}
                </select>
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

      {/* Active Tenants */}
      <div className="glass-card-solid overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <h2 className="text-sm font-bold text-gray-800">
            Active Tenants ({activeTenants.length})
          </h2>
        </div>

        {activeTenants.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No active tenants</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activeTenants.map((t) => {
              const activeTenancy = t.tenancies.find((tc) => tc.isActive)!;
              return (
                <Link
                  key={t.id}
                  href={`/dashboard/tenants/${t.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-brand-50/50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 group-hover:text-brand-600 transition-colors">
                        {t.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Building2 className="w-3 h-3" />
                          {activeTenancy.apartment.property.address} - Apt {activeTenancy.apartment.unit}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <DollarSign className="w-3 h-3" />
                          ${activeTenancy.monthlyRent.toLocaleString()}/mo
                        </span>
                        {t.phone && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Phone className="w-3 h-3" />
                            {t.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors" />
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Archived Tenants */}
      {archivedTenants.length > 0 && (
        <div className="glass-card-solid overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-gray-500" />
            </div>
            <h2 className="text-sm font-bold text-gray-600">
              Archived Tenants ({archivedTenants.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {archivedTenants.map((t) =>
              t.tenancies
                .filter((tc) => !tc.isActive)
                .map((tc) => (
                  <Link
                    key={tc.id}
                    href={`/dashboard/tenants/${t.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-600">{t.name}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Building2 className="w-3 h-3" />
                            {tc.apartment.property.address} - Apt {tc.apartment.unit}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Calendar className="w-3 h-3" />
                            {new Date(tc.startDate).toLocaleDateString()} -{" "}
                            {tc.endDate ? new Date(tc.endDate).toLocaleDateString() : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </Link>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
