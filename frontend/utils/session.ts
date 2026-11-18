import { computed } from "vue";

export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const sessionCookieOptions = {
  path: "/",
  secure: !import.meta.dev,
  sameSite: "lax" as const,
};

export interface SessionRole {
  id: string;
  descripcion: string;
  id_estado?: number;
}

export interface SessionUser {
  id: string;
  nombre_usuario: string;
  correo?: string | null;
  persona?: {
    nombres?: string;
    primer_apellido?: string | null;
    segundo_apellido?: string | null;
    nro_documento?: string | null;
    movil?: string | null;
    foto?: string | null;
    correo_personal?: string | null;
  };
}

export interface SessionResource {
  id: string;
  id_recurso_padre?: string | null;
  title: string;
  icon: string;
  path?: string | null;
}

export interface SessionData {
  usuario: SessionUser;
  roles: SessionRole[];
  recursos: SessionResource[];
  accessToken: string;
}

export interface ServiceAssignment {
  id_usuario: string;
  id_servicio: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  id_estado?: number;
  rol: { descripcion: string } | null;
  servicio: { id: string; servicio: string; id_estado: number };
}

export function useUserSession() {
  const accessToken = useCookie<string | null>(
    "accessToken",
    sessionCookieOptions,
  );
  const usuario = useCookie<SessionUser | null>("usuario", sessionCookieOptions);
  const roles = useCookie<SessionRole[] | null>("roles", sessionCookieOptions);
  const recursos = useCookie<SessionResource[] | null>(
    "recursos",
    sessionCookieOptions,
  );
  const lastActivity = useCookie<number | null>("sessionLastActivity", {
    ...sessionCookieOptions,
    maxAge: SESSION_IDLE_TIMEOUT_MS / 1000,
  });
  function isAuthenticatedNow(): boolean {
    return (
      Boolean(usuario.value?.id) &&
      Boolean(accessToken.value) &&
      Array.isArray(roles.value) &&
      Array.isArray(recursos.value) &&
      !isSessionExpired(lastActivity.value)
    );
  }

  const authenticated = computed(isAuthenticatedNow);

  function touch(): void {
    if (!isAuthenticatedNow()) return;
    lastActivity.value = Date.now();
  }

  function clear(): void {
    accessToken.value = null;
    usuario.value = null;
    roles.value = null;
    recursos.value = null;
    lastActivity.value = null;
  }

  function save(session: SessionData): void {
    accessToken.value = session.accessToken;
    usuario.value = session.usuario;
    roles.value = session.roles;
    recursos.value = session.recursos;
    lastActivity.value = Date.now();
  }

  return {
    accessToken,
    usuario,
    roles,
    recursos,
    lastActivity,
    authenticated,
    isAuthenticatedNow,
    touch,
    clear,
    save,
  };
}

export function isSessionExpired(
  lastActivity: number | string | null | undefined,
  now = Date.now(),
): boolean {
  if (lastActivity === null || lastActivity === undefined || lastActivity === "") {
    return true;
  }
  const timestamp = Number(lastActivity);
  return (
    !Number.isFinite(timestamp) ||
    now - timestamp < 0 ||
    now - timestamp >= SESSION_IDLE_TIMEOUT_MS
  );
}

export function normalizeRoleName(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase();
}

export function sessionHasRole(
  roles: SessionRole[] | null | undefined,
  roleName: string,
): boolean {
  const normalizedRole = normalizeRoleName(roleName);
  return (
    roles?.some(
      (role) =>
        role.id_estado === 1 &&
        normalizeRoleName(role.descripcion).includes(normalizedRole),
    ) ?? false
  );
}

export function roleHomePath(roles: SessionRole[] | null | undefined): string {
  if (sessionHasRole(roles, "administrador")) return "/administracion/reportes";
  if (sessionHasRole(roles, "secretaria")) return "/secretaria/reagendamientos";
  if (sessionHasRole(roles, "practicante")) return "/agenda/practicante";
  if (sessionHasRole(roles, "responsable")) return "/agenda/practicante";
  return "/dashboard";
}

export function getCurrentUserServiceAssignments(
  assignments: ServiceAssignment[],
  userId: string,
  roleName: string,
): ServiceAssignment[] {
  const normalizedRole = normalizeRoleName(roleName);
  return assignments.filter(
    (assignment) =>
      assignment.id_usuario === userId &&
      (assignment.id_estado === undefined || assignment.id_estado === 1) &&
      assignment.servicio.id_estado === 1 &&
      isAssignmentCurrent(assignment) &&
      normalizeRoleName(assignment.rol?.descripcion).includes(normalizedRole),
  );
}

export function isAssignmentCurrent(
  assignment: Pick<ServiceAssignment, "fecha_inicio" | "fecha_fin">,
  today = localDate(),
): boolean {
  return (
    assignment.fecha_inicio <= today &&
    (!assignment.fecha_fin || assignment.fecha_fin >= today)
  );
}

function localDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());
}
