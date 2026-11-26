import { Field, InputType } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import { IsDefined, IsEmail, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { AltaPersonaInput } from '../../persona/dto/alta-persona.input.js';
import { normalizarDatoPersona } from '../../persona/validacion-alta.js';
import { CreatePersonaInput } from '../../persona/dto/create-persona.input.js';

@InputType()
export class CreateUsuarioCompletoInput {
  @Field(() => CreatePersonaInput)
  persona: CreatePersonaInput;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  nombre_usuario?: string;

  @Field(() => String)
  @IsEmail()
  @IsNotEmpty()
  correo: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  id_rol: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  id_servicio?: string;
}

@InputType()
export class AltaIntegranteEquipoInput {
  @Field(() => AltaPersonaInput, { nullable: true })
  @IsDefined({ message: 'es obligatorio' })
  @ValidateNested()
  @Type(() => AltaPersonaInput)
  persona: AltaPersonaInput;

  @Field(() => String, { nullable: true })
  @Transform(({ value }) => typeof value === 'string' ? normalizarDatoPersona(value) : value)
  @IsEmail({}, { message: 'debe ser un correo electrónico válido' })
  correo: string;

  @Field(() => String, { nullable: true })
  @IsString({ message: 'selecciona un rol válido' })
  @IsNotEmpty({ message: 'es obligatorio' })
  id_rol: string;

  @Field(() => String, { nullable: true })
  @IsString({ message: 'selecciona un servicio válido' })
  @IsNotEmpty({ message: 'es obligatorio' })
  id_servicio: string;
}
