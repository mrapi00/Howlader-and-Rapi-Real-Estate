"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  DoorOpen,
  Users,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";

interface DashboardStats {
  totalProperties: number;
  totalApartments: number;
  activeTenants: number;
  vacantUnits: number;
  totalMonthlyRent: number;
  totalOutstanding: number;
  recentPayments: {
    id: string;
    paidAmount: number;
    paidDate: string;
    tenancy: {
      tenant: { name: string };
      apartment: { unit: string; property: { address: string } };
    };
  }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="w-8 h-8 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const occupancyRate =
    stats.totalApartments > 0
      ? Math.round((stats.activeTenants / stats.totalApartments) * 100)
      : 0;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Overview of your portfolio</p>
        </div>
        <Link href="/dashboard/properties" className="btn-primary flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Manage Properties
        </Link>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Building2 className="w-5 h-5" />}
          label="Properties"
          value={stats.totalProperties}
          accent="brand"
        />
        <StatCard
          icon={<DoorOpen className="w-5 h-5" />}
          label="Total Units"
          value={stats.totalApartments}
          accent="indigo"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Active Tenants"
          value={stats.activeTenants}
          accent="emerald"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Vacant"
          value={stats.vacantUnits}
          accent="amber"
        />
      </div>

      {/* Revenue row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="lg:col-span-1 stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalMonthlyRent.toLocaleString()}<span className="text-sm font-semibold text-gray-400">/mo</span></p>
            </div>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000"
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">{occupancyRate}% occupancy rate</p>
        </div>

        <div className="lg:col-span-1 stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stats.totalOutstanding > 0 ? "bg-red-100" : "bg-emerald-100"}`}>
              <DollarSign className={`w-5 h-5 ${stats.totalOutstanding > 0 ? "text-red-600" : "text-emerald-600"}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Outstanding</p>
              <p className={`text-2xl font-bold ${stats.totalOutstanding > 0 ? "text-red-600" : "text-emerald-600"}`}>
                ${stats.totalOutstanding.toLocaleString()}
              </p>
            </div>
          </div>
          {stats.totalOutstanding > 0 && (
            <Link
              href="/dashboard/payments"
              className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              View late payments
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        <div className="lg:col-span-1 stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Occupancy</p>
              <p className="text-2xl font-bold text-gray-900">{occupancyRate}%</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: stats.totalApartments }).map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full ${
                  i < stats.activeTenants ? "bg-brand-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {stats.activeTenants} of {stats.totalApartments} occupied
          </p>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="glass-card-solid p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="section-title">Recent Payments</h2>
          <Link
            href="/dashboard/payments"
            className="text-brand-600 hover:text-brand-700 text-sm font-semibold flex items-center gap-1 transition-colors"
          >
            View all
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {stats.recentPayments.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No recent payments recorded</p>
          </div>
        ) : (
          <div className="space-y-1">
            {stats.recentPayments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {p.tenancy.tenant.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {p.tenancy.apartment.property.address} &middot; Apt {p.tenancy.apartment.unit}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-600">
                    +${p.paidAmount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(p.paidDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
}) {
  const colors: Record<string, { bg: string; icon: string }> = {
    brand: { bg: "bg-brand-50", icon: "text-brand-600" },
    indigo: { bg: "bg-indigo-50", icon: "text-indigo-600" },
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-600" },
    amber: { bg: "bg-amber-50", icon: "text-amber-600" },
  };

  const c = colors[accent] || colors.brand;

  return (
    <div className="stat-card animate-slide-up">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center`}>
          <span className={c.icon}>{icon}</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
