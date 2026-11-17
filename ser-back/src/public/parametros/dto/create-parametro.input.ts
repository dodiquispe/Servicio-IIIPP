import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

@InputType()
export class CreateParametroInput {
  @Field()
  @IsString()
  @MaxLength(200)
  valor: string;

  @Field()
  @IsString()
  @MaxLength(200)
  tipo: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id_estado?: number;
}
