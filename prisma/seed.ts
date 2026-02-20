import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const sedes = ["Mercamio Central", "Mercatodo Norte", "Mercamio Sur"];
  const tipos = [
    "Peticion",
    "Queja",
    "Reclamo",
    "Solicitud de informacion",
    "Sugerencia",
    "Vehiculos de transporte",
  ];

  const sedeRecords = await Promise.all(
    sedes.map((nombre) =>
      prisma.sede.upsert({
        where: { nombre },
        update: {},
        create: { nombre },
      }),
    ),
  );

  const sedeByName = new Map(sedeRecords.map((sede) => [sede.nombre, sede.id]));

  const plantas = [
    { nombre: "Planta Mercamio", sede: "Mercamio Central" },
    { nombre: "Planta Empaques", sede: "Mercamio Central" },
    { nombre: "Planta Mercatodo", sede: "Mercatodo Norte" },
    { nombre: "Planta Refrigerados", sede: "Mercatodo Norte" },
    { nombre: "Planta Distribución", sede: "Mercamio Sur" },
  ];

  for (const planta of plantas) {
    const existing = await prisma.planta.findFirst({
      where: { nombre: planta.nombre },
      select: { id: true },
    });

    if (existing) {
      await prisma.planta.update({
        where: { id: existing.id },
        data: { sedeId: sedeByName.get(planta.sede) },
      });
    } else {
      await prisma.planta.create({
        data: {
          nombre: planta.nombre,
          sedeId: sedeByName.get(planta.sede),
        },
      });
    }
  }

  await Promise.all(
    tipos.map((nombre) =>
      prisma.tipoReclamo.upsert({
        where: { nombre },
        update: {},
        create: { nombre },
      }),
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

