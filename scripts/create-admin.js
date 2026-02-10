/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

async function main() {
  const username = getArg("--username");
  const password = getArg("--password");
  const nombre = getArg("--nombre");

  if (!username || !password) {
    console.log(
      "Uso: node scripts/create-admin.js --username admin --password TuClaveSegura --nombre \"Administrador\"",
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { username } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        role: "admin",
        isActive: true,
        nombre: nombre ?? existing.nombre,
      },
    });
    console.log("Admin actualizado:", username);
    return;
  }

  await prisma.user.create({
    data: {
      username,
      nombre: nombre ?? null,
      passwordHash,
      role: "admin",
      isActive: true,
    },
  });
  console.log("Admin creado:", username);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
