import { Field, InputType, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';
import { CreateServicioPersonalInput } from './create-servicio_personal.input.js';

@InputType()
export class UpdateServicioPersonalInput extends PartialType(
  CreateServicioPersonalInput,
) {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  id: string;
}
