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
| Documentación API | `@nestjs/swagger` (`/api/docs`) |
| Testing       | Jest                |

---

## Primeros pasos

```bash
cd backend
npm install
cp .env.example .env   # completa DATABASE_URL con tu Postgres local
npm run start:dev
```

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
├── src/
│   ├── modules/          # un módulo por responsabilidad (health, y los que se sumen por fase)
│   │   └── health/
│   ├── app.module.ts     # módulo raíz — importa ConfigModule y cada módulo de dominio
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

## Lint y formato

```bash
npm run lint
npm run format
npm run type-check
```
