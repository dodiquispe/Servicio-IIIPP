import { CreateServicioInput } from './create-servicio.input.js';
import { InputType, Field, PartialType } from '@nestjs/graphql';
import { IsString, IsUUID } from 'class-validator';

@InputType()
export class UpdateServicioInput extends PartialType(CreateServicioInput) {
  @Field(() => String)
  @IsString()
  @IsUUID()
  id: string;
}
