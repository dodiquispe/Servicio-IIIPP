<template>
  <v-autocomplete
    :model-value="modelValue"
    :items="opciones"
    item-title="valor"
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
defineProps<{ modelValue: number | null; label: string }>();
const emit = defineEmits<{ "update:modelValue": [value: number | null] }>();
const { $service } = useNuxtApp();
interface Opcion { id: number; valor: string; tipo: string; id_estado: number }
const { opciones, loading, error } = useFieldOptions(async () => {
  const result = await $service.graphql<{ estado: Opcion[] }>({
    query: 'query { estado(tipo: "ESTADO_CASO") { id valor: descripcion tipo id_estado } }',
  });
  return result.estado.filter(item => item.tipo === "ESTADO_CASO" && item.id_estado === 1);
});
</script>

