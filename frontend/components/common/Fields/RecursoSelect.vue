<template>
  <v-autocomplete
    :model-value="modelValue"
    :items="recursos"
    item-title="title"
    item-value="id"
    :label="label"
    :loading="loading"
    clearable
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
interface Recurso {
  id: string;
  title: string;
}

const props = defineProps<{
  modelValue: string | null;
  label: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
}>();

const { $service } = useNuxtApp();

const recursos = ref<Recurso[]>([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    const options: Array<{ id: string; title: string; id_estado: number }> = [];
    let pagina = 1;
    let count = 0;
    do {
      const result = await $service.graphql<{ recursos: { rows: Array<{ id: string; title: string; id_estado: number }>; count: number } }>({
        query: `query($pagina: Int!) { recursos(limit:100, pagina:$pagina) { count rows { id title id_estado } } }`,
        variables: { pagina },
      });
      options.push(...result.recursos.rows);
      count = result.recursos.count;
      if (!result.recursos.rows.length) break;
      pagina++;
    } while (options.length < count);
    recursos.value = options.filter((item) => item.id_estado === 1);
  } catch (cause) {
    useMessage().error(cause instanceof Error ? cause.message : "No se pudieron cargar las opciones");
  } finally {
    loading.value = false;
  }
});
</script>