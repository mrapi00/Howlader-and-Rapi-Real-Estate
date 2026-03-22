import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        apartments: {
          orderBy: { unit: "asc" },
          include: {
            tenancies: {
              orderBy: { startDate: "desc" },
              include: {
                tenant: true,
                payments: { orderBy: { dueDate: "desc" } },
                transactions: { orderBy: { paidDate: "desc" } },
                documents: { orderBy: { createdAt: "desc" } },
              },
            },
          },
        },
      },
    });
    return NextResponse.json(property);
  }

  const properties = await prisma.property.findMany({
    orderBy: { address: "asc" },
    include: {
      apartments: {
        orderBy: { unit: "asc" },
        include: {
          tenancies: {
            where: { isActive: true },
            include: { tenant: true },
          },
        },
      },
    },
  });

  return NextResponse.json(properties);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { address, units } = await req.json();

  const property = await prisma.property.create({
    data: {
      address,
      apartments: {
        create: (units as string[]).map((unit) => ({ unit })),
      },
    },
    include: { apartments: true },
  });

  return NextResponse.json(property);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { propertyId, unit } = await req.json();

  const apartment = await prisma.apartment.create({
    data: { propertyId, unit },
  });

  return NextResponse.json(apartment);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.property.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
