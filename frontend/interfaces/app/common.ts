export type TableAlignment = "start" | "center" | "end";
export type TableSortDirection = "asc" | "desc";
export type FilterType =
  | "genero"
  | "extension"
  | "referencia_institucional"
  | "estado_caso"
  | "practicante"
  | "paciente"
  | "rol"
  | "recurso"
  | "servicio"
  | "text"
  | "number"
  | "date"
  | "time"
  | "textarea"
  | "boolean"
  | "select"
  | "icon"
  | "entidad"
  | "estado"
  | "parametro"
  | "hidden";
export type InputType =
  | "genero"
  | "extension"
  | "referencia_institucional"
  | "estado_caso"
  | "practicante"
  | "paciente"
  | "rol"
  | "servicio"
  | "recurso"
  | "parametro"
  | "entidad"
  | "estado"
  | "text"
  | "number"
  | "textarea"
  | "select"
  | "icon"
  | "boolean"
  | "hidden"
  | "time"
  | "date";

export interface Header {
  title: string;
  key: string;
  align?: TableAlignment;
  sortable?: boolean;
  removable?: boolean;
  crearColumna?: boolean;
}

export interface Filters {
  idServicio?: string | null;
  field: string;
  label: string;
  type: FilterType;
  items?: Array<string | number | SelectOption>;
  itemTitle?: string;
  itemValue?: string;
  parametro?: string;
}

export interface SelectOption {
  [key: string]: string | number | boolean | null | undefined;
}

export interface Inputs {
  idServicio?: string | null;
  field: string;
  descripcion: string;
  type: InputType;
  required?: boolean;
  col?: number | string;
  maxlength?: number;
  min?: number;
  max?: number;
  integer?: boolean;
  numericMessage?: string;
  items?: Array<string | number | SelectOption>;
  itemTitle?: string;
  itemValue?: string;
  parametro?: string;
}

export interface TableSort {
  key: string;
  order: TableSortDirection;
}

export interface CrudRecord {
  [key: string]: unknown;
}

export type FormValue = string | number | boolean | null | undefined;

export interface CrudFormData {
  [key: string]: FormValue;
}

export interface ServiceRecord extends CrudRecord {
  id: string;
  servicio: string;
}

export interface DayParameter extends SelectOption {
  id: number;
  valor: string;
}

export const WEEKDAY_NAMES = [
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
] as const;

export function normalizeDayName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function findDayParameter(
  parameters: DayParameter[],
  name: string,
): DayParameter | undefined {
  const normalizedName = normalizeDayName(name);
  const matches = parameters.filter(
    (parameter) => normalizeDayName(parameter.valor) === normalizedName,
  );
  return matches.length === 1 ? matches[0] : undefined;
}

export interface ScheduleRecord extends CrudRecord {
  id_horario: number;
  id_servicio: string;
  id_profesional: string | null;
  id_dia: number;
  hora_inicio: string;
  hora_fin: string;
  id_estado: number;
}

export interface CrudTableProps {
  tabla: string;
  titulo?: string;
  mutation?: string;
  headers: Header[];
  getrows: string;
  filters: Filters[];
  order?: TableSort;
  orderType?: string;
  idType?: string;
  deleteRows?: string;
  idField?: string;
  deleteIdField?: string;
  mutationRows?: string;
  fixedSearch?: Record<string, unknown>;
  createData?: Record<string, unknown>;
  inputs: Inputs[];
  acciones?: boolean;
  canCreate?: boolean;
  sourceItems?: CrudRecord[];
  sourceLoading?: boolean;
  sourceReload?: () => Promise<void>;
  onSave?: (data: CrudRecord, isEditing: boolean) => Promise<void>;
  groupBy?: Array<{ key: string; order?: TableSortDirection }>;
  afterCreate?: (
    createdRecord: CrudRecord,
    submittedData: CrudRecord,
  ) => Promise<void>;
}

export interface CrudDialogProps {
  modelValue: boolean;
  datos?: CrudRecord;
  tabla: string;
  titulo?: string;
  guardarTexto?: string;
  maxWidth?: string | number;
  mutation?: string;
  idField?: string;
  mutationRows?: string;
  inputs: Inputs[];
  afterCreate?: CrudTableProps["afterCreate"];
  onSave?: CrudTableProps["onSave"];
}
