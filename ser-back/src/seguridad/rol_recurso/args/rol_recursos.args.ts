import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

@InputType()
export class RolRecursoArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id_rol?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUUID()
  id_recurso?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id_estado?: number;

  @Field(() => String, { nullable: true })
  descripcionRol?: string;

  @Field(() => String, { nullable: true })
  nombreRecurso?: string;
}

@InputType()
export class RolRecursoOrderArgs {
  @Field()
  @IsString()
  columna: string;

  @Field()
  @IsString()
  order: string;
}
