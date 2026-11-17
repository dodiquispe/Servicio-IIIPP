<template>
  <ParametroSelect
    :model-value="modelValue"
    :label="label"
    tipo="extension"
    item-value="id"
    clearable
    density="compact"
    variant="outlined"
    hide-details
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import ParametroSelect from "./ParametroSelect.vue";

defineProps<{ modelValue: number | null; label: string }>();
const emit = defineEmits<{ "update:modelValue": [value: number | null] }>();
</script>
