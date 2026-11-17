import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNumber, IsOptional, IsString } from 'class-validator';

@InputType()
export class ParametroArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  valor?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  id?: number;
}
