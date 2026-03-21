import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenancyId = req.nextUrl.searchParams.get("tenancyId");

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

  for (const payment of allPayments) {
    if (remaining <= 0) break;
    const owed = payment.amount - payment.paidAmount;
    if (owed <= 0) continue;

    const toApply = Math.min(remaining, owed);
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paidAmount: payment.paidAmount + toApply,
        paidDate: new Date(paidDate),
        note: note || payment.note,
      },
    });
    remaining -= toApply;
  }

  return NextResponse.json({ success: true, applied: amount - remaining, remaining });
}

// Update individual payment (mark paid, edit amount, correct mistakes)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, paidAmount, paidDate, note } = await req.json();

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

  return NextResponse.json(payment);
}
