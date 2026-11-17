import { createService } from "~/utils/service";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const session = useUserSession();

  return {
    provide: {
      service: createService(config.public.graphqlUrl, () => session.accessToken.value, () => {
        session.clear();
        useMessage().warning("La cuenta está inactiva o la sesión venció. Inicia sesión nuevamente.");
        void navigateTo("/auth/login");
      }),
    },
  };
});
