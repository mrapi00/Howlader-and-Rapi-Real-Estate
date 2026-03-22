import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const RAPIDAPI_HOST = "redfin-scraper1.p.rapidapi.com";
const BASE_URL = `https://${RAPIDAPI_HOST}`;

async function redfinFetch(path: string, params: Record<string, string>, apiKey: string) {
  const url = `${BASE_URL}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    headers: {
      "x-rapidapi-key": apiKey,
      "x-rapidapi-host": RAPIDAPI_HOST,
    },
  });
  if (!res.ok) throw new Error(`Redfin API ${path} returned ${res.status}`);
  return res.json();
}

async function lookupRedfinIds(
  address: string,
  zipCode: string,
  apiKey: string
): Promise<{ propertyId: number; listingId: number } | null> {
  const locData = await redfinFetch("/redfin/locations", { query: zipCode }, apiKey);
  const locations = locData?.data?.locations;
  if (!locations?.length) return null;

  const zipRegion = locations.find(
    (l: { region_type: string }) => l.region_type === "2"
  ) || locations[0];

  const regionId = zipRegion.region_id?.replace(/^\d+_/, "") || zipRegion.region_id;
  const regionType = zipRegion.region_type;

  const searchData = await redfinFetch("/redfin/search", {
    region_id: regionId,
    region_type: regionType,
    num_homes: "350",
    status: "9",
  }, apiKey);

  const homes = searchData?.data?.homes || searchData?.homes || [];
  if (!homes.length) return null;

  const addrLower = address.toLowerCase().replace(/\s+/g, " ").trim();
  const match = homes.find((h: { address?: string; streetAddress?: string }) => {
    const homeAddr = (h.address || h.streetAddress || "").toLowerCase().replace(/\s+/g, " ").trim();
    return homeAddr.includes(addrLower) || addrLower.includes(homeAddr);
  });

  if (!match) return null;

  const propertyId = match.propertyId || match.property_id;
  const listingId = match.listingId || match.listing_id;
  if (!propertyId || !listingId) return null;

  return { propertyId: Number(propertyId), listingId: Number(listingId) };
}

// ── Auto-pay: runs only on the last day of the month ──
async function runAutoPay() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const lastDay = new Date(year, month + 1, 0).getDate();
  if (now.getDate() !== lastDay) {
    return { autoPay: "Not the last day of the month, skipping" };
  }

  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59));

  const paidCount = await prisma.payment.count({
    where: {
      dueDate: { gte: monthStart, lte: monthEnd },
      paidAmount: { gt: 0 },
    },
  });

  if (paidCount > 0) {
    return { autoPay: "Landlord was active this month, skipping", paidCount };
  }

  const unpaidPayments = await prisma.payment.findMany({
    where: {
      dueDate: { gte: monthStart, lte: monthEnd },
      paidAmount: 0,
      amount: { gt: 0 },
    },
  });

  if (unpaidPayments.length === 0) {
    return { autoPay: "No unpaid payments for this month" };
  }

  for (const payment of unpaidPayments) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paidAmount: payment.amount,
        paidDate: now,
        note: "Auto-marked as paid (inactive month)",
      },
    });
  }

  return { autoPay: `Auto-marked ${unpaidPayments.length} payments as paid` };
}

// ── Valuation: fetch daily for all properties ──
async function runValuation(apiKey: string) {
  const properties = await prisma.property.findMany({
    where: {
      city: { not: null },
      state: { not: null },
      zipCode: { not: null },
    },
  });

  const results: { property: string; value?: number; error?: string }[] = [];

  for (const prop of properties) {
    try {
      let redfinPropId = prop.redfinPropertyId;
      let redfinListId = prop.redfinListingId;

      if (!redfinPropId || !redfinListId) {
        const ids = await lookupRedfinIds(prop.address, prop.zipCode!, apiKey);
        if (!ids) {
          results.push({ property: prop.address, error: "Property not found on Redfin" });
          continue;
        }
        redfinPropId = ids.propertyId;
        redfinListId = ids.listingId;

        await prisma.property.update({
          where: { id: prop.id },
          data: {
            redfinPropertyId: redfinPropId,
            redfinListingId: redfinListId,
          },
        });
      }

      const valData = await redfinFetch("/redfin/valuation", {
        property_id: String(redfinPropId),
        listing_id: String(redfinListId),
      }, apiKey);

      const estimate =
        valData?.data?.predictedValue ||
        valData?.data?.avm?.predictedValue ||
        valData?.data?.estimatedValue;

      if (!estimate) {
        results.push({ property: prop.address, error: "No valuation estimate returned" });
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

// ── Combined daily cron handler ──
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const autoPayResult = await runAutoPay();

  const apiKey = process.env.RAPIDAPI_KEY;
  let valuationResult;
  if (apiKey) {
    valuationResult = await runValuation(apiKey);
  } else {
    valuationResult = "RAPIDAPI_KEY not configured, skipping valuation";
  }

  return NextResponse.json({ autoPayResult, valuationResult });
}
