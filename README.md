# PQRS Web App

Formulario de PQRS con panel interno, autenticación y roles. Stack: Next.js (App Router) + TypeScript + Tailwind + React Hook Form + Zod + Prisma + PostgreSQL.

## Requisitos

- Node.js 20+
- PostgreSQL (local o servidor)

## Configuración rápida

1) Copia variables de entorno:

```bash
cp .env.example .env
```

2) Instala dependencias y genera Prisma Client:

```bash
npm install
npm run prisma:generate
```

3) Migraciones y seed:

```bash
npm run prisma:migrate -- --name init
npm run prisma:seed
```

4) Crea el primer administrador:

```bash
npm run admin:create -- --username admin --password "TuClaveSegura" --nombre "Administrador"
```

5) Levanta la app:

```bash
npm run dev
```

## Rutas

- Formulario: `http://localhost:3000/pqrs`
- Confirmación: `http://localhost:3000/pqrs/confirmacion/[caseNumber]`
- Panel admin PQRS: `http://localhost:3000/admin/pqrs`
- Panel admin usuarios: `http://localhost:3000/admin/usuarios`
- Login: `http://localhost:3000/login`
- Recuperación: `http://localhost:3000/reset-password`

## Endpoints

- `GET /api/catalogos` (sedes, plantas, tipos)
- `POST /api/pqrs` (crear solicitud, con archivos multipart)
- `GET /api/pqrs` (listar para admin)
- `GET /api/pqrs/:id` (detalle)
- `GET /api/pqrs/:id/evidencias/:evidenciaId` (descargar archivo)
- `POST /api/test/email` (envío de correo de prueba, requiere admin)

## Variables de entorno

Ver `.env.example`. Importantes:

- `DATABASE_URL`
- `SESSION_TTL_DAYS`
- `RESET_TTL_MINUTES`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `SMTP_FROM`, `SMTP_TO`, `SMTP_SECURE`

## Scripts útiles

- `npm run lint`
- `npm run typecheck`
- `npm run prisma:studio`

## Notas

- Subidas: máximo 5 archivos, 10MB por archivo, tipos JPG/PNG/PDF.
- Los archivos se almacenan en PostgreSQL (campo `bytea`).
- El número de caso se genera con `nanoid` (formato corto, legible).
- Autenticación:
  - Solo usuarios autenticados pueden enviar PQRS.
  - Admin puede gestionar usuarios y generar tokens de recuperación.
  - Recuperación de contraseña usa un token generado por admin (sin email).
- Notificación por correo:
  - Se envía al crear una solicitud si el SMTP está configurado.
