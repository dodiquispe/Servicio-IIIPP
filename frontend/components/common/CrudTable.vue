<template>
  <DialogCrearEditar
    v-model="dialog"
    :datos="edittItem"
    :tabla="titulo"
    :mutation="mutation"
    :id-field="props.idField"
    :mutation-rows="props.mutationRows"
    :inputs="props.inputs"
    :after-create="props.afterCreate"
    :on-save="props.onSave"
    @reload-item="reloadTabla"
  />

  <v-sheet
    v-if="props.sourceItems === undefined"
    color="transparent"
    class="mx-4 mt-4"
  >
    <span>{{ tituloFormateado }}</span>

    <v-card-title
      class="d-flex justify-space-between align-center flex-wrap ga-2"
    >
      <v-card-actions>
        <v-btn
          v-if="props.inputs.length !== 0"
          :disabled="!props.canCreate"
          color="primary"
          class="table-create-btn text-none font-weight-regular"
          variant="tonal"
          @click="crearItem"
        >
          <template #prepend>
            <v-icon icon="mdi-plus" />
          </template>

          AGREGAR
        </v-btn>
      </v-card-actions>

      <v-card
        color="transparent"
        elevation="0"
        class="d-flex flex-shrink-0 pa-1"
      >
        <v-btn
          icon="mdi-filter"
          variant="flat"
          color="white"
          aria-label="Mostrar filtros"
          :aria-expanded="showFilters"
          class="table-toolbar-btn mx-2"
          @click="showFilters = !showFilters"
        >
          <v-icon icon="mdi-filter" color="grey-darken-4" />

          <v-tooltip activator="parent" location="bottom">
            Búsqueda/filtros
          </v-tooltip>
        </v-btn>

        <v-btn
          icon="mdi-reload"
          variant="flat"
          color="white"
          aria-label="Recargar tabla"
          class="table-toolbar-btn mx-2"
          @click="reloadFiltros"
        >
          <v-icon icon="mdi-reload" color="grey-darken-4" />

          <v-tooltip activator="parent" location="bottom">
            Recargar tabla
          </v-tooltip>
        </v-btn>
      </v-card>
    </v-card-title>
  </v-sheet>

  <v-sheet v-if="props.sourceItems === undefined" class="mx-4 mb-4">
    <v-card v-if="showFilters" color="secondary" class="pa-3 mb-3">
      <v-row align="center" style="height: auto">
        <v-col
          v-for="filter in props.filters"
          :key="filter.field"
          cols="12"
          sm="6"
          md="4"
          lg="3"
          :class="{ 'd-none': filter.type === 'hidden' }"
        >
          <v-text-field
            v-if="filter.type === 'text'"
            v-model="objeto[filter.field]"
            :label="filter.label"
            density="compact"
            variant="outlined"
            hide-details
            maxlength="200"
            clearable
            @keyup.enter="applyFilters"
          />

          <v-text-field
            v-else-if="filter.type === 'number'"
            v-model.number="objeto[filter.field]"
            :label="filter.label"
            type="number"
            density="compact"
            variant="outlined"
            hide-details
            @keyup.enter="applyFilters"
          />

          <v-text-field
            v-else-if="filter.type === 'date'"
            v-model="objeto[filter.field]"
            :label="filter.label"
            type="date"
            density="compact"
            variant="outlined"
            hide-details
            @keyup.enter="applyFilters"
          />

          <v-text-field
            v-else-if="filter.type === 'time'"
            v-model="objeto[filter.field]"
            :label="filter.label"
            type="time"
            density="compact"
            variant="outlined"
            hide-details
            @keyup.enter="applyFilters"
          />

          <v-textarea
            v-else-if="filter.type === 'textarea'"
            v-model="objeto[filter.field]"
            :label="filter.label"
            density="compact"
            variant="outlined"
            hide-details
            rows="1"
            auto-grow
            max-rows="6"
          />

          <v-checkbox
            v-else-if="filter.type === 'boolean'"
            v-model="objeto[filter.field]"
            :label="filter.label"
            density="compact"
            hide-details
          />

          <GeneroSelect
            v-else-if="filter.type === 'genero'"
            v-model="objeto[filter.field] as number | null"
            :label="filter.label"
          />
          <ExtensionSelect
            v-else-if="filter.type === 'extension'"
            v-model="objeto[filter.field] as number | null"
            :label="filter.label"
          />
          <ReferenciaInstitucionalSelect
            v-else-if="filter.type === 'referencia_institucional'"
            v-model="objeto[filter.field] as string | null"
            :label="filter.label"
          />
          <EstadoCasoSelect
            v-else-if="filter.type === 'estado_caso'"
            v-model="objeto[filter.field] as number | null"
            :label="filter.label"
          />
          <PracticanteSelect
            v-else-if="filter.type === 'practicante'"
            v-model="objeto[filter.field] as string | null"
            :label="filter.label"
            :id-servicio="filter.idServicio"
          />
          <PacienteSelect
            v-else-if="filter.type === 'paciente'"
            v-model="objeto[filter.field] as string | null"
            :label="filter.label"
            :id-servicio="filter.idServicio"
          />
          <ParametroSelect
            v-else-if="filter.type === 'parametro'"
            v-model="objeto[filter.field]"
            :tipo="filter.parametro ?? ''"
            :label="filter.label"
            :item-value="filter.itemValue === 'valor' ? 'valor' : 'id'"
            density="compact"
            variant="outlined"
            hide-details
          />

          <RolSelect
            v-else-if="filter.type === 'rol'"
            v-model="objeto[filter.field]"
            :label="filter.label"
            density="compact"
            variant="outlined"
            hide-details
          />

          <RecursoSelect
            v-else-if="filter.type === 'recurso'"
            v-model="objeto[filter.field]"
            :label="filter.label"
            density="compact"
            variant="outlined"
            hide-details
          />

          <ServicioSelect
            v-else-if="filter.type === 'servicio'"
            v-model="objeto[filter.field] as string | null"
            :label="filter.label"
            density="compact"
            variant="outlined"
            hide-details
          />

          <v-select
            v-else-if="['select', 'entidad', 'estado'].includes(filter.type)"
            v-model="objeto[filter.field]"
            :label="filter.label"
            :items="filter.items ?? []"
            :item-title="filter.itemTitle ?? 'title'"
            :item-value="filter.itemValue ?? 'value'"
            density="compact"
            variant="outlined"
            hide-details
            clearable
          />

          <v-combobox
            v-else-if="filter.type === 'icon'"
            v-model="objeto[filter.field]"
            :label="filter.label"
            :items="filter.items ?? []"
            :item-title="filter.itemTitle ?? 'title'"
            :item-value="filter.itemValue ?? 'value'"
            density="compact"
            variant="outlined"
            hide-details
            clearable
          />

          <template v-else-if="filter.type === 'hidden'" />

          <v-text-field
            v-else
            v-model="objeto[filter.field]"
            :label="filter.label"
            density="compact"
            variant="outlined"
            hide-details
            maxlength="200"
            clearable
            @keyup.enter="applyFilters"
          />
        </v-col>
      </v-row>

      <v-row>
        <v-btn
          color="primary"
          prepend-icon="mdi-magnify"
          aria-label="Buscar"
          @click="applyFilters"
        />
      </v-row>
    </v-card>

    <v-card class="px-2 mt-3" elevation="0">
      <v-data-table-server
        v-model:items-per-page="itemsPerPages"
        :headers="headers"
        :items="serverItems"
        :items-length="totalItems"
        :loading="loading"
        :sort-by="order"
        :item-value="props.idField"
        no-data-text="No hay datos registrados"
        class="data-table"
        @update:options="loadItems"
      >
        <template
          v-for="header in headers.filter(
            (head) =>
              head.crearColumna === true &&
              !['actions', 'acciones'].includes(head.key),
          )"
          :key="header.key"
          #[`item.${header.key}`]="{ item }"
        >
          <slot :name="header.key" :item="item" />
        </template>

        <template v-if="props.acciones" #item.actions="{ item }">
          <v-row justify="space-evenly" class="table-actions">
            <v-btn
              icon="mdi-pencil"
              size="small"
              color="primary"
              variant="flat"
              class="table-action-btn"
              :aria-label="`Editar ${titulo}`"
              @click="editItem(item)"
            >
              <v-icon icon="mdi-pencil" color="white" />

              <v-tooltip activator="parent" location="bottom">
                Editar registro
              </v-tooltip>
            </v-btn>

            <v-btn
              icon="mdi-delete"
              size="small"
              color="error"
              variant="flat"
              class="table-action-btn"
              :aria-label="`Desactivar ${titulo}`"
              @click="deleteItem(item)"
            >
              <v-icon icon="mdi-delete" color="white" />

              <v-tooltip activator="parent" location="bottom">
                Eliminar registro
              </v-tooltip>
            </v-btn>
          </v-row>
        </template>
      </v-data-table-server>
    </v-card>
  </v-sheet>

  <v-card v-if="props.sourceItems !== undefined" class="px-2" elevation="0">
    <v-card-title
      v-if="
        props.inputs.length || props.filters.length || $slots['source-toolbar']
      "
      class="d-flex align-center flex-wrap ga-2"
    >
      <v-btn
        v-if="props.inputs.length"
        :disabled="!props.canCreate"
        color="primary"
        class="table-create-btn text-none font-weight-regular"
        variant="tonal"
        @click="crearItem"
      >
        <template #prepend>
          <v-icon icon="mdi-plus" />
        </template>

        AGREGAR
      </v-btn>

      <slot name="source-toolbar" />

      <v-spacer v-if="props.filters.length" />

      <v-card
        v-if="props.filters.length"
        color="transparent"
        elevation="0"
        class="d-flex flex-shrink-0 pa-1"
      >
        <v-btn
          icon="mdi-filter"
          variant="flat"
          color="white"
          aria-label="Mostrar filtros"
          :aria-expanded="showFilters"
          class="table-toolbar-btn mx-2"
          @click="showFilters = !showFilters"
        >
          <v-icon icon="mdi-filter" color="grey-darken-4" />

          <v-tooltip activator="parent" location="bottom">
            Búsqueda/filtros
          </v-tooltip>
        </v-btn>

        <v-btn
          icon="mdi-reload"
          variant="flat"
          color="white"
          aria-label="Recargar tabla"
          class="table-toolbar-btn mx-2"
          @click="reloadTabla"
        >
          <v-icon icon="mdi-reload" color="grey-darken-4" />

          <v-tooltip activator="parent" location="bottom">
            Recargar tabla
          </v-tooltip>
        </v-btn>
      </v-card>
    </v-card-title>

    <v-card
      v-if="props.filters.length && showFilters"
      color="secondary"
      class="pa-3 mb-3"
    >
      <v-row align="center" style="height: auto">
        <v-col
          v-for="filter in props.filters"
          :key="filter.field"
          cols="12"
          sm="6"
          md="4"
          lg="3"
          :class="{ 'd-none': filter.type === 'hidden' }"
        >
          <v-text-field
            v-if="filter.type === 'text'"
            v-model="objeto[filter.field]"
            :label="filter.label"
            density="compact"
            variant="outlined"
            hide-details
            maxlength="200"
            clearable
            @keyup.enter="applyFilters"
          />

          <v-text-field
            v-else-if="filter.type === 'number'"
            v-model.number="objeto[filter.field]"
            :label="filter.label"
            type="number"
            density="compact"
            variant="outlined"
            hide-details
            @keyup.enter="applyFilters"
          />

          <v-text-field
            v-else-if="filter.type === 'date'"
            v-model="objeto[filter.field]"
            :label="filter.label"
            type="date"
            density="compact"
            variant="outlined"
            hide-details
            @keyup.enter="applyFilters"
          />

          <v-text-field
            v-else-if="filter.type === 'time'"
            v-model="objeto[filter.field]"
            :label="filter.label"
            type="time"
            density="compact"
            variant="outlined"
            hide-details
            @keyup.enter="applyFilters"
          />

          <v-textarea
            v-else-if="filter.type === 'textarea'"
            v-model="objeto[filter.field]"
            :label="filter.label"
            density="compact"
            variant="outlined"
            hide-details
            rows="1"
            auto-grow
            max-rows="6"
          />

          <v-checkbox
            v-else-if="filter.type === 'boolean'"
            v-model="objeto[filter.field]"
            :label="filter.label"
            density="compact"
            hide-details
          />

          <GeneroSelect
            v-else-if="filter.type === 'genero'"
            v-model="objeto[filter.field] as number | null"
            :label="filter.label"
          />
          <ExtensionSelect
            v-else-if="filter.type === 'extension'"
            v-model="objeto[filter.field] as number | null"
            :label="filter.label"
          />
          <ReferenciaInstitucionalSelect
            v-else-if="filter.type === 'referencia_institucional'"
            v-model="objeto[filter.field] as string | null"
            :label="filter.label"
          />
          <EstadoCasoSelect
            v-else-if="filter.type === 'estado_caso'"
            v-model="objeto[filter.field] as number | null"
            :label="filter.label"
          />
          <PracticanteSelect
            v-else-if="filter.type === 'practicante'"
            v-model="objeto[filter.field] as string | null"
            :label="filter.label"
            :id-servicio="filter.idServicio"
          />
          <PacienteSelect
            v-else-if="filter.type === 'paciente'"
            v-model="objeto[filter.field] as string | null"
            :label="filter.label"
            :id-servicio="filter.idServicio"
          />
          <ParametroSelect
            v-else-if="filter.type === 'parametro'"
            v-model="objeto[filter.field]"
            :tipo="filter.parametro ?? ''"
            :label="filter.label"
            :item-value="filter.itemValue === 'valor' ? 'valor' : 'id'"
            density="compact"
            variant="outlined"
            hide-details
          />

          <RolSelect
            v-else-if="filter.type === 'rol'"
            v-model="objeto[filter.field]"
            :label="filter.label"
            density="compact"
            variant="outlined"
            hide-details
          />

          <RecursoSelect
            v-else-if="filter.type === 'recurso'"
            v-model="objeto[filter.field]"
            :label="filter.label"
            density="compact"
            variant="outlined"
            hide-details
          />
          <ServicioSelect
            v-else-if="filter.type === 'servicio'"
            v-model="objeto[filter.field]"
            :label="filter.label"
            density="compact"
            variant="outlined"
            hide-details
          />

          <v-select
            v-else-if="['select', 'entidad', 'estado'].includes(filter.type)"
            v-model="objeto[filter.field]"
            :label="filter.label"
            :items="filter.items ?? []"
            :item-title="filter.itemTitle ?? 'title'"
            :item-value="filter.itemValue ?? 'value'"
            density="compact"
            variant="outlined"
            hide-details
            clearable
          />

          <v-combobox
            v-else-if="filter.type === 'icon'"
            v-model="objeto[filter.field]"
            :label="filter.label"
            :items="filter.items ?? []"
            :item-title="filter.itemTitle ?? 'title'"
            :item-value="filter.itemValue ?? 'value'"
            density="compact"
            variant="outlined"
            hide-details
            clearable
          />

          <template v-else-if="filter.type === 'hidden'" />

          <v-text-field
            v-else
            v-model="objeto[filter.field]"
            :label="filter.label"
            density="compact"
            variant="outlined"
            hide-details
            maxlength="200"
            clearable
            @keyup.enter="applyFilters"
          />
        </v-col>
      </v-row>

      <v-row>
        <v-btn
          color="primary"
          prepend-icon="mdi-magnify"
          aria-label="Buscar"
          @click="applyFilters"
        />
      </v-row>
    </v-card>

    <slot name="source-filters" />

    <v-data-table
      :headers="headers"
      :items="props.sourceItems"
      :loading="props.sourceLoading"
      :group-by="props.groupBy"
      :item-value="props.idField"
      no-data-text="No hay datos registrados"
      class="data-table"
    >
      <template
        v-for="header in headers.filter(
          (head) =>
            head.crearColumna === true &&
            !['actions', 'acciones'].includes(head.key),
        )"
        :key="header.key"
        #[`item.${header.key}`]="{ item }"
      >
        <slot :name="header.key" :item="item" />
      </template>

      <template
        v-for="key in ['actions', 'acciones']"
        :key="key"
        #[`item.${key}`]="{ item }"
      >
        <slot v-if="$slots[key]" :name="key" :item="item" />

        <v-row
          v-else-if="props.acciones"
          justify="space-evenly"
          class="table-actions"
        >
          <v-btn
            icon="mdi-pencil"
            size="small"
            color="primary"
            variant="flat"
            class="table-action-btn"
            :aria-label="`Editar ${titulo}`"
            @click="editItem(item)"
          >
            <v-icon icon="mdi-pencil" color="white" />

            <v-tooltip activator="parent" location="bottom">
              Editar registro
            </v-tooltip>
          </v-btn>

          <v-btn
            icon="mdi-delete"
            size="small"
            color="error"
            variant="flat"
            class="table-action-btn"
            :aria-label="`Desactivar ${titulo}`"
            @click="deleteItem(item)"
          >
            <v-icon icon="mdi-delete" color="white" />

            <v-tooltip activator="parent" location="bottom">
              Eliminar registro
            </v-tooltip>
          </v-btn>
        </v-row>
      </template>

      <template v-if="props.groupBy?.length" #group-header="group">
        <slot name="group-header" v-bind="group" />
      </template>
    </v-data-table>
  </v-card>
