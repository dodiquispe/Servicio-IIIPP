import { CreateUsuarioRolInput } from './create-usuario_rol.input.js';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import { IsNotEmpty, IsUUID, IsString } from 'class-validator';

@InputType()
export class UpdateUsuarioRolInput extends PartialType(CreateUsuarioRolInput) {
  @Field(() => String)
  @IsNotEmpty()
  @IsUUID()
  @IsString()
  id: string;
}
