import { Field, InputType, Int, PartialType } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

@InputType()
export class CreateInstitucionReferenciaInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id_estado?: number;
}

@InputType()
export class UpdateInstitucionReferenciaInput extends PartialType(
  CreateInstitucionReferenciaInput,
) {
  @Field()
  @IsString()
  @IsNotEmpty()
  id: string;
}
