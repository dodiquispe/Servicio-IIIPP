import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

@InputType()
export class InstitucionReferenciaArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  id_estado?: number;
}

@InputType()
export class InstitucionReferenciaOrderArgs {
  @Field(() => String)
  @IsString()
  columna: string;

  @Field(() => String)
  @IsString()
  order: string;
}
