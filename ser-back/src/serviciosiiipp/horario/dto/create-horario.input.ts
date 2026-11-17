import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

@InputType()
export class CreateHorarioInput {
  @Field(() => String)
  @IsUUID()
  id_servicio: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  id_dia: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  id_profesional?: string | null;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'hora_inicio debe tener formato HH:mm o HH:mm:ss',
  })
  hora_inicio: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, {
    message: 'hora_fin debe tener formato HH:mm o HH:mm:ss',
  })
  hora_fin: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  id_estado?: number;
}
