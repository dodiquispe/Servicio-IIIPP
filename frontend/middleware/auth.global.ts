import { roleHomePath, useUserSession } from "~/utils/session";

const publicRoutes = new Set([
  "/",
  "/reserva/admision",
  "/reserva",
  "/reserva/confirmacion",
  "/pago",
  "/auth/login",
  "/contacto",
]);

export default defineNuxtRouteMiddleware((to) => {
  if (publicRoutes.has(to.path)) return;

  const session = useUserSession();
  if (!session.isAuthenticatedNow()) {
    session.clear();
    return navigateTo({
      path: "/auth/login",
      query: { redirect: to.fullPath },
    });
  }
  if (to.path === "/dashboard") {
    const home = roleHomePath(session.roles.value);
    if (home !== to.path) return navigateTo(home, { replace: true });
  }

});