</template>

<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import DialogCrearEditar from "./DialogCrearEditar.vue";
import ParametroSelect from "./Fields/ParametroSelect.vue";
import GeneroSelect from "./Fields/GeneroSelect.vue";
import ExtensionSelect from "./Fields/ExtensionSelect.vue";
import ReferenciaInstitucionalSelect from "./Fields/ReferenciaInstitucionalSelect.vue";
import EstadoCasoSelect from "./Fields/EstadoCasoSelect.vue";
import PracticanteSelect from "./Fields/PracticanteSelect.vue";
import PacienteSelect from "./Fields/PacienteSelect.vue";
import RolSelect from "./Fields/RolSelect.vue";
import RecursoSelect from "./Fields/RecursoSelect.vue";
import ServicioSelect from "./Fields/ServicioSelect.vue";

import type {
  CrudRecord,
  CrudTableProps,
  TableSort,
} from "~/interfaces/app/common";

const dialog = ref(false);
const edittItem = ref<CrudRecord>({});
const { $service } = useNuxtApp();

function crearItem() {
  edittItem.value = { ...props.createData };
  dialog.value = true;
}

function editItem(item: CrudRecord) {
  edittItem.value = item;
  dialog.value = true;
}

async function deleteItem(item: CrudRecord) {
  try {
    await $service.graphql({
      query: $querys.mutationDeleteWithVariable(
        mutation.value,
        props.idType,
        props.deleteRows,
        props.deleteIdField,
      ),
      variables: {
        [props.deleteIdField]: item[props.deleteIdField],
      },
    });

    await reloadTabla();
    useMessage().success(`${titulo.value} eliminado con éxito`);
  } catch (error) {
    useMessage().error(
      error instanceof Error
        ? error.message
        : "No se pudo eliminar el registro",
    );
  }
}

