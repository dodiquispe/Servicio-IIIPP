<template>
  <v-container fluid>
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-5">
      <div>
        <div class="text-overline text-primary">SEGURIDAD</div>
        <h1 class="text-h3">Cuentas dadas de baja</h1>
      </div>
    </div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{
      error
    }}</v-alert>

    <CommonCrudTable
      tabla="cuentasBaja"
      titulo="Cuentas dadas de baja"
      :headers="headers"
      getrows=""
      :filters="accountFilters"
      :inputs="[]"
      :source-items="accounts"
      :source-loading="loading"
      :source-reload="load"
      @filters-change="appliedFilters = $event"
      :acciones="false"
    >
      <template #persona="{ item }">{{ nameFromRow(item) }}</template>
      <template #roles="{ item }">{{ rolesFromRow(item) }}</template>
      <template #acciones="{ item }">
        <v-btn
          size="small"
          color="primary"
          variant="flat"
          prepend-icon="mdi-account-reactivate"
          @click="openReactivateRow(item)"
        >
          Dar de alta
        </v-btn>
      </template>
    </CommonCrudTable>

    <CommonDialogCrearEditar
      v-model="dialog"
      tabla="cuenta"
      titulo="Dar de alta la cuenta"
      guardar-texto="Dar de alta"
      :datos="{}"
      :inputs="[]"
      :on-save="saveReactivate"
    >
      <template #content>
        <p v-if="selected" class="mb-4">
          Se reactivará {{ fullName(selected) }} con sus datos e historial
          conservados.
        </p>
        <v-select
          v-model="idRol"
          :items="roles"
          item-title="descripcion"
          item-value="id"
          label="Nuevo rol"
          :loading="loadingCatalogs"
          required
        />
        <v-select
          v-if="needsService"
          v-model="idServicio"
          :items="services"
          item-title="servicio"
          item-value="id"
          label="Servicio"
          :loading="loadingCatalogs"
          required
        />
        <v-alert v-if="errorDialog" type="error" variant="tonal">{{
          errorDialog
        }}</v-alert>
      </template>
    </CommonDialogCrearEditar>
  </v-container>
</template>

<script setup lang="ts">
import type { Filters, CrudRecord } from "~/interfaces/app/common";

definePageMeta({
  alias: [
    "/administracion/cuentas-inactivas",
    "/administracion/usuarios/cuentasdebaja",
  ],
});

interface Account extends CrudRecord {
  id: string;
  nombre_usuario: string;
  persona: {
    nombres: string;
    primer_apellido: string | null;
    segundo_apellido: string | null;
  };
  usuario_rol: Array<{
    id_estado: number;
    rol: { descripcion: string; id_estado: number };
  }>;
}
interface Role {
  id: string;
  descripcion: string;
  id_estado: number;
}
interface Service {
  id: string;
  servicio: string;
  id_estado: number;
}

const { $service } = useNuxtApp();
const accounts = ref<Account[]>([]);
const appliedFilters = ref<CrudRecord>({});
const accountFilters: Filters[] = [
  { field: "nombre_usuario", label: "Usuario", type: "text" },
  { field: "nombres", label: "Nombres", type: "text" },
  { field: "nro_documento", label: "CI", type: "text" },
];
async function saveReactivate(): Promise<void> {
  if (
    !selected.value ||
    !idRol.value ||
    (needsService.value && !idServicio.value)
  )
    throw new Error("Seleccione el rol y el servicio requerido");
  await reactivate();
  if (errorDialog.value) throw new Error(errorDialog.value);
}
const roles = ref<Role[]>([]);
const services = ref<Service[]>([]);
const loading = ref(false);
const loadingCatalogs = ref(false);
const saving = ref(false);
const error = ref("");
const errorDialog = ref("");
const dialog = ref(false);
const selected = ref<Account | null>(null);
const idRol = ref("");
const idServicio = ref("");
const headers = [
  { title: "Usuario", key: "nombre_usuario" },
  { title: "Nombre", key: "persona", crearColumna: true },
  { title: "Roles anteriores", key: "roles", crearColumna: true },
  { title: "Acciones", key: "acciones", crearColumna: true, sortable: false },
];
const selectedRole = computed(() =>
  roles.value.find((role) => role.id === idRol.value),
);
const needsService = computed(() =>
  /responsable|practicante/i.test(selectedRole.value?.descripcion ?? ""),
);

