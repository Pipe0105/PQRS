# PQRS Web App

Formulario de PQRS con panel interno, autenticacion y roles. Stack: Next.js (App Router) + TypeScript + Tailwind + React Hook Form + Zod + Prisma + MySQL.

## Requisitos

- Node.js 20+
- MySQL/MariaDB (local o servidor)

## Configuracion rapida

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
- Confirmacion: `http://localhost:3000/pqrs/confirmacion/[caseNumber]`
- Panel admin PQRS: `http://localhost:3000/admin/pqrs`
- Panel admin usuarios: `http://localhost:3000/admin/usuarios`
- Login: `http://localhost:3000/login`
- Recuperacion: `http://localhost:3000/reset-password`

## Endpoints

- `GET /api/catalogos` (sedes, plantas, tipos)
- `POST /api/pqrs` (crear solicitud, con archivos multipart)
- `GET /api/pqrs` (listar para admin)
- `GET /api/pqrs/:id` (detalle)
- `GET /api/pqrs/:id/evidencias/:evidenciaId` (descargar archivo)
- `GET /api/pqrs/:id/respuestas/:respuestaId/evidencias/:evidenciaId` (adjuntos de respuesta)
- `POST /api/test/email` (envio de correo de prueba, requiere admin)

## Variables de entorno

Ver `.env.example`. Importantes:

- `DATABASE_URL`
- `SESSION_TTL_DAYS`
- `RESET_TTL_MINUTES`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `SMTP_FROM`, `SMTP_TO`, `SMTP_SECURE`
- `APP_URL` (ej: `https://tu-dominio.com`, para links en correos)

## Scripts utiles

- `npm run lint`
- `npm run typecheck`
- `npm run prisma:studio`

## Notas

- Subidas: maximo 5 archivos, 10MB por archivo, tipos JPG/PNG/PDF.
- Los archivos se almacenan en MySQL (columna binaria administrada por Prisma para `Bytes`).
- El numero de caso se genera con `nanoid` (formato corto, legible).
- autenticacion:
  - Solo usuarios autenticados pueden enviar PQRS.
  - Admin puede gestionar usuarios y generar tokens de Recuperacion.
  - Recuperacion de contrasena usa un token generado por admin (sin email).
- Notificacion por correo:
  - Se envia al crear una solicitud si el SMTP está configurado.

