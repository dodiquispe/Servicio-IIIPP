import { InputType, Int, Field } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateUsuarioRolInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  id_rol: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  id_usuario: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id_estado?: number;
}
