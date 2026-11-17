<template>
  <v-autocomplete
    :model-value="modelValue"
    :items="servicios"
    item-title="servicio"
    item-value="id"
    :return-object="false"
    :label="label"
    :loading="loading"
    clearable
    density="compact"
    variant="outlined"
    hide-details
    @update:model-value="updateSelection"
  >
    <template #selection="{ internalItem }"><span class="v-autocomplete__selection-text">{{ selectedService?.servicio || internalItem.title }}</span></template>
  </v-autocomplete>
</template>

<script setup lang="ts">
interface Servicio {
  id: string;
  servicio: string;
  id_estado: number;
}

const props = defineProps<{
  modelValue: string | null;
  label: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
  "selection": [value: Servicio | null];
}>();

const { $service } = useNuxtApp();

const servicios = ref<Servicio[]>([]);
const loading = ref(false);
const selectedService = computed(() => servicios.value.find(item => item.id === props.modelValue) ?? null);
watch(selectedService, value => emit('selection', value));
function updateSelection(value: unknown): void {
  const id = typeof value === 'string' ? value : value && typeof value === 'object' && 'id' in value && typeof value.id === 'string' ? value.id : null;
  emit('update:modelValue', id);
}

onMounted(async () => {
  loading.value = true;

  try {
    const result = await $service.graphql<{
      servicios: {
        rows: Servicio[];
        count: number;
      };
    }>({
      query: `
        query Servicios($limit: Int!, $pagina: Int!) {
          servicios(
            limit: $limit
            pagina: $pagina
          ) {
            rows {
              id
              servicio
              id_estado
            }
            count
          }
        }
      `,
      variables: {
        limit: 100,
        pagina: 1,
      },
    });

    servicios.value = result.servicios.rows.filter(
      (servicio) => servicio.id_estado === 1,
    );
  } catch (cause) {
    useMessage().error(
      cause instanceof Error
        ? cause.message
        : "No se pudieron cargar los servicios",
    );
  } finally {
    loading.value = false;
  }
});
</script>
