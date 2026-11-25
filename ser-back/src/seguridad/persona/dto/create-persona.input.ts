import { InputType, Int, Field, ArgsType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsEmail,
  IsInt,
  Max,
  MaxLength,
  Matches,
  Min,
} from 'class-validator';
import { ciFormatMessage, ciLengthMessage, ciMaxLength, ciPattern } from '../carnet.js';

@ArgsType()
export class VerificarCarnetArgs {
  @Field(() => String)
  @IsNotEmpty({ message: 'El carnet de identidad es obligatorio' })
  @MaxLength(ciMaxLength, { message: ciLengthMessage })
  @Matches(ciPattern, { message: ciFormatMessage })
  nro_documento: string;
}

@InputType()
export class CreatePersonaInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  nombres: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  primer_apellido: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  segundo_apellido: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  edad?: number | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  procedencia?: string | null;

  @Field(() => String, { nullable: true })
  @IsNotEmpty({ message: 'El carnet de identidad es obligatorio' })
  @IsString()
  @MaxLength(ciMaxLength, { message: ciLengthMessage })
  @Matches(ciPattern, { message: ciFormatMessage })
  nro_documento: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  complemento?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  id_expedito?: number | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  expedito_personalizado?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  foto?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  movil?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  telefono?: string;

  @Field(() => Int, { nullable: false })
  @IsNotEmpty()
  @IsNumber()
  id_genero: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  correo_personal: string;

  @Field(() => Int, { nullable: true })
  @IsNumber()
  @IsOptional()
  id_anterior: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  id_institucion_referencia?: string | null;
}
