/**
 * Seed directory of users across the three demo companies. Acts as the stand-in
 * "users" table: powers login resolution, assignee/observer pickers, and the
 * company-based dashboard filters.
 */
import type { UserRef } from '@/domain/models';

/** A directory user: base {@link UserRef} plus company and optional role. */
export type MockUserWithCompany = UserRef & { company: string; role?: string };

export const MOCK_USERS: MockUserWithCompany[] = [
  {
    id: 'a3f7c1d8e6b94025f8a1c7d2',
    name: 'Diego Salazar',
    email: 'diego.salazar@constructoradelvalle.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=diego.salazar',
    company: 'CONSTRUCTORA DEL VALLE',
    role: 'Ingeniero Civil',
  },
  {
    id: 'b8e2f4a9c1d7360be5f2a8c4',
    name: 'Paula Restrepo',
    email: 'paula.restrepo@constructoradelvalle.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=paula.restrepo',
    company: 'CONSTRUCTORA DEL VALLE',
    role: 'Arquitecta',
  },
  {
    id: 'c5a9d3e7f2b84671ac6d3e9f',
    name: 'Tomás Beltrán',
    email: 'tomas.beltran@constructoradelvalle.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=tomas.beltran',
    company: 'CONSTRUCTORA DEL VALLE',
    role: 'Supervisor',
  },
  {
    id: 'd1c6b8a4e9f73582bd7e4f0a',
    name: 'Camilo Duarte',
    email: 'camilo.duarte@constructoradelvalle.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=camilo.duarte',
    company: 'CONSTRUCTORA DEL VALLE',
    role: 'Residente',
  },
  {
    id: 'e4f8a2c6d1b95793ce8f5a1b',
    name: 'Isabela Nieto',
    email: 'isabela.nieto@constructoradelvalle.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=isabela.nieto',
    company: 'CONSTRUCTORA DEL VALLE',
    role: 'Coordinadora',
  },
  {
    id: 'flyworkflow_u1',
    name: 'Camila Rojas',
    email: 'camila.rojas@flyworkflow.io',
    avatarUrl: 'https://i.pravatar.cc/150?u=camila.rojas',
    company: 'FLYWORKFLOW',
    role: 'Superadmin',
  },
  {
    id: 'flyworkflow_u2',
    name: 'Andrés Vargas',
    email: 'andres.vargas@flyworkflow.io',
    avatarUrl: 'https://i.pravatar.cc/150?u=andres.vargas',
    company: 'FLYWORKFLOW',
    role: 'Desarrollador',
  },
  {
    id: 'flyworkflow_u3',
    name: 'Laura Méndez',
    email: 'laura.mendez@flyworkflow.io',
    avatarUrl: 'https://i.pravatar.cc/150?u=laura.mendez',
    company: 'FLYWORKFLOW',
    role: 'QA',
  },
  {
    id: 'meridiano_u1',
    name: 'Santiago Ibarra',
    email: 'santiago.ibarra@grupomeridiano.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=santiago.ibarra',
    company: 'GRUPO MERIDIANO',
    role: 'Inspector',
  },
  {
    id: 'meridiano_u2',
    name: 'Valeria Cárdenas',
    email: 'valeria.cardenas@grupomeridiano.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=valeria.cardenas',
    company: 'GRUPO MERIDIANO',
    role: 'Directora',
  },
];

// Shared lookup so any filter needing "which company does this user belong
// to" (dashboard metrics, critical-issues table…) resolves in O(1).
export const USER_COMPANY_MAP = new Map(MOCK_USERS.map((u) => [u.id, u.company]));
