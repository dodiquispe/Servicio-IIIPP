import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
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
