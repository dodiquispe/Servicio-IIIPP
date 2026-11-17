<template>
  <v-select
    :model-value="modelValue"
    :items="opciones"
    item-title="valor"
    :item-value="itemValue"
    :label="label"
    :loading="cargando"
    :error-messages="error"
    :disabled="disabled || cargando"
    :required="required"
    :rules="required ? [(value: unknown) => (value !== null && value !== undefined && value !== '') || 'Seleccione una opción'] : []"
    clearable
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts" generic="T extends string | number = string">
import { $querys } from "~/utils/querys.graphql";

interface Parametro {
  id: number;
  valor: string;
  tipo: string;
  id_estado: number;
}

const props = withDefaults(
  defineProps<{
    modelValue: T | null;
    tipo: string;
    label: string;
    required?: boolean;
    disabled?: boolean;
    itemValue?: "id" | "valor";
  }>(),
  { required: false, disabled: false, itemValue: "valor" },
);
const emit = defineEmits<{
  "update:modelValue": [value: T | null];
}>();
const { $service } = useNuxtApp();
const opciones = ref<Parametro[]>([]);
const cargando = ref(false);
const error = ref("");

onMounted(async () => {
  cargando.value = true;
  try {
    const result = await $service.graphql<{
      parametrosByTipo: Parametro[];
    }>({
      query: $querys.staff.parametrosPorTipo,
      variables: { tipo: props.tipo },
    });
    opciones.value = result.parametrosByTipo.filter(
      (item) => item.id_estado === 1 || (props.tipo === "tipo_atencion" && item.id_estado === 2),
    );
  } catch (requestError) {
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudieron cargar las opciones.";
  } finally {
    cargando.value = false;
  }
});
</script>
