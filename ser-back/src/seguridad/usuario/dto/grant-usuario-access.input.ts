import { Field, InputType } from '@nestjs/graphql';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

@InputType()
export class GrantUsuarioAccessInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsUUID()
  id_persona: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre_usuario?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id_servicio?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(200)
  correo?: string | null;

  @Field(() => String)
  @IsNotEmpty()
  @IsUUID()
  id_rol: string;
}
