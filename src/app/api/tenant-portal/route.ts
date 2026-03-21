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

// POST: authenticate tenant by building + apt + DOB
export async function POST(req: NextRequest) {
  const { apartmentId, dob } = await req.json();

  // Parse DOB - expect MM/DD/YYYY or YYYY-MM-DD
  let year: number, month: number, day: number;
  if (dob.includes("/")) {
    const parts = dob.split("/");
    month = parseInt(parts[0]);
    day = parseInt(parts[1]);
    year = parseInt(parts[2]);
  } else {
    const parts = dob.split("-");
    year = parseInt(parts[0]);
    month = parseInt(parts[1]);
    day = parseInt(parts[2]);
  }

  // Use UTC dates to avoid timezone issues
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  // Find active tenancy for this apartment with matching DOB
  const tenancy = await prisma.tenancy.findFirst({
    where: {
      apartmentId,
      isActive: true,
      tenant: {
        dob: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
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
    return NextResponse.json({ error: "No matching tenant found. Please check your information." }, { status: 404 });
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
