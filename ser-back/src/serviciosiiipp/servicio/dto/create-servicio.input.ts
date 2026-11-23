import { InputType, Int, Field } from '@nestjs/graphql';
import {
  IsArray,
  IsNotEmpty,
  IsString,
  IsInt,
  IsOptional,
  MaxLength,
  Min,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class HorarioServicioInput {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  id_dia: number;

  @Field()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  hora_inicio: string;

  @Field()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
  hora_fin: string;
}

@InputType()
export class CreateServicioInput {
  @Field(() => String)
  @IsNotEmpty({ message: 'El nombre del servicio es obligatorio' })
  @IsString({ message: 'El nombre del servicio es obligatorio' })
  @MaxLength(150)
  servicio: string;

  @Field(() => String)
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @IsString({ message: 'La descripción es obligatoria' })
  @MaxLength(500)
  descripcion: string;

  @Field(() => Int)
  @IsInt({
    message:
      'La capacidad simultánea debe ser un número entero mayor o igual a 1',
  })
  @Min(1, {
    message:
      'La capacidad simultánea debe ser un número entero mayor o igual a 1',
  })
  capacidad_simultanea: number;

  @Field(() => Int)
  @IsInt({ message: 'La duración de sesión debe ser mayor a 15 minutos' })
  @Min(16, { message: 'La duración de sesión debe ser mayor a 15 minutos' })
  duracion_sesion_min: number;

  @Field(() => [HorarioServicioInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HorarioServicioInput)
  horarios?: HorarioServicioInput[];

  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(1)
  @IsOptional()
  id_estado?: number;
}
