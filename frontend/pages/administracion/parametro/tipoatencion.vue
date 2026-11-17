<template>
  <v-container fluid class="tipo-atencion-page">
    <v-sheet color="transparent" class="mx-4 mt-4">
      <span>TIPOS DE ATENCIÓN</span>

      <v-card-title
        class="d-flex justify-space-between align-center flex-wrap ga-2"
      >
        <v-card-actions>
          <v-btn
            color="primary"
            variant="tonal"
            class="btn-agregar"
            @click="nuevo"
          >
            <template #prepend>
              <v-icon size="18">mdi-plus</v-icon>
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
            icon
            variant="flat"
            color="white"
            class="mx-2"
            @click="showFilters = !showFilters"
          >
            <v-icon icon="mdi-filter" color="grey-darken-4" />

            <v-tooltip activator="parent" location="bottom">
              Búsqueda/filtros
            </v-tooltip>
          </v-btn>

          <v-btn
            icon
            variant="flat"
            color="white"
            class="mx-2"
            :loading="loading"
            @click="cargar"
          >
            <v-icon icon="mdi-reload" color="grey-darken-4" />

            <v-tooltip activator="parent" location="bottom">
              Recargar tabla
            </v-tooltip>
          </v-btn>
        </v-card>
      </v-card-title>
    </v-sheet>

    <v-card v-if="showFilters" color="secondary" class="pa-3 mb-3 mx-4">
      <v-text-field
        v-model="search"
        label="Buscar tipo de atención"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        hide-details
        clearable
      />
    </v-card>

    <v-card class="mx-4 px-2" elevation="0">
      <v-data-table
        :headers="headers"
        :items="filteredItems"
        :loading="loading"
        class="tabla-tipo-atencion"
        no-data-text="No existen tipos de atención registrados"
      >
        <template #item.id_estado="{ item }">
          <v-chip
            size="small"
            :color="item.id_estado === 1 ? 'success' : 'grey'"
          >
            {{ item.id_estado === 1 ? "Activo" : "Inactivo" }}
          </v-chip>
        </template>

        <template #item.actions="{ item }">
          <div class="d-flex justify-center ga-2">
            <v-btn
              icon
              size="small"
              color="primary"
              variant="flat"
              class="table-action-btn"
              @click="editar(item)"
            >
              <v-icon color="white"> mdi-pencil </v-icon>

              <v-tooltip activator="parent" location="bottom">
                Editar
              </v-tooltip>
            </v-btn>

            <v-btn
              icon
              size="small"
              color="error"
              variant="flat"
              class="table-action-btn"
              @click="eliminarSeleccionado = item"
            >
              <v-icon color="white"> mdi-delete </v-icon>

              <v-tooltip activator="parent" location="bottom">
                Eliminar
              </v-tooltip>
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>
          {{ form.id ? "Editar tipo de atención" : "Nuevo tipo de atención" }}
        </v-card-title>

        <v-card-text>
          <v-text-field
            v-model="form.valor"
            label="Tipo de atención"
            maxlength="200"
          />

          <v-select
            v-if="form.id"
            v-model="form.id_estado"
            label="Estado"
            :items="estados"
          />

          <v-alert v-if="errorForm" class="mt-3" type="error" variant="tonal">
            {{ errorForm }}
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer />

          <v-btn variant="text" @click="dialog = false"> Cancelar </v-btn>

          <v-btn color="primary" :loading="saving" @click="guardar">
            Guardar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      :model-value="Boolean(eliminarSeleccionado)"
      max-width="400"
      @update:model-value="!$event && (eliminarSeleccionado = null)"
    >
      <v-card>
        <v-card-title> Eliminar tipo de atención </v-card-title>

        <v-card-text>
          ¿Desea eliminar
          <strong>{{ eliminarSeleccionado?.valor }}</strong
          >?
        </v-card-text>

        <v-card-actions>
          <v-spacer />

          <v-btn variant="text" @click="eliminarSeleccionado = null">
            Cancelar
          </v-btn>

          <v-btn color="error" :loading="saving" @click="eliminar">
            Eliminar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