async function reloadTabla() {
  if (props.sourceItems !== undefined) {
    await props.sourceReload?.();
    return;
  }

  await loadItems({
    page: 1,
    itemsPerPage: itemsPerPages.value,
    sortBy: order.value,
  });
}

const props = withDefaults(defineProps<CrudTableProps>(), {
  titulo: "",
  mutation: "",
  headers: () => [],
  getrows: "",
  filters: () => [],
  order: () => ({ key: "id", order: "asc" }),
  orderType: "",
  idType: "String",
  deleteRows: "id",
  idField: "id",
  deleteIdField: "id",
  mutationRows: "id",
  fixedSearch: () => ({}),
  createData: () => ({}),
  inputs: () => [],
  acciones: true,
  canCreate: true,
});

const showFilters = ref(true);
const objeto = reactive<
  Record<string, string | number | boolean | null | undefined>
>({});
const appliedFilters = ref<CrudRecord>({});

const emit = defineEmits<{
  "filters-change": [filters: CrudRecord];
}>();

watch(
  () => props.filters,
  (filters) => {
    for (const filter of filters) {
      if (filter.field in objeto) continue;

      if (filter.type === "number") {
        objeto[filter.field] = undefined;
      } else if (filter.type === "text") {
        objeto[filter.field] = "";
      } else {
        objeto[filter.field] = null;
      }
    }
  },
  { immediate: true },
);

