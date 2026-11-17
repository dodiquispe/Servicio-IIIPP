<template>
  <v-autocomplete
    :model-value="modelValue"
    :items="practicantes"
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
const props = defineProps<{
  modelValue: string | null;
  label: string;
  idServicio?: string | null;
}>();
const emit = defineEmits<{ "update:modelValue": [value: string | null] }>();
interface Asignacion {
  id_servicio: string;
  id_estado: number;
  vigencia: string;
  rol: { descripcion: string; id_estado: number } | null;
  usuario: {
    id: string;
    id_estado: number;
    persona: { nombres: string; primer_apellido?: string | null; segundo_apellido?: string | null };
  };
}
const { $service } = useNuxtApp();
const { opciones, loading, error } = useFieldOptions(async () => {
  const result = await $service.graphql<{ servicioPersonal: Asignacion[] }>({
    query: `query {
      servicioPersonal {
        id_servicio id_estado vigencia
        rol { descripcion id_estado }
        usuario { id id_estado persona { nombres primer_apellido segundo_apellido } }
      }
    }`,
  });
  return result.servicioPersonal;
});
const practicantes = computed(() => {
  const usuarios = new Map<string, { id: string; nombre: string }>();
  for (const item of opciones.value) {
    if (item.id_estado !== 1 || item.usuario.id_estado !== 1 ||
        item.vigencia !== "Vigente" || item.rol?.id_estado !== 1 ||
        !item.rol.descripcion.toLowerCase().includes("practicante") ||
        (props.idServicio && item.id_servicio !== props.idServicio)) continue;
    const persona = item.usuario.persona;
    usuarios.set(item.usuario.id, {
      id: item.usuario.id,
      nombre: [persona.nombres, persona.primer_apellido, persona.segundo_apellido].filter(Boolean).join(" "),
    });
  }
  return [...usuarios.values()];
});
</script>
