import { InputType, Field, Int } from '@nestjs/graphql';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

@InputType()
export class CreateEstadoInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsIn([1, 2])
  id_estado?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  valor?: string;

  // Compatibilidad con los consumidores existentes de estado.
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  descripcion?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  tipo?: string;
}
