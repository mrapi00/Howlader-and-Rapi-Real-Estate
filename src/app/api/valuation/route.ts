import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get the latest valuation for each property
  const properties = await prisma.property.findMany({
    include: {
      valuations: {
        orderBy: { fetchedAt: "desc" },
        take: 1,
      },
    },
  });

  const valuations = properties
    .filter((p) => p.valuations.length > 0)
    .map((p) => ({
      propertyId: p.id,
      address: p.address,
      value: p.valuations[0].value,
      fetchedAt: p.valuations[0].fetchedAt,
    }));

  const totalValue = valuations.reduce((sum, v) => sum + v.value, 0);

  return NextResponse.json({ totalValue, valuations });
}
