export function useFieldOptions<T>(load: () => Promise<T[]>) {
  const opciones = ref<T[]>([]);
  const loading = ref(false);
  const error = ref("");

  onMounted(async () => {
    loading.value = true;
    try {
      opciones.value = await load();
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : "No se pudieron cargar las opciones";
      useMessage().error(error.value);
    } finally {
      loading.value = false;
    }
  });

  return { opciones, loading, error };
}
