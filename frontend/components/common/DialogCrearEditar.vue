<template>
  <v-dialog
    :model-value="modelValue"
    :max-width="props.maxWidth"
    max-height="90vh"
    @update:model-value="setDialog"
  >
    <v-card>
      <v-card-title
        class="d-flex justify-space-between align-center dialog-header"
      >
        <div class="text-h6 text-medium ps-2">
          {{ props.titulo || `${isEditing ? "Editar " : "Crear "}${tabla}` }}
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Cerrar"
          @click="closeDialog"
        />
      </v-card-title>
      <v-divider />
      <v-form ref="form" @submit.prevent="enviar">
        <v-card-text class="dialog-content">
          <slot name="content">
            <v-row dense>
              <v-col
                v-for="input in inputs"
                :key="input.field"
                cols="12"
                :sm="input.col ?? 12"
                :class="{
                  'd-none': input.type === 'hidden',
                  'pb-1': input.type !== 'hidden',
                }"
              >
                <input
                  v-if="input.type === 'hidden'"
                  v-model="formData[input.field]"
                  type="hidden"
                />
                <v-select
                  v-else-if="input.type === 'select'"
                  v-model="formData[input.field]"
                  :label="input.descripcion"
                  :items="input.items ?? []"
                  :item-title="input.itemTitle ?? 'title'"
                  :item-value="input.itemValue ?? 'value'"
                  :rules="rulesFor(input)"
                  :required="input.required"
                  density="compact"
                  variant="outlined"
                  hide-details="auto"
                />
                <v-combobox
                  v-else-if="input.type === 'icon'"
                  v-model="formData[input.field]"
                  :label="input.descripcion"
                  :items="input.items ?? []"
                  :item-title="input.itemTitle ?? 'title'"
                  :item-value="input.itemValue ?? 'value'"
                  :rules="rulesFor(input)"
                  :required="input.required"
                  density="compact"
                  variant="outlined"
                  hide-details="auto"
                >
                  <template #prepend-inner>
                    <v-icon
                      v-if="typeof formData[input.field] === 'string'"
                      :icon="String(formData[input.field])"
                    />
                  </template>
                </v-combobox>
                <v-checkbox
                  v-else-if="input.type === 'boolean'"
                  v-model="formData[input.field]"
                  :label="input.descripcion"
                  :rules="rulesFor(input)"
                  density="compact"
                  hide-details="auto"
                />
                <RecursoSelect
                  v-else-if="input.type === 'recurso'"
                  v-model="formData[input.field] as string | null"
                  :label="input.descripcion"
                  :rules="rulesFor(input)"
                  :required="input.required"
                />
                <RolSelect
                  v-else-if="input.type === 'rol'"
                  v-model="formData[input.field] as string | null"
                  :label="input.descripcion"
                  :rules="rulesFor(input)"
                  :required="input.required"
                />
                <ServicioSelect
                  v-else-if="input.type === 'servicio'"
                  v-model="formData[input.field] as string | null"
                  :label="input.descripcion"
                  :rules="rulesFor(input)"
                  :required="input.required"
                />
                <GeneroSelect
                  v-else-if="input.type === 'genero'"
                  v-model="formData[input.field] as number | null"
                  :label="input.descripcion"
                  :rules="rulesFor(input)"
                  :required="input.required"
                />
                <ExtensionSelect
                  v-else-if="input.type === 'extension'"
                  v-model="formData[input.field] as number | null"
                  :label="input.descripcion"
                  :rules="rulesFor(input)"
                  :required="input.required"
                />
                <ReferenciaInstitucionalSelect
                  v-else-if="input.type === 'referencia_institucional'"
                  v-model="formData[input.field] as string | null"
                  :label="input.descripcion"
                  :rules="rulesFor(input)"
                  :required="input.required"
                />
                <EstadoCasoSelect
                  v-else-if="input.type === 'estado_caso'"
                  v-model="formData[input.field] as number | null"
                  :label="input.descripcion"
                  :rules="rulesFor(input)"
                  :required="input.required"
                />
                <PracticanteSelect
                  v-else-if="input.type === 'practicante'"
                  v-model="formData[input.field] as string | null"
                  :label="input.descripcion"
                  :id-servicio="input.idServicio"
                  :rules="rulesFor(input)"
                  :required="input.required"
                />
                <PacienteSelect
                  v-else-if="input.type === 'paciente'"
                  v-model="formData[input.field] as string | null"
                  :label="input.descripcion"
                  :id-servicio="input.idServicio"
                  :rules="rulesFor(input)"
                  :required="input.required"
                />
                <ParametroSelect
                  v-else-if="input.type === 'parametro'"
                  v-model="formData[input.field] as string | number | null"
                  :tipo="input.parametro ?? ''"
                  :label="input.descripcion"
                  :item-value="input.itemValue === 'valor' ? 'valor' : 'id'"
                  :rules="rulesFor(input)"
                  :required="input.required"
                />
                <v-select
                  v-else-if="
                    input.type === 'entidad' || input.type === 'estado'
                  "
                  v-model="formData[input.field]"
                  :label="input.descripcion"
                  :items="input.items ?? []"
                  :item-title="input.itemTitle ?? 'title'"
                  :item-value="input.itemValue ?? 'value'"
                  :rules="rulesFor(input)"
                  :required="input.required"
                  density="compact"
                  variant="outlined"
                  hide-details="auto"
                />
                <v-textarea
                  v-else-if="input.type === 'textarea'"
                  v-model="formData[input.field]"
                  :label="input.descripcion"
                  :rules="rulesFor(input)"
                  :required="input.required"
                  :maxlength="input.maxlength ?? 500"
                  variant="outlined"
                  density="compact"
                  hide-details="auto"
                  rows="1"
                  max-rows="6"
                  auto-grow
                  class="dialog-textarea"
                />
                <v-text-field
                  v-else
                  v-model="formData[input.field]"
                  :label="input.descripcion"
                  :type="
                    input.type === 'number' ||
                    input.type === 'time' ||
                    input.type === 'date'
                      ? input.type
                      : 'text'
                  "
                  :rules="rulesFor(input)"
                  :required="input.required"
                  :maxlength="input.maxlength ?? 200"
                  density="compact"
                  variant="outlined"
                  hide-details="auto"
                  :min="input.type === 'number' ? input.min : undefined"
                  :max="input.type === 'number' ? input.max : undefined"
                  :step="
                    input.type === 'time'
                      ? 60
                      : input.type === 'number' && input.integer
                        ? 1
                        : undefined
                  "
                />
              </v-col>
            </v-row>
          </slot>
        </v-card-text>
        <v-divider />
        <v-card-actions class="px-4 py-3">
          <v-spacer />
          <v-btn class="text-none" variant="text" @click="closeDialog">
            Cancelar
          </v-btn>
          <v-btn color="primary" type="submit" :loading="loading">
            {{ props.guardarTexto || "Guardar" }}
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type {
  CrudFormData,
  CrudDialogProps,
  CrudRecord,
  Inputs,
} from "~/interfaces/app/common";
import ParametroSelect from "~/components/common/Fields/ParametroSelect.vue";
import GeneroSelect from "~/components/common/Fields/GeneroSelect.vue";
import ExtensionSelect from "~/components/common/Fields/ExtensionSelect.vue";
import ReferenciaInstitucionalSelect from "~/components/common/Fields/ReferenciaInstitucionalSelect.vue";
import EstadoCasoSelect from "~/components/common/Fields/EstadoCasoSelect.vue";
import PracticanteSelect from "~/components/common/Fields/PracticanteSelect.vue";
import PacienteSelect from "~/components/common/Fields/PacienteSelect.vue";
import RolSelect from "~/components/common/Fields/RolSelect.vue";
import RecursoSelect from "~/components/common/Fields/RecursoSelect.vue";
import ServicioSelect from "~/components/common/Fields/ServicioSelect.vue";

