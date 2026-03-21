import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { apartmentId, tenantName, tenantDob, tenantPhone, tenantEmail, monthlyRent, startDate } =
    await req.json();

  // Create tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName,
      dob: (() => {
        const parts = tenantDob.split("-");
        return new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
      })(),
      phone: tenantPhone || null,
      email: tenantEmail || null,
    },
  });

  // Create tenancy
  const tenancy = await prisma.tenancy.create({
    data: {
      apartmentId,
      tenantId: tenant.id,
      monthlyRent,
      startDate: new Date(startDate),
      isActive: true,
    },
  });

  // Generate payment records from start date through current month
  const start = new Date(startDate);
  const now = new Date();
  const payments = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);

  while (current <= now || (current.getMonth() === now.getMonth() && current.getFullYear() === now.getFullYear())) {
    payments.push({
      tenancyId: tenancy.id,
      amount: monthlyRent,
      dueDate: new Date(current),
      paidAmount: 0,
    });
    current.setMonth(current.getMonth() + 1);
  }

  // Also add next month
  payments.push({
    tenancyId: tenancy.id,
    amount: monthlyRent,
    dueDate: new Date(current),
    paidAmount: 0,
  });

  if (payments.length > 0) {
    await prisma.payment.createMany({ data: payments });
  }

  return NextResponse.json(tenancy);
}

// Edit tenancy details (rent, start date, apartment)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, monthlyRent, startDate, apartmentId } = await req.json();

  const updateData: Record<string, unknown> = {};
  if (monthlyRent !== undefined) updateData.monthlyRent = monthlyRent;
  if (startDate) updateData.startDate = new Date(startDate);
  if (apartmentId) updateData.apartmentId = apartmentId;

  const tenancy = await prisma.tenancy.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(tenancy);
}

// Mark tenancy as archived (vacant)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.tenancy.update({
    where: { id },
    data: {
      isActive: false,
      endDate: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
