<template>
  <v-container fluid>
    <div class="mb-5">
      <div class="text-overline text-primary">SEGURIDAD</div>
      <h1 class="text-h4">Roles y permisos</h1>
    </div>
    <v-alert v-if="!canManage" type="warning" variant="tonal">
      Solo administración puede gestionar roles, recursos y sus relaciones.
    </v-alert>
    <template v-else>
      <v-alert v-if="error" type="error" variant="tonal" class="mb-4">
        {{ error }}
      </v-alert>
      <v-tabs v-model="tab" class="mb-4">
        <v-tab value="roles">Roles</v-tab>
        <v-tab value="recursos">Recursos</v-tab>
        <v-tab value="relaciones">Rol y recurso</v-tab>
      </v-tabs>

      <v-window v-model="tab">
        <v-window-item value="roles">
          <v-card elevation="0">
            <v-card-title>Roles</v-card-title>
            <CommonCrudTable
              tabla="rol"
              titulo="Roles"
              :headers="roleHeaders"
              getrows=""
              :filters="[]"
              :inputs="roleInputs"
              :create-data="{ descripcion: '', icono: 'mdi-account', id_sec: 1 }"
              :source-items="filteredRoles"
              :source-loading="loading"
              :source-reload="loadAll"
              :on-save="saveRoleFromTable"
            >
              <template #source-toolbar>
                <v-spacer />
                <v-btn icon variant="text" aria-label="Recargar roles" :loading="loading" @click="loadAll">
                  <v-tooltip activator="parent" location="bottom">Recargar roles</v-tooltip>
                  <v-icon>mdi-reload</v-icon>
                </v-btn>
                <v-btn icon variant="text" aria-label="Mostrar filtros" @click="showFilters = !showFilters">
                  <v-tooltip activator="parent" location="bottom">Búsqueda/filtros</v-tooltip>
                  <v-icon>mdi-filter</v-icon>
                </v-btn>
              </template>
              <template #source-filters>
                <v-card v-if="showFilters" color="secondary" class="pa-3 mb-3">
                  <v-row align="center">
                    <v-col cols="12" sm="8" md="6">
                      <v-text-field
                        v-model="search"
                        label="Buscar rol"
                        hide-details
                        density="compact"
                        variant="outlined"
                        clearable
                        @keyup.enter="applySearch"
                        @click:clear="clearSearch"
                      />
                    </v-col>
                    <v-col cols="auto">
                      <v-btn color="primary" prepend-icon="mdi-magnify" @click="applySearch">
                        Buscar
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-card>
              </template>
              <template #icono="{ item }">
                <div class="d-flex align-center ga-2">
                  <v-icon>{{ item.icono }}</v-icon>
                  <span>{{ item.icono }}</span>
                </div>
              </template>
              <template #id_estado="{ item }">
                <v-chip :color="item.id_estado === 1 ? 'success' : 'grey'" size="small">
                  {{ item.id_estado === 1 ? "Activo" : "Inactivo" }}
                </v-chip>
              </template>
            </CommonCrudTable>
          </v-card>
        </v-window-item>

        <v-window-item value="recursos">
          <v-card elevation="0">
            <v-card-title>Recursos y menús</v-card-title>
            <CommonCrudTable
              tabla="recurso"
              titulo="Recursos"
              :headers="resourceHeaders"
              getrows=""
              :filters="[]"
              :inputs="resourceInputs"
              :create-data="{ title: '', icon: 'mdi-view-dashboard', nivel: 1, path: '', id_recurso_padre: null, is_menu: true }"
              :source-items="filteredResources"
              :source-loading="loading"
              :source-reload="loadAll"
              :on-save="saveResourceFromTable"
            >
              <template #source-toolbar>
                <v-spacer />
                <v-btn icon variant="text" aria-label="Recargar recursos" :loading="loading" @click="loadAll">
                  <v-tooltip activator="parent" location="bottom">Recargar recursos</v-tooltip>
                  <v-icon>mdi-reload</v-icon>
                </v-btn>
                <v-btn icon variant="text" aria-label="Mostrar filtros" @click="showFilters = !showFilters">
                  <v-tooltip activator="parent" location="bottom">Búsqueda/filtros</v-tooltip>
                  <v-icon>mdi-filter</v-icon>
                </v-btn>
              </template>
              <template #source-filters>
                <v-card v-if="showFilters" color="secondary" class="pa-3 mb-3">
                  <v-row align="center">
                    <v-col cols="12" sm="8" md="6">
                      <v-text-field
                        v-model="search"
                        label="Buscar recurso"
                        hide-details
                        density="compact"
                        variant="outlined"
                        clearable
                        @keyup.enter="applySearch"
                        @click:clear="clearSearch"
                      />
                    </v-col>
                    <v-col cols="auto">
                      <v-btn color="primary" prepend-icon="mdi-magnify" @click="applySearch">
                        Buscar
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-card>
              </template>
              <template #is_menu="{ item }">
                {{ item.is_menu ? "Sí" : "No" }}
              </template>
              <template #icon="{ item }">
                <v-icon class="mr-2">{{ item.icon }}</v-icon>{{ item.icon }}
              </template>
              <template #id_estado="{ item }">
                <v-chip :color="item.id_estado === 1 ? 'success' : 'grey'" size="small">
                  {{ item.id_estado === 1 ? "Activo" : "Inactivo" }}
                </v-chip>
              </template>
            </CommonCrudTable>
          </v-card>
        </v-window-item>

        <v-window-item value="relaciones">
          <v-card elevation="0">
            <v-card-title>Recursos asignados por rol</v-card-title>
            <CommonCrudTable
              tabla="rol_recurso"
              titulo="Recursos asignados"
              :headers="linkHeaders"
              getrows=""
              :filters="[]"
              :inputs="linkInputs"
              :create-data="{ id_rol: '', id_recurso: '' }"
              mutation="rolRecurso"
              :source-items="filteredLinks"
              :source-loading="loading"
              :source-reload="loadAll"
              :on-save="saveLinkFromTable"
            >
              <template #source-toolbar>
                <v-spacer />
                <v-btn icon variant="text" aria-label="Recargar relaciones" :loading="loading" @click="loadAll">
                  <v-tooltip activator="parent" location="bottom">Recargar relaciones</v-tooltip>
                  <v-icon>mdi-reload</v-icon>
                </v-btn>
                <v-btn icon variant="text" aria-label="Mostrar filtros" @click="showFilters = !showFilters">
                  <v-tooltip activator="parent" location="bottom">Búsqueda/filtros</v-tooltip>
                  <v-icon>mdi-filter</v-icon>
                </v-btn>
              </template>
              <template #source-filters>
                <v-card v-if="showFilters" color="secondary" class="pa-3 mb-3">
                  <v-row align="center">
                    <v-col cols="12" sm="8" md="6">
                      <v-text-field
                        v-model="search"
                        label="Buscar rol o recurso"
                        hide-details
                        density="compact"
                        variant="outlined"
                        clearable
                        @keyup.enter="applySearch"
                        @click:clear="clearSearch"
                      />
                    </v-col>
                    <v-col cols="auto">
                      <v-btn color="primary" prepend-icon="mdi-magnify" @click="applySearch">
                        Buscar
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-card>
              </template>
              <template #id_estado="{ item }">
                <v-chip :color="item.id_estado === 1 ? 'success' : 'grey'" size="small">
                  {{ item.id_estado === 1 ? "Activo" : "Inactivo" }}
                </v-chip>
              </template>
            </CommonCrudTable>
          </v-card>
        </v-window-item>
      </v-window>
    </template>

  </v-container>
