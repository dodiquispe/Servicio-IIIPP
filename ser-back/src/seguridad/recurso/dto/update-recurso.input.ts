import { CreateRecursoInput } from './create-recurso.input.js';
import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID } from 'class-validator';

@InputType()
export class UpdateRecursoInput extends PartialType(CreateRecursoInput) {
  @Field(() => String)
  @IsNotEmpty()
  @IsUUID()
  id: string;
}
