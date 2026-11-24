<template>
  <ParametroSelect
    v-bind="{ ...presentacion, ...$attrs }"
    :model-value="personalizada ? -1 : modelValue"
    :label="label"
    tipo="extension"
    item-value="id"
    :coincidencia-parcial-tipo="permitirPersonalizada"
    :opcion-adicional="permitirPersonalizada ? opcionPersonalizada : undefined"
    clearable
    @update:model-value="seleccionar"
  />
  <v-text-field
    v-if="permitirPersonalizada && personalizada"
    :model-value="typeof modelValue === 'string' ? modelValue : ''"
    label="Escribe la extensión"
    class="mt-2"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import { useDefaults } from "vuetify";
import ParametroSelect from "./ParametroSelect.vue";

defineOptions({ inheritAttrs: false });

const presentacion = useDefaults({
  density: "compact",
  variant: "outlined",
  hideDetails: true,
} as const, "VSelect");

const props = defineProps<{
  modelValue: number | string | null;
  label: string;
  permitirPersonalizada?: boolean;
}>();
const emit = defineEmits<{ "update:modelValue": [value: number | string | null] }>();
const opcionPersonalizada = { id: -1, valor: "Otra extensión" };
const personalizada = computed(() => props.permitirPersonalizada && typeof props.modelValue === "string");

function seleccionar(value: number | string | null) {
  emit("update:modelValue", value === opcionPersonalizada.id ? "" : value);
}
</script>