</template>

<script setup lang="ts">
import type { CrudRecord, Inputs } from "~/interfaces/app/common";
import { mdiIconNames } from "~/utils/mdi-icons";
import { sessionHasRole, useUserSession } from "~/utils/session";

interface Role extends CrudRecord {
  id: string;
  descripcion: string;
  icono: string;
  id_sec: number;
  id_estado: number;
}
interface Resource extends CrudRecord {
  id: string;
  title: string;
  icon: string;
  nivel: number;
  path: string | null;
  id_estado: number;
  id_recurso_padre: string | null;
  is_menu: boolean;
}
interface RoleResource extends CrudRecord {
  id: string;
  id_rol: string;
  id_recurso: string;
  id_estado: number;
  rol: { descripcion: string };
  recurso: { title: string };
}
const session = useUserSession();
const { $service } = useNuxtApp();
const canManage = computed(() => sessionHasRole(session.roles.value, "administrador"));
const tab = ref("roles");
const roles = ref<Role[]>([]);
const resources = ref<Resource[]>([]);
const links = ref<RoleResource[]>([]);
const loading = ref(false);
const error = ref("");
const search = ref("");
const showFilters = ref(true);
const appliedSearch = ref("");
const resourceIcons = mdiIconNames;
const resourceIconOptions = resourceIcons.map((name) => ({
  title: name,
  value: name,
}));
const roleHeaders = [
  { title: "Nombre", key: "descripcion" },
  { title: "Icono", key: "icono", crearColumna: true },
  { title: "Código", key: "id_sec" },
  { title: "Estado", key: "id_estado", crearColumna: true },
  { title: "Acciones", key: "actions", sortable: false },
];
const resourceHeaders = [
  { title: "Nombre", key: "title" },
  { title: "Ruta", key: "path" },
  { title: "Icono", key: "icon", crearColumna: true },
  { title: "Menú", key: "is_menu", crearColumna: true },
  { title: "Estado", key: "id_estado", crearColumna: true },
  { title: "Acciones", key: "actions", sortable: false },
];
const linkHeaders = [
  { title: "Rol", key: "rol.descripcion" },
  { title: "Recurso", key: "recurso.title" },
  { title: "Estado", key: "id_estado", crearColumna: true },
  { title: "Acciones", key: "actions", sortable: false },
];
const roleInputs: Inputs[] = [
  { field: "descripcion", descripcion: "Nombre", type: "text", required: true },
  {
    field: "icono",
    descripcion: "Icono",
    type: "icon",
    required: true,
    items: resourceIconOptions,
    itemTitle: "title",
    itemValue: "value",
  },
  { field: "id_sec", descripcion: "Código numérico", type: "number", required: true },
];
const resourceInputs = computed<Inputs[]>(() => [
  { field: "title", descripcion: "Nombre del recurso", type: "text", required: true },
  {
    field: "icon",
    descripcion: "Icono",
    type: "icon",
    required: true,
    items: resourceIconOptions,
    itemTitle: "title",
    itemValue: "value",
  },
  { field: "path", descripcion: "Ruta", type: "text" },
  {
    field: "id_recurso_padre",
    descripcion: "Menú padre",
    type: "select",
    items: resources.value
      .filter((resource) => resource.id_estado === 1)
      .map((resource) => ({ title: resource.title, value: resource.id })),
    itemTitle: "title",
    itemValue: "value",
  },
  { field: "nivel", descripcion: "Nivel", type: "number", required: true },
  { field: "is_menu", descripcion: "Mostrar en el menú", type: "boolean" },
]);
const linkInputs = computed<Inputs[]>(() => [
  {
    field: "id_rol",
    descripcion: "Rol",
    type: "select",
    required: true,
    items: roles.value
      .filter((role) => role.id_estado === 1)
      .map((role) => ({ title: role.descripcion, value: role.id })),
    itemTitle: "title",
    itemValue: "value",
  },
  {
    field: "id_recurso",
    descripcion: "Recurso",
    type: "select",
    required: true,
    items: resources.value
      .filter((resource) => resource.id_estado === 1)
      .map((resource) => ({ title: resource.title, value: resource.id })),
    itemTitle: "title",
    itemValue: "value",
  },
]);
const filteredRoles = computed(() => {
  const term = appliedSearch.value.toLocaleLowerCase();
  return term
    ? roles.value.filter((role) =>
        role.descripcion.toLocaleLowerCase().includes(term),
      )
    : roles.value;
});
const filteredResources = computed(() => {
  const term = appliedSearch.value.toLocaleLowerCase();
  return term
    ? resources.value.filter((resource) =>
        `${resource.title} ${resource.path ?? ""} ${resource.icon}`
          .toLocaleLowerCase()
          .includes(term),
      )
    : resources.value;
});
const filteredLinks = computed(() => {
  const term = appliedSearch.value.toLocaleLowerCase();
  return term
    ? links.value.filter((link) =>
        `${link.rol.descripcion} ${link.recurso.title}`
          .toLocaleLowerCase()
          .includes(term),
      )
    : links.value;
});

