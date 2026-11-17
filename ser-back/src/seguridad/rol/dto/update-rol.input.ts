import { CreateRolInput } from './create-rol.input.js';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
} from 'class-validator';

@InputType()
export class UpdateRolInput extends PartialType(CreateRolInput) {
  @Field(() => String)
  @IsNotEmpty()
  @IsUUID()
  @IsString()
  id: string;
}
