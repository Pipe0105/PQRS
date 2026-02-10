# PQRS Web App

Formulario público de PQRS con panel interno básico. Stack: Next.js (App Router) + TypeScript + Tailwind + React Hook Form + Zod + Prisma/PostgreSQL + MinIO/S3 presigned URLs.

## Requisitos

- Node.js 20+
- Docker (recomendado para Postgres y MinIO)

## Configuración rápida

1) Copia variables de entorno:

```bash
cp .env.example .env
```

2) Levanta Postgres y MinIO:

```bash
docker compose up -d
```

3) Crea el bucket en MinIO:

- UI: `http://localhost:9001` (usuario `minioadmin`, clave `minioadmin`)
- Crea un bucket llamado `pqrs`

4) Instala dependencias y genera Prisma Client:

```bash
npm install
npm run prisma:generate
```

5) Migraciones y seed:

```bash
npm run prisma:migrate -- --name init
npm run prisma:seed
```

6) Crea el primer administrador:

```bash
npm run admin:create -- --username admin --password "TuClaveSegura" --nombre "Administrador"
```

7) Levanta la app:

```bash
npm run dev
```

## Rutas

- Formulario público: `http://localhost:3000/pqrs`
- Confirmación: `http://localhost:3000/pqrs/confirmacion/[caseNumber]`
- Panel interno: `http://localhost:3000/admin/pqrs`
- Login: `http://localhost:3000/login`
- Recuperación: `http://localhost:3000/reset-password`

## Endpoints

- `GET /api/catalogos` (sedes, plantas, tipos)
- `POST /api/pqrs` (crear solicitud)
- `GET /api/pqrs` (listar para admin)
- `GET /api/pqrs/:id` (detalle)
- `POST /api/uploads/presign` (presigned URLs)

## Variables de entorno

Ver `.env.example`. Importantes:

- `DATABASE_URL`
- `S3_ENDPOINT`, `S3_PUBLIC_BASE_URL`, `S3_BUCKET`
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`
- `S3_FORCE_PATH_STYLE=true` para MinIO

## Scripts útiles

- `npm run lint`
- `npm run typecheck`
- `npm run prisma:studio`

## Notas

- Subidas: máximo 5 archivos, 10MB por archivo, tipos JPG/PNG/PDF.
- El número de caso se genera con `nanoid` (formato corto, legible).
- Autenticación:
  - Solo usuarios autenticados pueden enviar PQRS.
  - Admin puede gestionar usuarios y generar tokens de recuperación.
  - Recuperación de contraseña usa un token generado por admin (sin email).