onMounted(() => {
  if (canManage.value) void loadAll();
});

function applySearch(): void {
  appliedSearch.value = search.value.trim();
}

function clearSearch(): void {
  search.value = "";
  appliedSearch.value = "";
}

async function loadAll() {
  loading.value = true;
  error.value = "";
  try {
    const [roleRows, resourceRows, linkRows] = await Promise.all([
      loadAllPages<Role>("roles", "id descripcion icono id_sec id_estado"),
      loadAllPages<Resource>(
        "recursos",
        "id title icon nivel path id_estado id_recurso_padre is_menu",
      ),
      loadAllPages<RoleResource>(
        "rolRecursos",
        "id id_rol id_recurso id_estado rol { descripcion } recurso { title }",
      ),
    ]);
    roles.value = roleRows;
    resources.value = resourceRows;
    links.value = linkRows;
  } catch (requestError) {
    error.value =
      requestError instanceof Error
        ? requestError.message
        : "No se pudieron cargar los permisos.";
  } finally {
    loading.value = false;
  }
}

async function saveRoleFromTable(
  data: CrudRecord,
  isEditing: boolean,
): Promise<void> {
  await saveSecurityRecord(
    data,
    isEditing,
    "CreateRolInput",
    "UpdateRolInput",
    "createRol",
    "createRolInput",
    "updateRol",
    "updateRolInput",
  );
}

