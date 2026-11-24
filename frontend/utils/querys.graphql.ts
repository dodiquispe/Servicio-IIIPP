import { $util } from "./util";

const Querys = {
  publicas: {
    login: `
      mutation LoginUsuario($nombre_usuario: String!, $contrasena: String!) {
        loginUsuario(nombre_usuario: $nombre_usuario, contrasena: $contrasena) {
          accessToken
          usuario {
            id nombre_usuario correo
            persona {
              nombres primer_apellido segundo_apellido foto correo_personal nro_documento movil
            }
          }
          roles { id descripcion id_estado }
          recursos { id id_recurso_padre title icon path }
        }
      }
    `,
    personaPorCarnet: `
      query BuscarPersona($ci: String!) {
        personaPorCarnet(nro_documento: $ci) {
          id nombres primer_apellido segundo_apellido esPaciente
        }
      }
    `,
    crearPersona: `
      mutation CrearPaciente($datos: CreatePersonaInput!) {
        createPersona(createPersonaInput: $datos) {
          id nro_documento nombres primer_apellido segundo_apellido
        }
      }
    `,
    servicios: `
      query ServiciosPublicos {
        servicios(limit: 100, pagina: 1, search: { id_estado: 1 }) {
          rows { id servicio descripcion duracion_sesion_min id_estado }
        }
      }
    `,
    serviciosDisponiblesReserva: `
      query ServiciosDisponiblesReserva {
        serviciosDisponiblesReserva { id nombre }
      }
    `,
    horariosDisponibles: `
      query HorariosDisponibles($id: String!, $fecha: String!, $id_persona: String) {
        horariosDisponibles(id_servicio: $id, fecha: $fecha, id_persona: $id_persona) {
          hora_inicio hora_fin id_profesional
        }
      }
    `,
    avisoCierreAgenda: `
      query AvisoCierreAgenda($fecha: String!) {
        avisoCierreAgenda(fecha: $fecha)
      }
    `,
    crearReserva: `
      mutation CrearReservaPublica($input: CreateReservaPublicaInput!) {
        createReservaPublica(input: $input) {
          expediente { id codigo_caso }
          reserva { id fecha hora_inicio hora_fin }
        }
      }
    `,
    solicitarVerificacionPago: `
      mutation SolicitarVerificacionPago($input: SolicitarVerificacionPagoInput!) {
        solicitarVerificacionPago(input: $input) {
          id estado_pago nit_factura razon_social_factura comprobante_mime_type
        }
      }
    `,
    estadoPagoReserva: `
      query EstadoPagoReserva($id: String!) {
        estadoPagoReserva(id_reserva: $id) {
          estado_pago estado_reserva tiene_comprobante
        }
      }
    `,
  },
  staff: {
    responsablesServicioAgenda: `
      query ResponsablesServicioAgenda {
        servicioPersonal {
          id_usuario id_servicio id_estado vigencia
          rol { descripcion id_estado }
          servicio { servicio id_estado }
          usuario { id_estado persona { nombres primer_apellido segundo_apellido } }
        }
      }
    `,
    reservasDetalleAgenda: `
      query ReservasDetalleAgenda($desde: String!, $hasta: String!) {
        reservas(desde: $desde, hasta: $hasta) {
          id id_servicio id_profesional fecha hora_inicio estado_reserva
          expediente { id_persona motivo_consulta persona { nro_documento movil } }
        }
      }
    `,
    responsablesAgenda: `query ResponsablesAgenda { profesionalesFiltroAgenda { id name } }`,
    crearPaciente: `
      mutation CrearPacienteAdministracion($input: CreatePacienteInput!) {
        createPaciente(input: $input) {
          id nombres primer_apellido segundo_apellido nro_documento procedencia
        }
      }
    `,
    reporteAtenciones: `
      query ReporteAtenciones($search: ReporteAtencionesArgs) {
        reporteAtenciones(search: $search) {
          total
          desde hasta
          por_mes { clave etiqueta cantidad }
          casos { clave etiqueta cantidad }
          por_dia { clave etiqueta cantidad }
          por_dia_semana { clave etiqueta cantidad }
          por_servicio { clave etiqueta cantidad }
          por_municipio { clave etiqueta cantidad }
        }
      }
    `,
    pacientesGeneral: `
      query PacientesGeneral($pagina: Int!, $search: PacientesAdministracionArgs) {
        pacientesAdministracionPage(limit: 100, pagina: $pagina, search: $search) {
          rows {
            id codigo_caso id_persona
            persona { nombres primer_apellido segundo_apellido nro_documento procedencia }
          }
          count
        }
      }
    `,
    detallePacienteGeneral: `
      query DetallePacienteGeneral($id_persona: String!) {
        detallePacienteGeneral(id_persona: $id_persona) {
          fecha_ingreso
          persona {
            nombres primer_apellido segundo_apellido nro_documento complemento
            edad procedencia movil telefono correo_personal
            genero { valor } expedito { valor }
          }
          expedientes {
            id codigo_caso id_servicio motivo_consulta fecha_apertura estado_caso
            persona {
              nombres primer_apellido segundo_apellido nro_documento complemento
              edad procedencia movil telefono correo_personal
              genero { valor } expedito { valor }
            }
            servicio { servicio }
            responsable { id persona { nombres primer_apellido segundo_apellido } }
            profesional { id persona { nombres primer_apellido segundo_apellido } }
          }
        }
      }
    `,
    agendarCitaPacienteGeneral: `
      mutation AgendarCitaPacienteGeneral($input: CreateReservaPublicaInput!) {
        agendarCitaPacienteGeneral(input: $input) {
          expediente { id codigo_caso }
          reserva { id fecha hora_inicio hora_fin }
        }
      }
    `,
    parametrosPorTipo: `
      query ParametrosDeTipo($tipo: String!) {
        parametrosByTipo(tipo: $tipo) { id valor tipo id_estado }
      }
    `,
    expedientesAtencion: `
      query ExpedientesAtencion {
        expedientes {
          id codigo_caso id_persona id_servicio id_profesional
          motivo_consulta institucion_referencia fecha_apertura fecha_cierre estado_caso
          id_estado_caso estado_actual { id descripcion tipo }
          conclusion_diagnostico derivaciones cerrado_por
          persona { nombres primer_apellido segundo_apellido nro_documento }
          servicio { servicio id_estado }
          responsable { id persona { nombres primer_apellido segundo_apellido } }
          profesional {
            id persona { nombres primer_apellido segundo_apellido }
          }
        }
      }
    `,
    sesionesExpediente: `
      query SesionesExpediente($id: String!) {
        sesiones(id_expediente: $id) {
          id id_reserva numero_correlativo fecha_sesion
          accion_realizada observaciones nombre_registrado_por
          tipo_atencion { id valor }
          registrado_por { persona { nombres primer_apellido segundo_apellido } }
        }
      }
    `,
    reservasAtendidas: `
      query ReservasAtendidas($desde: String!, $hasta: String!, $professional: String!) {
        reservas(desde: $desde, hasta: $hasta, id_profesional: $professional) {
          id id_expediente fecha hora_inicio estado_reserva
        }
      }
    `,
    reservasAsistidasExpediente: `
      query ReservasAsistidasExpediente($id: String!) {
        reservasAsistidasExpediente(id_expediente: $id) {
          id id_expediente fecha hora_inicio estado_reserva
        }
      }
    `,
    crearSesion: `
      mutation CrearSesion($input: CreateSesionInput!) {
        createSesion(input: $input) {
          id numero_correlativo fecha_sesion accion_realizada observaciones
          tipo_atencion { id valor }
        }
      }
    `,
    cerrarExpediente: `
      mutation CerrarExpediente($input: CerrarExpedienteInput!) {
        cerrarExpediente(input: $input) {
          id estado_caso id_estado_caso estado_actual { id descripcion tipo }
          conclusion_diagnostico derivaciones fecha_cierre cerrado_por
        }
      }
    `,
    agendaSemanal: `
      query AgendaSemanal($desde: String!, $hasta: String!, $id_profesional: String) {
        agendaSemanal(desde: $desde, hasta: $hasta, id_profesional: $id_profesional) {
          id tipo_evento fecha hora_inicio hora_fin id_profesional profesional
          id_responsable responsable id_servicio servicio codigo_caso paciente estado motivo
        }
      }
    `,
    misServicios: `
      query MisServicios {
        misServicios {
          id_usuario id_servicio fecha_inicio fecha_fin id_estado
          servicio { id servicio duracion_sesion_min id_estado }
          rol { descripcion }
        }
      }
    `,
    horariosSemana: `
      query HorariosSemanal {
        horarios(limit: 100, pagina: 1) {
          rows {
            id_horario id_servicio hora_inicio hora_fin
            dia { valor }
            servicio { id servicio duracion_sesion_min }
          }
        }
      }
    `,
    reservasSemana: `
      query ReservasDeLaSemana($desde: String!, $hasta: String!, $professional: String!) {
        reservas(desde: $desde, hasta: $hasta, id_profesional: $professional) {
          id id_servicio fecha hora_inicio hora_fin estado_reserva
          servicio { servicio }
          expediente {
            id_persona codigo_caso
            persona { nombres primer_apellido segundo_apellido }
          }
        }
      }
    `,
    reservasDashboard: `
      query ReservasDashboard($desde: String!, $hasta: String!) {
        reservas(desde: $desde, hasta: $hasta) {
          id id_profesional fecha hora_inicio hora_fin estado_reserva
          expediente { codigo_caso persona { nombres primer_apellido segundo_apellido } }
        }
      }
    `,
    bloquesAgenda: `
      query BloqueosDeLaSemana($desde: String!, $hasta: String!) {
        bloquesAgenda(desde: $desde, hasta: $hasta) {
          id fecha_inicio fecha_fin hora_inicio hora_fin id_profesional id_servicio tipo id_estado motivo
          servicio { servicio }
        }
      }
    `,
    reservasSecretaria: `
      query ReservasSecretaria($desde: String!, $hasta: String!) {
        reservas(desde: $desde, hasta: $hasta) {
          id id_expediente id_servicio id_profesional fecha hora_inicio hora_fin canal estado_reserva estado_pago
          servicio { servicio id_estado }
          expediente {
            codigo_caso
            persona { nombres primer_apellido segundo_apellido }
          }
        }
      }
    `,
    pagosSecretaria: `
      query PagosSecretaria {
        reservas {
          id fecha hora_inicio estado_reserva estado_pago monto
          nit_factura razon_social_factura comprobante_mime_type
          servicio { servicio }
          expediente {
            codigo_caso
            persona {
              nombres primer_apellido segundo_apellido nro_documento movil correo_personal
            }
          }
        }
      }
    `,
    pagosPendientesVerificacion: `
      query PagosPendientesVerificacion {
        pagosPendientesVerificacion { id fecha hora_inicio }
      }
    `,
    comprobantePagoSecretaria: `
      query ComprobantePagoSecretaria($id: String!) {
        comprobantePagoReserva(id_reserva: $id) {
          mime_type base64
        }
      }
    `,
    verificarPago: `
      mutation VerificarPago($id: String!) {
        verificarPagoReserva(id: $id) { id estado_pago estado_reserva }
      }
    `,
    bloquesSecretaria: `
      query BloqueosSecretaria($desde: String!, $hasta: String!) {
        bloquesAgenda(desde: $desde, hasta: $hasta) {
          id fecha_inicio fecha_fin hora_inicio hora_fin motivo
        }
      }
    `,
    crearBloque: `
      mutation CrearBloqueAgenda($input: CreateBloqueAgendaInput!) {
        createBloqueAgenda(input: $input) { id fecha_inicio fecha_fin motivo }
      }
    `,
    eliminarBloque: `
      mutation EliminarBloqueAgenda($id: String!) {
        removeBloqueAgenda(id: $id) { id }
      }
    `,
    cambiarEstadoReserva: `
      mutation MarcarNoAsistio($input: CambiarEstadoReservaInput!) {
        cambiarEstadoReserva(input: $input) { id estado_reserva }
      }
    `,
    confirmarReserva: `
      mutation ConfirmarReserva($input: CambiarEstadoReservaInput!) {
        cambiarEstadoReserva(input: $input) { id estado_reserva }
      }
    `,
    crearReagendamiento: `
      mutation CrearReagendamiento($input: CreateReagendamientoInput!) {
        createReagendamiento(input: $input) {
          id numero_reagendamiento resultado fecha_nueva hora_nueva
        }
      }
    `,
  },
  queryWithVar(
    tabla: string,
    rows: string,
    orderType: string | null = `${$util.capitalizeString(tabla)}OrderArgs`,
  ): string {
    const entity = $util.capitalizeString(tabla);
    const searchType = tabla === "estado" ? "EstadoSearchInput" : `${entity}Args`;
    const hasOrder = Boolean(orderType && orderType !== "none");
    const orderVariable = hasOrder ? `, $order: ${orderType}` : "";
    const orderArgument = hasOrder ? ", order: $order" : "";
    return `
      query($limit: Int!, $pagina: Int!, $search: ${searchType}${orderVariable}) {
        ${$util.formacionPlural(tabla)}(
          limit: $limit
          pagina: $pagina
          search: $search
          ${orderArgument}
        ) {
          count
          rows {
            ${rows}
          }
        }
      }
    `;
  },

  queryconvariablesdistintas(
    tabla: string,
    rows: string,
    campo: string,
    idType = "String",
  ): string {
    return `
      query($datos: ${idType}!) {
        ${tabla}(${campo}: $datos) {
          ${rows}
        }
      }
    `;
  },

  queryWithVarSearch(tabla: string, rows: string): string {
    const entity = $util.capitalizeString(tabla);
    return `
      query($search: ${entity}Args) {
        ${$util.formacionPlural(tabla)}(search: $search) {
          count
          rows {
            ${rows}
          }
        }
      }
    `;
  },

  querySinCount(tabla: string, rows: string): string {
    let query = `
    query{
      ${tabla}{
        ${rows}
      }
    }
    `;
    return query;
  },

  queryWithoutVar(tabla: string, rows: string): string {
    let query = `
      query{
        ${tabla}{
          count
          rows{
            ${rows}
          }
        }
      }
    `;

    return query;
  },

  queryOne(tabla: string, rows: string, idType = "String"): string {
    return `
      query($id: ${idType}!) {
        ${tabla}(id: $id) {
          ${rows}
        }
      }
    `;
  },

  mutationCreateWithVariable(tabla: string, rows: string): string {
    const entity = $util.capitalizeString(tabla);
    return `
      mutation($datos: Create${entity}Input!) {
        create${entity}(create${entity}Input: $datos) {
          ${rows}
        }
      }
    `;
  },

  mutationEditWithVariable(tabla: string, rows: string): string {
    const entity = $util.capitalizeString(tabla);
    return `
      mutation($datos: Update${entity}Input!) {
        update${entity}(update${entity}Input: $datos) {
          ${rows}
        }
      }
    `;
  },

  mutationDeleteWithVariable(
    tabla: string,
    idType = "String",
    rows = "id",
    idField = "id",
  ): string {
    const entity = $util.capitalizeString(tabla);
    const selection = rows ? `{ ${rows} }` : "";
    return `
      mutation($${idField}: ${idType}!) {
        remove${entity}(${idField}: $${idField}) ${selection}
      }
    `;
  },
};

export const $querys = Querys;
