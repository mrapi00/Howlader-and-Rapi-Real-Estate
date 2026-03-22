import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function ensurePaymentsCurrent(tenancyId: string, monthlyRent: number) {
  const latestPayment = await prisma.payment.findFirst({
    where: { tenancyId },
    orderBy: { dueDate: "desc" },
  });

  if (!latestPayment) return;

  const now = new Date();
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + 1, 4);
  const lastDue = new Date(latestPayment.dueDate);

  // Get all existing due dates to avoid duplicates from concurrent requests
  const existingPayments = await prisma.payment.findMany({
    where: { tenancyId },
    select: { dueDate: true },
  });
  const existingMonths = new Set(
    existingPayments.map((p) => {
      const d = new Date(p.dueDate);
      return `${d.getFullYear()}-${d.getMonth()}`;
    })
  );

  const payments = [];
  const current = new Date(lastDue.getFullYear(), lastDue.getMonth() + 1, 4);

  while (current <= targetMonth) {
    const key = `${current.getFullYear()}-${current.getMonth()}`;
    if (!existingMonths.has(key)) {
      payments.push({
        tenancyId,
        amount: monthlyRent,
        dueDate: new Date(current.getFullYear(), current.getMonth(), 4),
        paidAmount: 0,
      });
    }
    current.setMonth(current.getMonth() + 1);
  }

  if (payments.length > 0) {
    await prisma.payment.createMany({ data: payments });
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenancyId = req.nextUrl.searchParams.get("tenancyId");

  // Auto-generate missing payment records if fetching for a specific tenancy
  if (tenancyId) {
    const tenancy = await prisma.tenancy.findUnique({ where: { id: tenancyId } });
    if (tenancy && tenancy.isActive) {
      await ensurePaymentsCurrent(tenancyId, tenancy.monthlyRent);
    }
  } else {
    // For the all-payments view, ensure all active tenancies are current
    const activeTenancies = await prisma.tenancy.findMany({ where: { isActive: true } });
    for (const t of activeTenancies) {
      await ensurePaymentsCurrent(t.id, t.monthlyRent);
    }
  }

  const where = tenancyId ? { tenancyId } : {};

  const payments = await prisma.payment.findMany({
    where,
    orderBy: { dueDate: "desc" },
    include: {
      tenancy: {
        include: {
          tenant: true,
          apartment: { include: { property: true } },
        },
      },
    },
  });

  return NextResponse.json(payments);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tenancyId, amount, paidDate, note } = await req.json();

  // Find all payments for this tenancy, apply payment to oldest unpaid first
  const allPayments = await prisma.payment.findMany({
    where: { tenancyId },
    orderBy: { dueDate: "asc" },
  });

  let remaining = amount;
  const appliedTo: string[] = [];
  const paymentUpdates: { id: string; paidAmount: number; note: string | null }[] = [];

  for (const payment of allPayments) {
    if (remaining <= 0) break;
    const owed = payment.amount - payment.paidAmount;
    if (owed <= 0) continue;

    const toApply = Math.min(remaining, owed);
    paymentUpdates.push({
      id: payment.id,
      paidAmount: payment.paidAmount + toApply,
      note: note || payment.note,
    });
    remaining -= toApply;

    const monthLabel = new Date(payment.dueDate).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    appliedTo.push(`$${toApply.toLocaleString()} to ${monthLabel}`);
  }

  // Build transaction note with breakdown
  const breakdown = `Applied: ${appliedTo.join(", ")}`;
  const txNote = note ? `${note} — ${breakdown}` : breakdown;

  // Execute everything in a single transaction — all or nothing
  await prisma.$transaction([
    ...paymentUpdates.map((u) =>
      prisma.payment.update({
        where: { id: u.id },
        data: { paidAmount: u.paidAmount, paidDate: new Date(paidDate), note: u.note },
      })
    ),
    prisma.paymentTransaction.create({
      data: {
        tenancyId,
        amount: amount - remaining,
        paidDate: new Date(paidDate),
        note: txNote,
      },
    }),
  ]);

  return NextResponse.json({ success: true, applied: amount - remaining, remaining });
}

// Update individual payment (mark paid, edit amount, correct mistakes)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, paidAmount, paidDate, note } = await req.json();

  // Get the current payment to calculate the difference
  const existing = await prisma.payment.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = { paidAmount };

  // If paidAmount is 0, clear the paidDate; otherwise set it
  if (paidAmount === 0) {
    updateData.paidDate = null;
  } else {
    updateData.paidDate = paidDate ? new Date(paidDate) : new Date();
  }

  if (note !== undefined) {
    updateData.note = note;
  }

  const payment = await prisma.payment.update({
    where: { id },
    data: updateData,
  });

  // Log a transaction when payment amount increases
  const increase = paidAmount - existing.paidAmount;
  if (increase > 0) {
    const dueMonth = new Date(existing.dueDate).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    await prisma.paymentTransaction.create({
      data: {
        tenancyId: existing.tenancyId,
        amount: increase,
        paidDate: paidDate ? new Date(paidDate) : new Date(),
        note: note || `Payment for ${dueMonth}`,
      },
    });
  }

  return NextResponse.json(payment);
}
