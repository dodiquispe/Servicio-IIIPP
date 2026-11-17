import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString } from 'class-validator';

@InputType()
export class UsuarioRolArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  busqueda?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  id_usuario?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  id_rol?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id_estado?: number;
}

@InputType()
export class UsuarioRolOrderArgs {
  @Field()
  @IsString()
  columna: string;

  @Field()
  @IsString()
  order: string;
}
