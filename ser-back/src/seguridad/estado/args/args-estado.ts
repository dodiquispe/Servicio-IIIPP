import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

@InputType()
export class EstadoSearchInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  valor?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  tipo?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  id_estado?: number;
}

@InputType()
export class EstadoOrderInput {
  @Field(() => String)
  @IsString()
  columna: string;

  @Field(() => String)
  @IsString()
  order: string;
}
