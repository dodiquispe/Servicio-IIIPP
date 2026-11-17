<template>
  <v-container fluid>
    <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-5">
      <div>
        <div class="text-overline text-primary">SEGURIDAD</div>
        <h1 class="text-h4">Cuentas</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Activa o inactiva el acceso conservando roles, servicios e historial.
        </p>
      </div>
      <v-text-field
        v-model="search"
        label="Buscar cuenta"
        prepend-inner-icon="mdi-magnify"
        density="compact"
        hide-details
        clearable
        style="max-width: 340px"
        @keyup.enter="load"
      />
    </div>

    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>

    <CommonCrudTable
      tabla="cuentas"
      titulo="Cuentas"
      :headers="headers"
      getrows=""
      :filters="[]"
      :inputs="[]"
      :source-items="accounts"
      :source-loading="loading"
      :acciones="false"
    >
      <template #source-toolbar>
        <v-spacer />
        <v-btn variant="outlined" prepend-icon="mdi-refresh" :loading="loading" @click="load">
          Actualizar
        </v-btn>
      </template>
      <template #persona="{ item }">{{ nameFromRow(item) }}</template>
      <template #cargo_servicio="{ item }">{{ cargoFromRow(item) }}</template>
      <template #estado="{ item }">
        <div class="d-flex align-center ga-2">
          <v-switch
            :model-value="activeFromRow(item)"
            :disabled="saving === item.id"
            :loading="saving === item.id"
            color="success"
            density="compact"
            hide-details
            aria-label="Cambiar acceso de la cuenta"
            @update:model-value="setActiveFromRow(item, Boolean($event))"
          />
          <v-chip :color="activeFromRow(item) ? 'success' : 'grey'" size="small" variant="tonal">
            {{ activeFromRow(item) ? "Activa" : "Inactiva" }}
          </v-chip>
        </div>
      </template>
    </CommonCrudTable>
  </v-container>
</template>

<script setup lang="ts">
import type { CrudRecord } from "~/interfaces/app/common";

definePageMeta({});

interface Account extends CrudRecord {
  id: string;
  nombre_usuario: string;
  id_estado: number;
  persona: { nombres: string; primer_apellido: string | null; segundo_apellido: string | null };
  usuario_rol: Array<{ id_estado: number; rol: { descripcion: string; id_estado: number } }>;
  servicio_personal: Array<{ id_estado: number; servicio: { servicio: string }; rol: { descripcion: string } | null }>;
}

const { $service } = useNuxtApp();
const accounts = ref<Account[]>([]);
const search = ref("");
const loading = ref(false);
const saving = ref("");
const error = ref("");
const headers = [
  { title: "Usuario", key: "nombre_usuario" },
  { title: "Nombre", key: "persona", crearColumna: true },
  { title: "Cargo / Servicio", key: "cargo_servicio", crearColumna: true },
  { title: "Estado y acceso", key: "estado", crearColumna: true, sortable: false },
];

onMounted(() => void load());

async function load(): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  error.value = "";
  try {
    const allAccounts: Account[] = [];
    let page = 1;
    let count = 0;
    do {
      const result = await $service.graphql<{
        cuentasAdministracion: { rows: Account[]; count: number };
      }>({
        query: `query($page: Int!, $search: UsuarioArgs) {
        cuentasAdministracion(limit: 100, pagina: $page, search: $search) {
          count rows {
            id nombre_usuario id_estado
            persona { nombres primer_apellido segundo_apellido }
            usuario_rol { id_estado rol { descripcion id_estado } }
            servicio_personal { id_estado servicio { servicio } rol { descripcion } }
          }
        }
      }`,
        variables: { page, search: search.value.trim() ? { busqueda: search.value.trim() } : null },
      });
      allAccounts.push(...result.cuentasAdministracion.rows);
      count = result.cuentasAdministracion.count;
      page += 1;
    } while (allAccounts.length < count);
    accounts.value = allAccounts.filter((account) => account.id_estado === 1 || account.id_estado === 2);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "No se pudieron cargar las cuentas.";
  } finally {
    loading.value = false;
  }
}

async function setActive(account: Account, active: boolean): Promise<void> {
  saving.value = account.id;
  error.value = "";
  try {
    await $service.graphql({
      query: `mutation($id: String!, $active: Boolean!) { cambiarEstadoCuenta(id: $id, active: $active) { id id_estado } }`,
      variables: { id: account.id, active },
    });
    await load();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "No se pudo cambiar el acceso de la cuenta.";
  } finally {
    saving.value = "";
  }
}

function fullName(account: Account): string {
  return [account.persona.nombres, account.persona.primer_apellido, account.persona.segundo_apellido].filter(Boolean).join(" ");
}

function cargoService(account: Account): string {
  const activeRoles = account.usuario_rol.filter((relation) => relation.rol.id_estado === 1 && relation.id_estado !== 3);
  const roleNames = activeRoles.map((relation) => relation.rol.descripcion);
  const assignments = account.servicio_personal.filter((assignment) => assignment.id_estado !== 3);
  return roleNames.map((role) => {
    if (/responsable|practicante/i.test(role)) {
      const assignment = assignments.find((item) => item.rol?.descripcion === role);
      return assignment ? `${role} de ${assignment.servicio.servicio}` : role;
    }
    return role;
  }).join(", ") || "—";
}

function accountFromRow(row: Record<string, unknown>): Account | null {
  return typeof row.id === "string" && typeof row.id_estado === "number" && typeof row.nombre_usuario === "string"
    ? row as unknown as Account
    : null;
}

function nameFromRow(row: Record<string, unknown>): string {
  const account = accountFromRow(row);
  return account ? fullName(account) : "";
}

function cargoFromRow(row: Record<string, unknown>): string {
  const account = accountFromRow(row);
  return account ? cargoService(account) : "—";
}

function activeFromRow(row: Record<string, unknown>): boolean {
  return accountFromRow(row)?.id_estado === 1;
}

function setActiveFromRow(row: Record<string, unknown>, active: boolean): void {
  const account = accountFromRow(row);
  if (account) void setActive(account, active);
}
</script>
