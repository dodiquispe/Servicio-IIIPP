import { Field, InputType, Int, PartialType } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';
import { CreateHorarioInput } from './create-horario.input.js';

@InputType()
export class UpdateHorarioInput extends PartialType(CreateHorarioInput) {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  id_horario: number;
}
