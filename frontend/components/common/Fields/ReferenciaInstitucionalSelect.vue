<template>
  <v-autocomplete
    :model-value="modelValue"
    :items="opciones"
    item-title="nombre"
    item-value="id"
    :label="label"
    :loading="loading"
    :disabled="loading || !!error"
    clearable
    v-bind="presentacion"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import { useDefaults } from "vuetify";

const presentacion = useDefaults({
  density: "compact",
  variant: "outlined",
  hideDetails: true,
} as const, "VAutocomplete");

defineProps<{ modelValue: string | null; label: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string | null] }>();
const { $service } = useNuxtApp();
interface Opcion { id: string; nombre: string; id_estado: number }
const { opciones, loading, error } = useFieldOptions(async () => {
  const result = await $service.graphql<{ institucionesReferenciaActivas: Opcion[] }>({
    query: "query { institucionesReferenciaActivas { id nombre id_estado } }",
  });
  return result.institucionesReferenciaActivas.filter(item => item.id_estado === 1);
});
</script>