function getFilters(): CrudRecord {
  const result: CrudRecord = {};

  for (const filter of props.filters) {
    const value = objeto[filter.field];

    if (value === null || value === undefined || value === "") continue;

    const parts = filter.field.split(".");

    if (
      parts.some((part) =>
        ["__proto__", "constructor", "prototype"].includes(part),
      )
    ) {
      continue;
    }

    let target = result;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        target[part] = value;
      } else {
        target[part] ??= {};
        target = target[part] as CrudRecord;
      }
    });
  }

  return result;
}

function applyFilters(): void {
  appliedFilters.value = getFilters();
  emit("filters-change", appliedFilters.value);
  void reloadTabla();
}

const order = ref<TableSort[]>([props.order]);

const titulo = computed(() =>
  props.titulo === "" ? props.tabla : props.titulo,
);

const tituloFormateado = computed(() => (titulo.value || "").toUpperCase());

const mutation = computed(() =>
  props.mutation === "" ? props.tabla : props.mutation,
);

const itemsPerPages = ref(10);
const loading = ref(true);
const totalItems = ref(0);
const serverItems = ref<Record<string, unknown>[]>([]);
let loadRequestId = 0;

function reloadFiltros(): void {
  for (const filter of props.filters) {
    if (filter.type === "text") {
      objeto[filter.field] = "";
    } else if (filter.type === "number") {
      objeto[filter.field] = undefined;
    } else {
      objeto[filter.field] = null;
    }
  }

  applyFilters();
}

