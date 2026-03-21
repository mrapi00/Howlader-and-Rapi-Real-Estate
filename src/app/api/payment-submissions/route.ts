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

// GET: landlord fetches all pending submissions (auth required)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const submissions = await prisma.paymentSubmission.findMany({
    where: { status: "PENDING" },
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
    const newPaidAmount = Math.min(
      submission.payment.amount,
      submission.payment.paidAmount + submission.amount
    );

    await prisma.$transaction([
      prisma.paymentSubmission.update({
        where: { id },
        data: { status: "CONFIRMED" },
      }),
      prisma.payment.update({
        where: { id: submission.paymentId },
        data: {
          paidAmount: newPaidAmount,
          paidDate: new Date(),
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
