# FlyWorkFlow — Backend

API REST del módulo de gestión de incidencias de FlyWorkFlow, construida con NestJS + TypeScript. Ver `docs/requirements.md §3` (raíz del repositorio) para el detalle de arquitectura y stack objetivo, y `docs/roadmap.md` para el estado de cada iteración.

---

## Stack tecnológico

| Capa          | Herramienta       |
| ------------- | ------------------ |
| Framework     | NestJS 11           |
| Lenguaje      | TypeScript (strict) |
| Validación    | `class-validator` + `ValidationPipe` global |
| Configuración | `@nestjs/config`    |
| ORM           | Prisma (`postgresql`) |
| Documentación API | `@nestjs/swagger` (`/api/docs`) |
| Testing       | Jest                |

---

## Primeros pasos

```bash
cd backend
npm install
cp .env.example .env   # completa DATABASE_URL con tu Postgres local
npm run prisma:migrate # crea las tablas (primera vez o tras cambiar el schema)
npm run prisma:seed    # carga el dataset ficticio de public/mocks/incidents.mock.json
npm run start:dev
```

`npm run prisma:seed` es idempotente (puedes correrlo varias veces sin duplicar datos) y crea 3 organizaciones, 10 usuarios y 200 incidencias. Todos los usuarios sembrados comparten la misma contraseña de prueba: `FlyWorkFlow2026!` (se imprime también al final del seed).

`npm run prisma:studio` abre una UI local para inspeccionar/editar los datos.

El servidor queda en `http://localhost:3001` (puerto distinto al del frontend, que usa `3000`). La documentación OpenAPI interactiva queda en `http://localhost:3001/api/docs`.

Verifica que el servicio responde:

```bash
curl http://localhost:3001/health
```

---

## Variables de entorno

Ver `.env.example`. Ninguna variable con secretos se versiona — `.env` está en `.gitignore` (heredado del `.gitignore` raíz).

---

## Estructura del proyecto

```
backend/
├── prisma/
│   ├── schema.prisma     # fuente de verdad de entidades (ver docs/data-model.md)
│   ├── migrations/       # migraciones versionadas, nunca editadas a mano
│   └── seed.ts           # carga public/mocks/incidents.mock.json en el schema relacional
├── src/
│   ├── modules/          # un módulo por responsabilidad (health, y los que se sumen por fase)
│   │   └── health/
│   ├── prisma/           # PrismaService/PrismaModule — inyectable en cualquier módulo
│   ├── app.module.ts     # módulo raíz — importa ConfigModule, PrismaModule y cada módulo de dominio
│   └── main.ts           # bootstrap local (dev). lambda.ts (Fase 3) será el handler serverless
└── test/                 # specs e2e (Jest + Supertest)
```

Cada módulo sigue el patrón `*.module.ts` + `*.controller.ts` + `*.service.ts` (+ `dto/` cuando aplica) — ver `docs/best-practices.md §NestJS` en la raíz del repositorio.

---

## Pruebas

```bash
npm run test        # unitarias
npm run test:e2e    # e2e (Jest + Supertest)
npm run test:cov    # cobertura
```

---

## Docker (imagen compatible con Lambda)

Build multi-stage: una etapa de instalación/build con devDependencies, y una etapa final mínima basada en la imagen oficial de Lambda para Node.js (`public.ecr.aws/lambda/nodejs:22`), que ya incluye el Runtime Interface Emulator (RIE) para pruebas locales.

```bash
docker build -t flyworkflow-backend .
docker run --rm -p 9000:8080 flyworkflow-backend
```

En otra terminal, invoca el handler simulando un evento de API Gateway:

```bash
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" \
  -d '{"httpMethod":"GET","path":"/health","headers":{},"requestContext":{"http":{"method":"GET","path":"/health"}}}'
```

Debe responder `{"statusCode":200,"body":"{\"status\":\"ok\",...}"}`. Detalle completo del flujo de despliegue real (Fase 6) en el `aws-deploy-guide.md` personal del propietario (no versionado).

## Lint y formato

```bash
npm run lint
npm run format
npm run type-check
```
