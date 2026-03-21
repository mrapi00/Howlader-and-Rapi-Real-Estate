import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        tenancies: {
          orderBy: { startDate: "desc" },
          include: {
            apartment: { include: { property: true } },
            payments: { orderBy: { dueDate: "desc" } },
            documents: { orderBy: { createdAt: "desc" } },
          },
        },
      },
    });
    if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(tenant);
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: { name: "asc" },
    include: {
      tenancies: {
        orderBy: { startDate: "desc" },
        include: {
          apartment: { include: { property: true } },
        },
      },
    },
  });

  return NextResponse.json(tenants);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name, dob, phone, email } = await req.json();

  const parts = dob.split("-");
  const dobDate = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));

  const tenant = await prisma.tenant.update({
    where: { id },
    data: {
      name,
      dob: dobDate,
      phone: phone || null,
      email: email || null,
    },
  });

  return NextResponse.json(tenant);
}
