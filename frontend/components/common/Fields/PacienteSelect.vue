<template>
  <v-autocomplete
    :model-value="modelValue"
    :items="pacientes"
    item-title="nombre"
    item-value="id"
    :label="label"
    :loading="loading"
    :disabled="loading || !!error"
    clearable
    density="compact"
    variant="outlined"
    hide-details
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import { $querys } from "~/utils/querys.graphql";

const props = defineProps<{
  modelValue: string | null;
  label: string;
  idServicio?: string | null;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string | null] }>();

interface Expediente {
  id: string;
  id_servicio: string;
  persona: {
    nombres: string;
    primer_apellido?: string | null;
    segundo_apellido?: string | null;
  };
}

const { $service } = useNuxtApp();
const { opciones, loading, error } = useFieldOptions(async () => {
  const result = await $service.graphql<{ expedientes: Expediente[] }>({
    query: $querys.staff.expedientesAtencion,
  });
  return result.expedientes;
});

const pacientes = computed(() =>
  opciones.value
    .filter(item => !props.idServicio || item.id_servicio === props.idServicio)
    .map(item => ({
      id: item.id,
      nombre: [
        item.persona.nombres,
        item.persona.primer_apellido,
        item.persona.segundo_apellido,
      ].filter(Boolean).join(" "),
    })),
);
</script>
