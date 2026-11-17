import { useState } from "#imports";

interface ToastItem {
  message: string | null;
  title: string | null;
  icon: string;
  theme: string;
  progress: number;
  key: string;
  interval?: ReturnType<typeof setInterval>;
}
export function useMessage() {
  const items = useState<ToastItem[]>("items", () => []);
  const timeout_default = 3000;
  const success = (
    message?: string | null,
    title?: string | null,
    option: { theme?: string; timeout?: number } = {},
  ) => {
    add(
      message || "La operación se realizó correctamente.",
      title || "Correcto",
      "mdi-check",
      {
        theme: option.theme || "success",
        timeout: option.timeout || timeout_default,
      },
    );
  };
  const info = (
    message: string | null,
    title: string | null,
    option: any = {},
  ) => {
    add(
      message || "Revise la documentación.",
      title || "Información",
      "mdi-information",
      {
        theme: "info",
        timeout: option.timeout || timeout_default,
      },
    );
  };
  const warning = (
    message?: string | null,
    title?: string | null,
    option: any = {},
  ) => {
    add(
      message || "Ocurrió algo inesperado al procesar su operación.",
      title || "Advertencia",
      "mdi-alert",
      { theme: "warning", timeout: option.timeout || timeout_default },
    );
  };
  const error = (
    message?: string | null,
    title?: string | null,
    option: any = {},
  ) => {
    add(
      message || "Ocurrió un error al procesar su operación.",
      title || "Error",
      "mdi-alert-circle",
      { theme: "error", timeout: option.timeout || timeout_default },
    );
  };
  const add = (
    message: string,
    title: string,
    icon: string,
    { theme, timeout }: { theme: string; timeout: number },
  ) => {
    if (import.meta.server) return;

    const tiempo_notificacion = timeout || timeout_default;
    const tiempo_iteracion = 100;
    const tiempo_resta = (100 * tiempo_iteracion) / tiempo_notificacion;
    const item = reactive<ToastItem>({
      message,
      title,
      icon,
      theme,
      progress: 100,
      key: `${Date.now()}-${Math.random()}`,
    });

    item.interval = setInterval(() => {
      item.progress -= tiempo_resta;
      if (item.progress <= 0) {
        item.progress = 0;
        if (item.interval !== undefined) {
          clearInterval(item.interval);
          item.interval = undefined;
        }
      }
    }, tiempo_iteracion);

    setTimeout(() => {
      remove(item);
    }, tiempo_notificacion);
    items.value.push(item);
  };

  const remove = (item: ToastItem) => {
    if (item.interval !== undefined) {
      clearInterval(item.interval);
      item.interval = undefined;
    }
    const index = items.value.indexOf(item);
    if (index !== -1) {
      items.value.splice(index, 1);
    }
  };
  return { items, success, info, warning, error, add, remove };
}
