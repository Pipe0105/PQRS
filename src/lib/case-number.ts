import type { PrismaClient } from "@prisma/client";

const CASE_PREFIX = "CASO";

type GenerateCaseNumberInput = {
  sedeId: string;
  plantaId: string;
  sedeNombre?: string;
  plantaNombre?: string;
};

function normalizeSegment(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();

  return normalized || "GENERAL";
}

function parseSequence(caseNumber: string) {
  const match = caseNumber.match(/-(\d+)$/);
  if (!match) return null;

  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

export async function generateCaseNumber(prisma: PrismaClient, input: GenerateCaseNumberInput) {
  const sedeNombre = input.sedeNombre ?? "SEDE";
  const plantaNombre = input.plantaNombre ?? "PLANTA";
  const prefix = `${CASE_PREFIX}-${normalizeSegment(sedeNombre)}-${normalizeSegment(plantaNombre)}`;

  const existing = await prisma.pqrs.findMany({
    where: { sedeId: input.sedeId, plantaId: input.plantaId },
    select: { caseNumber: true },
  });

  let maxNumber = 0;

  for (const item of existing) {
    const value = parseSequence(item.caseNumber);

    if (value !== null && value > maxNumber) {
      maxNumber = value;
    }
  }

  return `${prefix}-${String(maxNumber + 1).padStart(2, "0")}`;
}
