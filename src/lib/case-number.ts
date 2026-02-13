import type { PrismaClient } from "@prisma/client";

const CASE_PREFIX = "CASO-";

export async function generateCaseNumber(prisma: PrismaClient) {
  const rows = await prisma.$queryRawUnsafe<Array<{ maxNumber: number | string | null }>>(
    `SELECT COALESCE(MAX((substring("caseNumber" from '^${CASE_PREFIX}(\\d+)$'))::int), 0) AS "maxNumber"
     FROM "Pqrs"`,
  );

  const current = Number(rows[0]?.maxNumber ?? 0);
  const next = Number.isFinite(current) ? current + 1 : 1;
  return `${CASE_PREFIX}${next}`;
}
