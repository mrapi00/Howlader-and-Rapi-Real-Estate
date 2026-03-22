import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { apartmentId, tenantName, tenantDob, tenantPhone, tenantEmail, monthlyRent, startDate, occupancySince } =
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
      occupancySince: occupancySince ? new Date(occupancySince) : null,
      isActive: true,
    },
  });

  // Generate payment records from current month through next month only
  // Past months are NOT auto-created — landlord can manually add past due months
  const now = new Date();
  const payments = [];
  const current = new Date(now.getFullYear(), now.getMonth(), 4);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 4);

  while (current <= end) {
    payments.push({
      tenancyId: tenancy.id,
      amount: monthlyRent,
      dueDate: new Date(current.getFullYear(), current.getMonth(), 4),
      paidAmount: 0,
    });
    current.setMonth(current.getMonth() + 1);
  }

  if (payments.length > 0) {
    await prisma.payment.createMany({ data: payments });
  }

  return NextResponse.json(tenancy);
}

// Edit tenancy details (rent, start date, apartment)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, monthlyRent, startDate, apartmentId, occupancySince } = await req.json();

  const updateData: Record<string, unknown> = {};
  if (monthlyRent !== undefined) updateData.monthlyRent = monthlyRent;
  if (startDate) updateData.startDate = new Date(startDate);
  if (apartmentId) updateData.apartmentId = apartmentId;
  if (occupancySince !== undefined) updateData.occupancySince = occupancySince ? new Date(occupancySince) : null;

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
