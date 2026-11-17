import { InputType, Field, Int } from '@nestjs/graphql';
import { UpdatePersonaInput } from '../../persona/dto/update-persona.input.js';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

@InputType()
export class UpdateUsuarioInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id_rol?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id_servicio?: string;
  @Field(() => String)
  @IsNotEmpty()
  @IsUUID()
  @IsString()
  id: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  id_persona?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre_usuario?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  correo?: string | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id_estado?: number;

  @Field(() => UpdatePersonaInput, { nullable: true })
  @IsOptional()
  persona?: UpdatePersonaInput;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  correo_personal?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  movil?: string | null;
}
