import type { PrismaClient } from "@prisma/client";

const CASE_PREFIX = "CASO-";

export async function generateCaseNumber(prisma: PrismaClient) {
  const existing = await prisma.pqrs.findMany({
    where: { caseNumber: { startsWith: CASE_PREFIX } },
    select: { caseNumber: true },
  });

  let maxNumber = 0;

  for (const item of existing) {
    const raw = item.caseNumber.slice(CASE_PREFIX.length);
    const value = Number.parseInt(raw, 10);

    if (Number.isFinite(value) && value > maxNumber) {
      maxNumber = value;
    }
  }

  return `${CASE_PREFIX}${maxNumber + 1}`;
}
