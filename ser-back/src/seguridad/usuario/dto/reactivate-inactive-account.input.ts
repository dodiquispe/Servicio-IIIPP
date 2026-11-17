import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

@InputType()
export class ReactivateInactiveAccountInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  id_usuario: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  id_rol?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsNotEmpty()
  @IsString()
  id_servicio?: string;
}
