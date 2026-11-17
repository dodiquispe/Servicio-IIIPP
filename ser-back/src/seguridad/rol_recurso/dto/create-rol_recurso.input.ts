import { InputType, Int, Field } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

@InputType()
export class CreateRolRecursoInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsUUID()
  id_rol: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsUUID()
  id_recurso: string;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  id_estado?: number;
}
