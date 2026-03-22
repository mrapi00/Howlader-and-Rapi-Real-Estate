"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Plus, Settings, Trash2, User, X, TrendingUp } from "lucide-react";

interface Property {
  id: string;
  address: string;
  apartments: {
    id: string;
    unit: string;
    tenancies: {
      id: string;
      isActive: boolean;
      tenant: { name: string };
      monthlyRent: number;
    }[];
  }[];
  valuations: {
    value: number;
    fetchedAt: string;
  }[];
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newUnits, setNewUnits] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchProperties = () => {
    fetch("/api/properties")
      .then((r) => r.json())
      .then((data) => {
        setProperties(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const addProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    const units = newUnits.split(",").map((u) => u.trim()).filter(Boolean);
    await fetch("/api/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: newAddress, units }),
    });
    setNewAddress("");
    setNewUnits("");
    setShowAddProperty(false);
    fetchProperties();
  };

  const deleteProperty = async (id: string) => {
    if (!confirm("Delete this property and all its data?")) return;
    await fetch(`/api/properties?id=${id}`, { method: "DELETE" });
    fetchProperties();
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

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="page-title">Properties</h1>
          <p className="text-gray-500 text-sm mt-1">
            {properties.length} {properties.length === 1 ? "property" : "properties"} in your portfolio
          </p>
        </div>
        <button onClick={() => setShowAddProperty(!showAddProperty)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Property
        </button>
      </div>

      {/* Add Property Panel */}
      {showAddProperty && (
        <div className="glass-card-solid p-6 mb-6 animate-slide-up">
          <div className="flex justify-between items-center mb-5">
            <h2 className="section-title">New Property</h2>
            <button onClick={() => setShowAddProperty(false)} className="btn-ghost p-1.5">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={addProperty} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Street Address</label>
                <input
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="input-field"
                  placeholder="e.g. 1221 St Lawrence"
                  required
                />
              </div>
              <div>
                <label className="label">Apartment Units (comma separated)</label>
                <input
                  value={newUnits}
                  onChange={(e) => setNewUnits(e.target.value)}
                  className="input-field"
                  placeholder="e.g. BF, BR, 1F, 1R, 2F, 2R"
                  required
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary">Create Property</button>
              <button type="button" onClick={() => setShowAddProperty(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Properties Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {properties.map((prop) => {
          const occupied = prop.apartments.filter((a) => a.tenancies.some((t) => t.isActive)).length;
          const total = prop.apartments.length;
          const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0;
          const latestValuation = prop.valuations?.[0];

          return (
            <div key={prop.id} className="glass-card-solid p-6 group animate-slide-up">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 bg-brand-50 rounded-xl flex items-center justify-center mt-0.5">
                    <Building2 className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{prop.address}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {total} units &middot; {occupied} occupied &middot; {occupancyPct}% occupancy
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/dashboard/properties/${prop.id}`} className="btn-ghost p-2" title="Manage">
                    <Settings className="w-4 h-4" />
                  </Link>
                  <button onClick={() => deleteProperty(prop.id)} className="btn-ghost p-2 text-red-500 hover:text-red-600 hover:bg-red-50" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Valuation */}
              {latestValuation && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-violet-50 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-violet-600 flex-shrink-0" />
                  <p className="text-sm font-semibold text-violet-700">
                    ${Math.round(latestValuation.value).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-violet-400 ml-auto">Redfin Est.</p>
                </div>
              )}

              {/* Occupancy bar */}
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-500"
                  style={{ width: `${occupancyPct}%` }}
                />
              </div>

              {/* Unit grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {prop.apartments.map((apt) => {
                  const activeTenancy = apt.tenancies.find((t) => t.isActive);
                  return (
                    <Link
                      key={apt.id}
                      href={`/dashboard/properties/${prop.id}?apt=${apt.id}`}
                      className={`group/unit relative p-2.5 rounded-xl border text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                        activeTenancy
                          ? "bg-emerald-50/80 border-emerald-200 hover:border-emerald-300"
                          : "bg-gray-50 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <p className="text-xs font-bold text-gray-700">{apt.unit}</p>
                      {activeTenancy ? (
                        <div className="mt-1">
                          <div className="flex items-center justify-center gap-0.5">
                            <User className="w-2.5 h-2.5 text-emerald-500" />
                            <p className="text-[10px] text-emerald-600 font-medium truncate">
                              {activeTenancy.tenant.name.split(" ")[0]}
                            </p>
                          </div>
                          <p className="text-[10px] text-gray-500 font-medium">
                            ${activeTenancy.monthlyRent.toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-400 mt-1">Vacant</p>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
