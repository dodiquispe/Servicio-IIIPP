<template>
  <v-alert v-if="sinServicios" :class="$attrs.class" type="info" variant="tonal">
    No hay servicios disponibles por el momento
  </v-alert>
  <v-autocomplete
    v-else
    v-bind="$attrs"
    :model-value="modelValue"
    :items="servicios"
    item-title="servicio"
    item-value="id"
    :return-object="false"
    :label="label"
    :loading="loading"
    :error-messages="error"
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
import { $querys } from "~/utils/querys.graphql";

defineOptions({ inheritAttrs: false });

interface Servicio {
  id: string;
  servicio: string;
  id_estado: number;
}

const props = defineProps<{
  modelValue: string | null;
  label: string;
  soloConResponsable?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
  "selection": [value: Servicio | null];
  "selection-reserva": [value: Pick<Servicio, "id" | "servicio"> | null];
}>();

const { $service } = useNuxtApp();

const servicios = ref<Array<Pick<Servicio, "id" | "servicio">>>([]);
const loading = ref(true);
const error = ref("");
const sinServicios = computed(() =>
  props.soloConResponsable && !loading.value && !error.value && servicios.value.length === 0,
);
const selectedService = computed(() => servicios.value.find(item => item.id === props.modelValue) ?? null);
watch(selectedService, value => {
  if (props.soloConResponsable) emit("selection-reserva", value);
  else emit("selection", value && "id_estado" in value ? value as Servicio : null);
});
function updateSelection(value: unknown): void {
  const id = typeof value === 'string' ? value : value && typeof value === 'object' && 'id' in value && typeof value.id === 'string' ? value.id : null;
  emit('update:modelValue', id);
}

onMounted(async () => {
  loading.value = true;

  try {
    if (props.soloConResponsable) {
      const result = await $service.graphql<{
        serviciosDisponiblesReserva: Array<{ id: string; nombre: string }>;
      }>({ query: $querys.publicas.serviciosDisponiblesReserva });
      servicios.value = result.serviciosDisponiblesReserva.map(({ id, nombre }) => ({ id, servicio: nombre }));
      if (props.modelValue && !selectedService.value) emit("update:modelValue", null);
      return;
    }

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
    const mensaje =
      cause instanceof Error
        ? cause.message
        : "No se pudieron cargar los servicios";
    if (props.soloConResponsable) error.value = mensaje;
    else useMessage().error(mensaje);
  } finally {
    loading.value = false;
  }
});
</script>