async function loadItems(options: {
  itemsPerPage: number;
  page: number;
  sortBy: TableSort[];
}) {
  const { itemsPerPage, page, sortBy } = options;

  const sort: TableSort = sortBy[0] ??
    order.value[0] ?? {
      key: "id",
      order: "asc",
    };

  const ordenar = {
    columna: sort.key,
    order: sort.order,
  };

  itemsPerPages.value = itemsPerPage;
  order.value = [sort];

  const requestId = ++loadRequestId;
  loading.value = true;

  try {
    await obtenerDatos(
      itemsPerPage,
      page,
      appliedFilters.value,
      ordenar,
      requestId,
    );
  } finally {
    if (requestId === loadRequestId) {
      loading.value = false;
    }
  }
}

async function obtenerDatos(
  limit: number,
  pagina: number,
  filtros: Record<string, unknown>,
  orden: { columna: string; order: string },
  requestId: number,
) {
  try {
    const result = await $service.graphql<
      Record<string, { rows: Record<string, unknown>[]; count: number }>
    >({
      query: $querys.queryWithVar(
        props.tabla,
        props.getrows,
        props.orderType || undefined,
      ),
      variables: {
        limit,
        pagina,
        search: {
          ...filtros,
          ...props.fixedSearch,
        },
        ...(props.orderType === "none" ? {} : { order: orden }),
      },
    });

    if (requestId !== loadRequestId) return;

    const pageData = result[$util.formacionPlural(props.tabla)];

    if (!pageData) {
      throw new Error(`La respuesta no contiene la lista de ${titulo.value}`);
    }

    serverItems.value = pageData.rows;
    totalItems.value = pageData.count;
  } catch (error) {
    if (requestId !== loadRequestId) return;

    useMessage().error(
      error instanceof Error
        ? error.message
        : "No se pudieron cargar los datos",
    );
  }
}

onMounted(() => {
  if (props.sourceItems === undefined) {
    void reloadTabla();
  }
});

onBeforeUnmount(() => {
  loadRequestId++;
});

defineExpose({
  reloadTabla,
  reloadFiltros,
  objeto,
  getFilters,
});
</script>

<style scoped>
.table-create-btn {
  height: 32px !important;
  min-height: 32px !important;
}

.table-toolbar-btn {
  width: 36px;
  height: 36px;
}

.table-action-btn {
  width: 32px;
  height: 32px;
}

.table-action-btn :deep(.v-icon) {
  color: #ffffff !important;
}

.table-toolbar-btn :deep(.v-icon) {
  color: #212121 !important;
}
</style>
