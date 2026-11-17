import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString } from 'class-validator';

@InputType()
export class UsuarioArgs {
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() nombres?: string;
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() primer_apellido?: string;
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() nro_documento?: string;
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() correo?: string;
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() id_rol?: string;
  @Field(() => String, { nullable: true }) @IsOptional() @IsString() id_servicio?: string;
  @Field(() => Int, { nullable: true }) @IsOptional() @IsInt() id_estado?: number;
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  busqueda?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  nombre_usuario?: string;
}
