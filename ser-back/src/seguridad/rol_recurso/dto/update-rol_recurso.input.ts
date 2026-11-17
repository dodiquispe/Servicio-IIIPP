import { CreateRolRecursoInput } from './create-rol_recurso.input.js';
import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';

@InputType()
export class UpdateRolRecursoInput extends PartialType(CreateRolRecursoInput) {
  @Field(() => String)
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
