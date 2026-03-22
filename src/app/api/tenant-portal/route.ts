import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET properties and apartments for dropdown
export async function GET(req: NextRequest) {
  const propertyId = req.nextUrl.searchParams.get("propertyId");

  if (propertyId) {
    const apartments = await prisma.apartment.findMany({
      where: { propertyId },
      orderBy: { unit: "asc" },
    });
    return NextResponse.json(apartments);
  }

  const properties = await prisma.property.findMany({
    orderBy: { address: "asc" },
    select: { id: true, address: true },
  });
  return NextResponse.json(properties);
}

// POST: authenticate tenant by building + apt + name (first 3 chars of first name)
export async function POST(req: NextRequest) {
  const { apartmentId, name } = await req.json();

  if (!apartmentId || !name) {
    return NextResponse.json({ error: "Building, apartment, and name are required." }, { status: 400 });
  }

  // Find active tenancy for this apartment
  const tenancy = await prisma.tenancy.findFirst({
    where: {
      apartmentId,
      isActive: true,
    },
    include: {
      tenant: true,
      apartment: { include: { property: true } },
      payments: {
        orderBy: { dueDate: "desc" },
        include: {
          paymentSubmissions: {
            where: { status: "PENDING" },
          },
        },
      },
      documents: {
        where: { isPrivate: false },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!tenancy) {
    return NextResponse.json({ error: "No active tenant found for this apartment." }, { status: 404 });
  }

  // Verify name: match first 3 characters of first name (case-insensitive)
  const inputFirst3 = name.trim().split(/\s+/)[0].slice(0, 3).toLowerCase();
  const tenantFirst3 = tenancy.tenant.name.trim().split(/\s+/)[0].slice(0, 3).toLowerCase();
  if (inputFirst3.length < 3 || inputFirst3 !== tenantFirst3) {
    return NextResponse.json({ error: "Name does not match. Please check your information." }, { status: 404 });
  }

  // Calculate balance
  const now = new Date();
  let outstandingBalance = 0;
  tenancy.payments.forEach((p) => {
    if (new Date(p.dueDate) <= now) {
      outstandingBalance += p.amount - p.paidAmount;
    }
  });

  return NextResponse.json({
    tenant: {
      name: tenancy.tenant.name,
    },
    property: tenancy.apartment.property.address,
    unit: tenancy.apartment.unit,
    monthlyRent: tenancy.monthlyRent,
    startDate: tenancy.startDate,
    outstandingBalance,
    payments: tenancy.payments,
    documents: tenancy.documents,
  });
}
