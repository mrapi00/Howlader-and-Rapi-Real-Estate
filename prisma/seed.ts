import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create landlord users
  const hashedPassword = await bcrypt.hash("Mhowlader9596@", 10);

  await prisma.user.upsert({
    where: { email: "mrapi105@gmail.com" },
    update: { avatar: "/avatars/mrapi.png" },
    create: {
      email: "mrapi105@gmail.com",
      password: hashedPassword,
      name: "Mrapi",
      role: "LANDLORD",
      avatar: "/avatars/mrapi.png",
    },
  });

  await prisma.user.upsert({
    where: { email: "mhowlader33@yahoo.com" },
    update: { avatar: "/avatars/moslah.png" },
    create: {
      email: "mhowlader33@yahoo.com",
      password: hashedPassword,
      name: "M Howlader",
      role: "LANDLORD",
      avatar: "/avatars/moslah.png",
    },
  });

  console.log("Users created.");

  // Create properties with apartments
  // 1342 Noble Ave: BF, BR, 1F, 1R, 2F
  const prop1342 = await prisma.property.upsert({
    where: { address: "1342 Noble Ave" },
    update: {},
    create: {
      address: "1342 Noble Ave",
      apartments: {
        create: [
          { unit: "BF" },
          { unit: "BR" },
          { unit: "1F" },
          { unit: "1R" },
          { unit: "2F" },
        ],
      },
    },
    include: { apartments: true },
  });

  // 1252 Noble Ave: BF, BR, 1F, 1R, 2F, 2R
  await prisma.property.upsert({
    where: { address: "1252 Noble Ave" },
    update: {},
    create: {
      address: "1252 Noble Ave",
      apartments: {
        create: [
          { unit: "BF" },
          { unit: "BR" },
          { unit: "1F" },
          { unit: "1R" },
          { unit: "2F" },
          { unit: "2R" },
        ],
      },
    },
  });

  console.log("Properties created.");

  // Create tenant for 1342 Noble Ave Apt 2F: Mahmuda Riya, DOB 03/19/2001
  const apt2F = prop1342.apartments.find((a) => a.unit === "2F");
  if (apt2F) {
    // Clear existing tenancy data for this apartment to avoid duplicates on re-seed
    const existingTenancies = await prisma.tenancy.findMany({ where: { apartmentId: apt2F.id } });
    for (const t of existingTenancies) {
      await prisma.payment.deleteMany({ where: { tenancyId: t.id } });
    }
    await prisma.tenancy.deleteMany({ where: { apartmentId: apt2F.id } });

    const tenant = await prisma.tenant.upsert({
      where: { id: "mahmuda-riya-seed" },
      update: {},
      create: {
        id: "mahmuda-riya-seed",
        name: "Mahmuda Riya",
        dob: new Date(Date.UTC(2001, 2, 19)), // March 19, 2001
      },
    });

    const tenancy = await prisma.tenancy.create({
      data: {
        apartmentId: apt2F.id,
        tenantId: tenant.id,
        monthlyRent: 1200,
        startDate: new Date(2024, 0, 1), // Jan 1, 2024
        isActive: true,
      },
    });

    // Generate payment records from Jan 2024 through current month + 1
    const payments = [];
    const now = new Date();
    const current = new Date(2024, 0, 1);

    while (
      current.getFullYear() < now.getFullYear() ||
      (current.getFullYear() === now.getFullYear() && current.getMonth() <= now.getMonth() + 1)
    ) {
      payments.push({
        tenancyId: tenancy.id,
        amount: 1200,
        dueDate: new Date(current),
        paidAmount: 0,
      });
      current.setMonth(current.getMonth() + 1);
    }

    await prisma.payment.createMany({ data: payments });

    console.log("Tenant Mahmuda Riya created with payment records.");
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
