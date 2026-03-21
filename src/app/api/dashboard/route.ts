import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [properties, activeTenancies, allApartments, recentPayments] = await Promise.all([
    prisma.property.count(),
    prisma.tenancy.findMany({
      where: { isActive: true },
      include: { payments: true },
    }),
    prisma.apartment.count(),
    prisma.payment.findMany({
      where: { paidAmount: { gt: 0 } },
      orderBy: { paidDate: "desc" },
      take: 10,
      include: {
        tenancy: {
          include: {
            tenant: true,
            apartment: { include: { property: true } },
          },
        },
      },
    }),
  ]);

  const now = new Date();
  let totalMonthlyRent = 0;
  let totalOutstanding = 0;

  activeTenancies.forEach((t) => {
    totalMonthlyRent += t.monthlyRent;
    t.payments.forEach((p) => {
      if (new Date(p.dueDate) <= now) {
        totalOutstanding += p.amount - p.paidAmount;
      }
    });
  });

  return NextResponse.json({
    totalProperties: properties,
    totalApartments: allApartments,
    activeTenants: activeTenancies.length,
    vacantUnits: allApartments - activeTenancies.length,
    totalMonthlyRent,
    totalOutstanding,
    recentPayments: recentPayments.filter((p) => p.paidDate),
  });
}
