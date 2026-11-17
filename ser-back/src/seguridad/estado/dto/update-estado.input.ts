import { CreateEstadoInput } from './create-estado.input.js';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsIn, IsInt, Min } from 'class-validator';

@InputType()
export class UpdateEstadoInput extends PartialType(CreateEstadoInput) {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  id: number;

  @Field(() => Int)
  @IsInt()
  @IsIn([1, 2])
  id_estado: number;
}
