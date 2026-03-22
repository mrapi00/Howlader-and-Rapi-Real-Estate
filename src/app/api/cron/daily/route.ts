import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function rentcastValuation(address: string, city: string, state: string, zip: string, apiKey: string) {
  const fullAddress = `${address}, ${city}, ${state} ${zip}`;
  const url = `https://api.rentcast.io/v1/avm/value?address=${encodeURIComponent(fullAddress)}`;
  const res = await fetch(url, {
    headers: { "X-Api-Key": apiKey },
  });
  if (!res.ok) throw new Error(`RentCast returned ${res.status}`);
  return res.json();
}

// ── Valuation: fetch weekly via RentCast ──
async function runValuation(apiKey: string) {
  const properties = await prisma.property.findMany({
    where: {
      city: { not: null },
      state: { not: null },
      zipCode: { not: null },
    },
    include: {
      valuations: {
        orderBy: { fetchedAt: "desc" },
        take: 1,
      },
    },
  });

  const results: { property: string; value?: number; skipped?: boolean; error?: string }[] = [];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const prop of properties) {
    // Skip if last fetch was less than 7 days ago (stay within 50 calls/month)
    const lastValuation = prop.valuations[0];
    if (lastValuation && lastValuation.fetchedAt > sevenDaysAgo) {
      results.push({ property: prop.address, skipped: true });
      continue;
    }

    try {
      const data = await rentcastValuation(
        prop.address, prop.city!, prop.state!, prop.zipCode!, apiKey
      );

      const estimate = data?.price;
      if (!estimate) {
        results.push({ property: prop.address, error: "No value estimate returned" });
        continue;
      }

      await prisma.propertyValuation.create({
        data: {
          propertyId: prop.id,
          value: Number(estimate),
        },
      });

      results.push({ property: prop.address, value: Number(estimate) });
    } catch (err) {
      results.push({
        property: prop.address,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return results;
}

// ── Daily cron handler ──
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RENTCAST_API_KEY;
  let valuationResult;
  if (apiKey) {
    valuationResult = await runValuation(apiKey);
  } else {
    valuationResult = "RENTCAST_API_KEY not configured, skipping valuation";
  }

  return NextResponse.json({ valuationResult });
}