onMounted(() => {
  void load();
  void loadCatalogs();
});

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const allAccounts: Account[] = [];
    let page = 1;
    let count = 0;
    do {
      const result = await $service.graphql<{
        cuentasDadasDeBajaAdministracion: { rows: Account[]; count: number };
      }>({
        query: `query($page: Int!, $search: UsuarioArgs) { cuentasDadasDeBajaAdministracion(limit: 100, pagina: $page, search: $search) {
        count
        rows { id nombre_usuario persona { nombres primer_apellido segundo_apellido }
          usuario_rol { id_estado rol { descripcion id_estado } }
        }
      } }`,
        variables: { page, search: appliedFilters.value },
      });
      allAccounts.push(...result.cuentasDadasDeBajaAdministracion.rows);
      count = result.cuentasDadasDeBajaAdministracion.count;
      page += 1;
    } while (allAccounts.length < count);
    accounts.value = allAccounts;
  } catch (cause) {
    error.value =
      cause instanceof Error
        ? cause.message
        : "No se pudieron cargar las cuentas dadas de baja.";
  } finally {
    loading.value = false;
  }
}

async function loadCatalogs(): Promise<void> {
  loadingCatalogs.value = true;
  try {
    const [roleResult, serviceResult] = await Promise.all([
      $service.graphql<{ roles: { rows: Role[] } }>({
        query: `query { roles(limit: 100, pagina: 1) { rows { id descripcion id_estado } } }`,
      }),
      $service.graphql<{ servicios: { rows: Service[] } }>({
        query: `query { servicios(limit: 100, pagina: 1) { rows { id servicio id_estado } } }`,
      }),
    ]);
    roles.value = roleResult.roles.rows.filter(
      (role) =>
        role.id_estado === 1 &&
        !/paciente|administrador/i.test(role.descripcion),
    );
    services.value = serviceResult.servicios.rows.filter(
      (service) => service.id_estado === 1,
    );
  } catch (cause) {
    error.value =
      cause instanceof Error
        ? cause.message
        : "No se pudieron cargar los roles y servicios.";
  } finally {
    loadingCatalogs.value = false;
  }
}

function openReactivate(account: Account): void {
  selected.value = account;
  idRol.value = "";
  idServicio.value = "";
  errorDialog.value = "";
  dialog.value = true;
}

async function reactivate(): Promise<void> {
  if (!selected.value || !idRol.value) return;
  saving.value = true;
  errorDialog.value = "";
  try {
    await $service.graphql({
      query: `mutation($input: ReactivateInactiveAccountInput!) { reactivarCuentaDadaDeBaja(input: $input) { id } }`,
      variables: {
        input: {
          id_usuario: selected.value.id,
          id_rol: idRol.value,
          ...(needsService.value ? { id_servicio: idServicio.value } : {}),
        },
      },
    });
    dialog.value = false;
    await load();
  } catch (cause) {
    errorDialog.value =
      cause instanceof Error
        ? cause.message
        : "No se pudo dar de alta la cuenta.";
  } finally {
    saving.value = false;
  }
}

function fullName(account: Account): string {
  return [
    account.persona.nombres,
    account.persona.primer_apellido,
    account.persona.segundo_apellido,
  ]
    .filter(Boolean)
    .join(" ");
}

function roleNames(account: Account): string[] {
  return account.usuario_rol
    .filter(
      (relation) => relation.rol.id_estado === 1 && relation.id_estado !== 3,
    )
    .map((relation) => relation.rol.descripcion);
}

function accountFromRow(row: Record<string, unknown>): Account | null {
  return typeof row.id === "string" &&
    typeof row.nombre_usuario === "string" &&
    typeof row.persona === "object"
    ? (row as unknown as Account)
    : null;
}

function nameFromRow(row: Record<string, unknown>): string {
  const account = accountFromRow(row);
  return account ? fullName(account) : "";
}

function rolesFromRow(row: Record<string, unknown>): string {
  const account = accountFromRow(row);
  return account ? roleNames(account).join(", ") || "Sin rol vigente" : "";
}

function openReactivateRow(row: Record<string, unknown>): void {
  const account = accountFromRow(row);
  if (account) openReactivate(account);
}
</script>
