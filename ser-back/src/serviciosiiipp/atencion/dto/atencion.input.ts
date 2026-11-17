import { Field, InputType, Int } from '@nestjs/graphql';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import {
  CanalReserva,
  EstadoReserva,
  ResultadoReagendamiento,
} from '../atencion.enums.js';

@InputType()
export class CreateExpedienteInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  id_persona: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  id_servicio: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  id_profesional: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  motivo_consulta: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  institucion_referencia?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  id_institucion_referencia?: string;
}

@InputType()
export class CreateReservaInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  id_expediente: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  id_servicio: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  id_profesional: string;

  @Field()
  @IsDateString()
  fecha: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  hora_inicio: string;

  @Field(() => CanalReserva, { nullable: true })
  @IsOptional()
  @IsEnum(CanalReserva)
  canal?: CanalReserva;
}

@InputType()
export class CreateReservaPublicaInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  id_persona: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  id_servicio: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  id_profesional: string;

  @Field()
  @IsDateString()
  fecha: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  hora_inicio: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  motivo_consulta: string;
}

@InputType()
export class SolicitarVerificacionPagoInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  id_reserva: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nit_factura: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  razon_social_factura: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2796204)
  comprobante_base64?: string | null;
}

@InputType()
export class CreateReagendamientoInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  id_reserva: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  motivo: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  solicitado_por: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  autorizado_por?: string;

  @Field(() => ResultadoReagendamiento)
  @IsEnum(ResultadoReagendamiento)
  resultado: ResultadoReagendamiento;

  @Field()
  @IsDateString()
  fecha_anterior: string;

  @Field()
  @IsString()
  hora_anterior: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsDateString()
  fecha_nueva?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  hora_nueva?: string;
}

@InputType()
export class CreateSesionInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  id_expediente: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  id_reserva?: string;

  @Field()
  @IsDateString()
  fecha_sesion: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  id_tipo_atencion: number;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  accion_realizada: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  observaciones?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  id_registrado_por?: string;
}

@InputType()
export class CreateBloqueAgendaInput {
  @Field()
  @IsDateString()
  fecha_inicio: string;

  @Field()
  @IsDateString()
  fecha_fin: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  hora_inicio?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  hora_fin?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  id_profesional?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  id_servicio?: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  motivo: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  creado_por: string;
}

@InputType()
export class CerrarExpedienteInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  id: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  id_estado_caso: number;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  conclusion_diagnostico: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  derivaciones?: string;
}

@InputType()
export class ReasignarExpedienteInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  id_expediente: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  id_profesional: string;
}

@InputType()
export class CambiarEstadoReservaInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  id: string;

  @Field(() => EstadoReserva)
  @IsEnum(EstadoReserva)
  estado_reserva: EstadoReserva;
}

@InputType()
export class ReagendarCitaInput {
  @Field() @IsString() fecha: string;
  @Field() @IsString() hora_inicio: string;
  @Field() @IsString() @MaxLength(300) motivo: string;
}
