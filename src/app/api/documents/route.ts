import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put, del } from "@vercel/blob";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check if private document — require landlord auth
  if (doc.isPrivate) {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "This document is private" }, { status: 403 });
    }
  }

  // If filePath is a URL (Vercel Blob), redirect to it
  if (doc.filePath.startsWith("http")) {
    return NextResponse.redirect(doc.filePath);
  }

  // Legacy local file support (dev mode)
  try {
    const filePath = path.join(process.cwd(), doc.filePath);
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": doc.fileType,
        "Content-Disposition": `inline; filename="${doc.name}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const tenancyId = formData.get("tenancyId") as string;
  const isPrivate = formData.get("isPrivate") === "true";

  if (!file || !tenancyId) {
    return NextResponse.json({ error: "File and tenancyId required" }, { status: 400 });
  }

  let filePath: string;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // Production: upload to Vercel Blob
    const blob = await put(`documents/${tenancyId}/${Date.now()}-${file.name}`, file, {
      access: "public",
    });
    filePath = blob.url;
  } else {
    // Dev: save locally
    const { writeFile, mkdir } = await import("fs/promises");
    const uploadsDir = path.join(process.cwd(), "uploads", tenancyId);
    await mkdir(uploadsDir, { recursive: true });
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${Date.now()}-${file.name}`;
    filePath = path.join("uploads", tenancyId, fileName);
    await writeFile(path.join(process.cwd(), filePath), buffer);
  }

  const doc = await prisma.document.create({
    data: {
      tenancyId,
      name: file.name,
      filePath,
      fileType: file.type,
      isPrivate,
    },
  });

  return NextResponse.json(doc);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const doc = await prisma.document.findUnique({ where: { id } });
  if (doc) {
    if (doc.filePath.startsWith("http")) {
      // Vercel Blob
      try { await del(doc.filePath); } catch { /* already deleted */ }
    } else {
      // Local file
      try {
        const { unlink } = await import("fs/promises");
        await unlink(path.join(process.cwd(), doc.filePath));
      } catch { /* already deleted */ }
    }
    await prisma.document.delete({ where: { id } });
  }

  return NextResponse.json({ success: true });
}
