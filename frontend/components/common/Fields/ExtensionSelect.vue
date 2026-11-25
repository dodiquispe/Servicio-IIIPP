<template>
  <ParametroSelect
    v-bind="{ ...presentacion, ...$attrs }"
    :model-value="modelValue"
    :label="label"
    tipo="extension"
    item-value="id"
    clearable
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

defineProps<{
  modelValue: number | null;
  label: string;
}>();
const emit = defineEmits<{ "update:modelValue": [value: number | null] }>();
</script>
