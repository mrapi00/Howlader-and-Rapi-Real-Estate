import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: tenant submits a payment record (no auth - tenant portal)
export async function POST(req: NextRequest) {
  const { paymentId, amount, tenantName, method } = await req.json();

  if (!paymentId || !amount || !tenantName || !method) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { paymentSubmissions: { where: { status: "PENDING" } } },
  });
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // Check that pending + paid doesn't exceed amount due
  const pendingTotal = payment.paymentSubmissions.reduce((sum, s) => sum + s.amount, 0);
  const remaining = payment.amount - payment.paidAmount - pendingTotal;
  if (parseFloat(String(amount)) > remaining + 0.01) {
    return NextResponse.json({ error: `Amount exceeds remaining balance of $${remaining.toFixed(2)}` }, { status: 400 });
  }

  const submission = await prisma.paymentSubmission.create({
    data: { paymentId, amount: parseFloat(String(amount)), tenantName, method },
  });

  return NextResponse.json(submission, { status: 201 });
}

// DELETE: tenant cancels a pending submission (no auth - tenant portal)
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Missing submission id" }, { status: 400 });
  }

  const submission = await prisma.paymentSubmission.findUnique({ where: { id } });
  if (!submission || submission.status !== "PENDING") {
    return NextResponse.json({ error: "Submission not found or already processed" }, { status: 404 });
  }

  await prisma.paymentSubmission.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

// GET: landlord fetches pending submissions (auth required)
// Optional ?tenantId= to filter by tenant
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = req.nextUrl.searchParams.get("tenantId");

  const submissions = await prisma.paymentSubmission.findMany({
    where: {
      status: "PENDING",
      ...(tenantId ? { payment: { tenancy: { tenantId } } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      payment: {
        include: {
          tenancy: {
            include: {
              tenant: true,
              apartment: { include: { property: true } },
            },
          },
        },
      },
    },
  });

  return NextResponse.json(submissions);
}

// PATCH: landlord confirms or rejects a submission (auth required)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, action } = await req.json();

  if (!id || !["confirm", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const submission = await prisma.paymentSubmission.findUnique({
    where: { id },
    include: { payment: true },
  });

  if (!submission || submission.status !== "PENDING") {
    return NextResponse.json({ error: "Submission not found or already processed" }, { status: 404 });
  }

  if (action === "confirm") {
    const tenancyId = submission.payment.tenancyId;

    // Gather all unpaid payments to build the FIFO plan
    const allPayments = await prisma.payment.findMany({
      where: { tenancyId },
      orderBy: { dueDate: "asc" },
    });

    let remaining = submission.amount;
    const appliedTo: string[] = [];
    const paymentUpdates: { id: string; paidAmount: number }[] = [];

    for (const payment of allPayments) {
      if (remaining <= 0) break;
      const owed = payment.amount - payment.paidAmount;
      if (owed <= 0) continue;

      const toApply = Math.min(remaining, owed);
      paymentUpdates.push({ id: payment.id, paidAmount: payment.paidAmount + toApply });
      remaining -= toApply;

      const monthLabel = new Date(payment.dueDate).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      appliedTo.push(`$${toApply.toLocaleString()} to ${monthLabel}`);
    }

    const breakdown = `Applied: ${appliedTo.join(", ")}`;
    const txNote = `${submission.method} from ${submission.tenantName} — ${breakdown}`;

    // Execute everything in a single transaction — all or nothing
    await prisma.$transaction([
      prisma.paymentSubmission.update({
        where: { id },
        data: { status: "CONFIRMED" },
      }),
      ...paymentUpdates.map((u) =>
        prisma.payment.update({
          where: { id: u.id },
          data: { paidAmount: u.paidAmount, paidDate: new Date() },
        })
      ),
      prisma.paymentTransaction.create({
        data: {
          tenancyId,
          amount: submission.amount - remaining,
          paidDate: new Date(),
          note: txNote,
        },
      }),
    ]);
  } else {
    await prisma.paymentSubmission.update({
      where: { id },
      data: { status: "REJECTED" },
    });
  }

  return NextResponse.json({ success: true });
}