async function saveResourceFromTable(
  data: CrudRecord,
  isEditing: boolean,
): Promise<void> {
  await saveSecurityRecord(
    data,
    isEditing,
    "CreateRecursoInput",
    "UpdateRecursoInput",
    "createRecurso",
    "createRecursoInput",
    "updateRecurso",
    "updateRecursoInput",
  );
}

async function saveLinkFromTable(
  data: CrudRecord,
  isEditing: boolean,
): Promise<void> {
  const idRol = data.id_rol;
  const idRecurso = data.id_recurso;
  if (typeof idRol !== "string" || typeof idRecurso !== "string") {
    throw new Error("Seleccione un rol y un recurso.");
  }
  const existing = !isEditing
    ? links.value.find(
        (link) => link.id_rol === idRol && link.id_recurso === idRecurso,
      )
    : undefined;
  if (existing?.id_estado === 1) {
    throw new Error("Ese recurso ya está activo para el rol seleccionado.");
  }
  if (existing) {
    await saveSecurityRecord(
      { id: existing.id, id_estado: 1 },
      true,
      "CreateRolRecursoInput",
      "UpdateRolRecursoInput",
      "createRolRecurso",
      "createRolRecursoInput",
      "updateRolRecurso",
      "updateRolRecursoInput",
    );
    return;
  }
  await saveSecurityRecord(
    data,
    isEditing,
    "CreateRolRecursoInput",
    "UpdateRolRecursoInput",
    "createRolRecurso",
    "createRolRecursoInput",
    "updateRolRecurso",
    "updateRolRecursoInput",
  );
}

async function saveSecurityRecord(
  data: CrudRecord,
  isEditing: boolean,
  createInputType: string,
  updateInputType: string,
  createMutation: string,
  createArgument: string,
  updateMutation: string,
  updateArgument: string,
): Promise<void> {
  const mutation = isEditing ? updateMutation : createMutation;
  const argument = isEditing ? updateArgument : createArgument;
  const inputType = isEditing ? updateInputType : createInputType;
  const input = isEditing
    ? data
    : Object.fromEntries(
        Object.entries(data).filter(
          ([key, value]) =>
            key !== "id" &&
            key !== "id_estado" &&
            value !== null &&
            value !== undefined &&
            value !== "",
        ),
      );
  await $service.graphql({
    query: `mutation($input: ${inputType}!) { ${mutation}(${argument}: $input) { id } }`,
    variables: { input },
  });
}

async function loadAllPages<T>(field: string, rows: string): Promise<T[]> {
  const queryPage = async (pagina: number) =>
    $service.graphql<Record<string, { rows: T[]; count: number }>>({
      query: `query { ${field}(limit: 100, pagina: ${pagina}) { rows { ${rows} } count } }`,
    });
  const firstPage = await queryPage(1);
  const result = firstPage[field];
  const pages = Math.ceil(result.count / 100);
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
      queryPage(index + 2),
    ),
  );
  return [
    ...result.rows,
    ...remaining.flatMap((page) => page[field].rows),
  ];
}
</script>
