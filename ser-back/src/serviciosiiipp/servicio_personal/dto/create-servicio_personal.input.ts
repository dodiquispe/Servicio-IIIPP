import { Field, InputType, Int } from '@nestjs/graphql';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateServicioPersonalInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  id_servicio: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  id_usuario: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  id_rol: string;

  @Field(() => String, { nullable: true })
  @IsDateString()
  @IsOptional()
  fecha_inicio?: string;

  @Field(() => String, { nullable: true })
  @IsDateString()
  @IsOptional()
  fecha_fin?: string | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  id_estado?: number;
}