interface FormComponent {
  validate: () => Promise<{ valid: boolean }>;
  resetValidation: () => void;
}

const props = withDefaults(defineProps<CrudDialogProps>(), {
  datos: () => ({}),
  mutation: "",
  idField: "id",
  mutationRows: "id",
  maxWidth: 560,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  "reload-item": [];
}>();

const form = ref<FormComponent | null>(null);
const loading = ref(false);
const { $service } = useNuxtApp();
const formData = reactive<CrudFormData>({});
const mutationName = computed(() => props.mutation || props.tabla);
const isEditing = computed(
  () =>
    props.datos[props.idField] !== undefined &&
    props.datos[props.idField] !== null,
);

function resetFormData(): void {
  for (const key of Object.keys(formData)) delete formData[key];
  for (const input of props.inputs) {
    formData[input.field] = toFormValue(props.datos[input.field]);
  }
  if (isEditing.value) {
    formData[props.idField] = toFormValue(props.datos[props.idField]);
  }
  form.value?.resetValidation();
}

function toFormValue(value: unknown) {
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null ||
    value === undefined
    ? value
    : undefined;
}

function rulesFor(input: Inputs) {
  const rules: Array<(value: unknown) => boolean | string> = [];
  if (input.required && input.type !== "hidden")
    rules.push(
      (value: unknown) =>
        (value !== null &&
          value !== undefined &&
          (typeof value !== "string" || value.trim() !== "")) ||
        `${input.descripcion} es obligatorio`,
    );
  if (input.type === "number")
    rules.push((value: unknown) => {
      if (value === null || value === undefined || value === "") return true;
      const number = Number(value);
      if (!Number.isFinite(number))
        return (
          input.numericMessage || `${input.descripcion} debe ser un número`
        );
      if (input.integer && !Number.isInteger(number))
        return (
          input.numericMessage ||
          `${input.descripcion} debe ser un número entero`
        );
      if (input.min !== undefined && number < input.min)
        return (
          input.numericMessage ||
          `${input.descripcion} debe ser mayor o igual a ${input.min}`
        );
      if (input.max !== undefined && number > input.max)
        return (
          input.numericMessage ||
          `${input.descripcion} debe ser menor o igual a ${input.max}`
        );
      return true;
    });
  if (input.type === "icon")
    rules.push((value: unknown) => {
      const allowed = (input.items ?? []).some((item) =>
        typeof item === "string"
          ? item === value
          : item[input.itemValue ?? "value"] === value,
      );
      return allowed || "Seleccione un ícono disponible de la lista";
    });
  return rules;
}

function setDialog(value: boolean): void {
  emit("update:modelValue", value);
}

function closeDialog(): void {
  setDialog(false);
}

function inputData(): CrudFormData {
  return Object.fromEntries(
    Object.entries(formData).map(([key, value]) => {
      const input = props.inputs.find((field) => field.field === key);
      if (
        input?.type === "number" &&
        typeof value === "string" &&
        value !== ""
      ) {
        return [key, Number(value)];
      }
      return [key, value];
    }),
  );
}

async function enviar(): Promise<void> {
  const validation = await form.value?.validate();
  if (!validation?.valid) return;

  loading.value = true;
  let createdRecord: CrudRecord | undefined;
  const submittedData = inputData();
  try {
    if (props.onSave) {
      await props.onSave(submittedData, isEditing.value);
      useMessage().success(
        `${props.tabla} ${isEditing.value ? "editado" : "creado"} con éxito`,
      );
      closeDialog();
      emit("reload-item");
      return;
    }

    const query = isEditing.value
      ? $querys.mutationEditWithVariable(mutationName.value, props.mutationRows)
      : $querys.mutationCreateWithVariable(
          mutationName.value,
          props.mutationRows,
        );
    const result = await $service.graphql({
      query,
      variables: { datos: submittedData },
    });

    if (!isEditing.value) {
      const operationName = mutationName.value;
      const createField = `create${operationName.charAt(0).toUpperCase()}${operationName.slice(1)}`;
      const record = result[createField];
      if (typeof record === "object" && record !== null) {
        createdRecord = record as CrudRecord;
        await props.afterCreate?.(createdRecord, submittedData);
      }
    }

    useMessage().success(
      `${props.tabla} ${isEditing.value ? "editado" : "creado"} con éxito`,
    );
    closeDialog();
    emit("reload-item");
  } catch (error) {
    if (createdRecord) {
      useMessage().error(
        `Se guardó ${props.tabla}, pero falló la creación de sus horarios. ${
          error instanceof Error ? error.message : ""
        }`,
      );
      closeDialog();
      emit("reload-item");
      return;
    }
    useMessage().error(
      error instanceof Error ? error.message : "No se pudo guardar el registro",
    );
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.modelValue, props.datos, props.inputs] as const,
  ([isOpen]) => {
    if (isOpen) resetFormData();
  },
  { immediate: true, deep: true },
);
</script>

<style scoped>
.dialog-header {
  background-color: rgba(var(--v-theme-secondary)) !important;
}
.dialog-content {
  max-height: 70vh;
  overflow-y: auto;
}

.dialog-content :deep(.v-field) {
  min-height: 40px;
}

.dialog-textarea :deep(textarea:not(.v-textarea__sizer)) {
  min-height: 44px;
  max-height: 180px;
  overflow-y: auto;
  resize: none;
}
</style>
