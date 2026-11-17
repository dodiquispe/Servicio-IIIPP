import { CitasService } from './citas.service.js';
import { CitasResolver } from './citas.resolver.js';
import { Pago } from './entities/pago.entity.js';
import { Cita } from './entities/cita.entity.js';
import { EstadoModule } from '../../seguridad/estado/estado.module.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Persona } from '../../seguridad/persona/entities/persona.entity.js';
import { Usuario } from '../../seguridad/usuario/entities/usuario.entity.js';
import { Horario } from '../horario/entities/horario.entity.js';
import { Servicio } from '../servicio/entities/servicio.entity.js';
import { ServicioPersonal } from '../servicio_personal/entities/servicio_personal.entity.js';
import { AtencionResolver } from './atencion.resolver.js';
import { AtencionService } from './atencion.service.js';
import { BloqueAgenda } from './entities/bloque-agenda.entity.js';
import { Expediente } from './entities/expediente.entity.js';
import { Reagendamiento } from './entities/reagendamiento.entity.js';
import { Reserva } from './entities/reserva.entity.js';
import { Sesion } from './entities/sesion.entity.js';
import { InstitucionReferencia } from '../institucion-referencia/entities/institucion-referencia.entity.js';
import { Disponibilidad } from '../disponibilidad/entities/disponibilidad.entity.js';
import { Parametro } from '../../public/parametros/entities/parametro.entity.js';
import { Estado } from '../../seguridad/estado/entities/estado.entity.js';

@Module({
  imports: [EstadoModule,
    TypeOrmModule.forFeature(
      [
        Pago, Cita,
        Expediente,
        Reserva,
        Reagendamiento,
        Sesion,
        BloqueAgenda,
        Persona,
        Usuario,
        Servicio,
        Horario,
        ServicioPersonal,
        InstitucionReferencia,
        Disponibilidad,
        Parametro,
        Estado,
      ],
      'services',
    ),
  ],
  providers: [AtencionResolver, AtencionService, CitasService, CitasResolver],
  exports: [AtencionService],
})
export class AtencionModule {}
