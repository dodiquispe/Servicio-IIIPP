import { InputType, Int, Field, ArgsType } from '@nestjs/graphql';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

@ArgsType()
@InputType()
export class CreateUsuarioInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  id_persona: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  nombre_usuario?: string;

  @Field(() => String, { nullable: true })
  @IsEmail()
  @IsOptional()
  correo?: string;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  id_estado?: number;
}
