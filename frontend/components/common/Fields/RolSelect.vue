<template>
  <v-autocomplete
    :model-value="modelValue"
    :items="roles"
    item-title="descripcion"
    item-value="id"
    :label="label"
    :loading="loading"
    clearable
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
interface Rol {
  id: string;
  descripcion: string;
}

const props = defineProps<{
  modelValue: string | null;
  label: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
}>();

const { $service } = useNuxtApp();

const roles = ref<Rol[]>([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    const options: Array<{ id: string; descripcion: string; id_estado: number }> = [];
    let pagina = 1;
    let count = 0;
    do {
      const result = await $service.graphql<{ roles: { rows: Array<{ id: string; descripcion: string; id_estado: number }>; count: number } }>({
        query: `query($pagina: Int!) { roles(limit:100, pagina:$pagina) { count rows { id descripcion id_estado } } }`,
        variables: { pagina },
      });
      options.push(...result.roles.rows);
      count = result.roles.count;
      if (!result.roles.rows.length) break;
      pagina++;
    } while (options.length < count);
    roles.value = options.filter((item) => item.id_estado === 1);
  } catch (cause) {
    useMessage().error(cause instanceof Error ? cause.message : "No se pudieron cargar las opciones");
  } finally {
    loading.value = false;
  }
});
</script>