interface TipoAtencion {
  id: number;
  valor: string;
  tipo: string;
  id_estado: number;
}

const { $service } = useNuxtApp();

const loading = ref(false);
const saving = ref(false);

const dialog = ref(false);
const search = ref("");
const showFilters = ref(true);

const errorForm = ref("");

const items = ref<TipoAtencion[]>([]);
const eliminarSeleccionado = ref<TipoAtencion | null>(null);

const estados = [
  { title: "Activo", value: 1 },
  { title: "Inactivo", value: 2 },
];

const form = reactive({
  id: null as number | null,
  valor: "",
  id_estado: 1,
});

const headers = [
  {
    title: "Tipo de atención",
    key: "valor",
  },
  {
    title: "Estado",
    key: "id_estado",
  },
  {
    title: "Acciones",
    key: "actions",
    sortable: false,
  },
];

const filteredItems = computed(() => {
  const texto = search.value.trim().toLowerCase();

  if (!texto) return items.value;

  return items.value.filter((item) => item.valor.toLowerCase().includes(texto));
});

onMounted(cargar);

async function cargar() {
  loading.value = true;

  try {
    const result = await $service.graphql<{
      parametrosByTipo: TipoAtencion[];
    }>({
      query: `
        query {
          parametrosByTipo(tipo:"tipo_atencion"){
            id
            valor
            tipo
            id_estado
          }
        }
      `,
    });

    items.value = result.parametrosByTipo.filter(item => [1, 2].includes(item.id_estado));
  } finally {
    loading.value = false;
  }
}

function nuevo() {
  form.id = null;
  form.valor = "";
  form.id_estado = 1;
  errorForm.value = "";
  dialog.value = true;
}

function editar(item: TipoAtencion) {
  form.id = item.id;
  form.valor = item.valor;
  form.id_estado = item.id_estado;
  errorForm.value = "";
  dialog.value = true;
}

async function guardar() {
  if (!form.valor.trim()) {
    errorForm.value = "Ingrese un tipo de atención";
    return;
  }

  saving.value = true;

  try {
    if (form.id === null) {
      await $service.graphql({
        query: `
          mutation($input: CreateParametroInput!){
            createParametro(
              createParametroInput:$input
            ){
              id
            }
          }
        `,
        variables: {
          input: {
            tipo: "tipo_atencion",
            valor: form.valor,
          },
        },
      });
    } else {
      await $service.graphql({
        query: `
          mutation($input: UpdateParametroInput!){
            updateParametro(
              updateParametroInput:$input
            ){
              id
            }
          }
        `,
        variables: {
          input: {
            id: form.id,
            tipo: "tipo_atencion",
            valor: form.valor,
            id_estado: form.id_estado,
          },
        },
      });
    }

    dialog.value = false;
    await cargar();
  } finally {
    saving.value = false;
  }
}

async function eliminar() {
  if (!eliminarSeleccionado.value) return;

  saving.value = true;

  try {
    await $service.graphql({
      query: `
        mutation($id:Int!){
          removeParametro(id:$id){
            id
          }
        }
      `,
      variables: {
        id: eliminarSeleccionado.value.id,
      },
    });

    eliminarSeleccionado.value = null;

    await cargar();
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.tipo-atencion-page {
  min-width: 0;
}
.btn-agregar {
  height: 32px !important;
  min-height: 32px !important;
  font-weight: 400;
  text-transform: none;
}

.tabla-tipo-atencion :deep(.v-data-table-header) {
  background-color: rgb(var(--v-theme-primary));
}

.tabla-tipo-atencion :deep(thead th) {
  background-color: rgb(var(--v-theme-secondary)) !important;
  color: rgb(0, 0, 0) !important;
}
</style>
