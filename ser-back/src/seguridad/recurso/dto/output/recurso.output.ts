import { Field, ObjectType } from '@nestjs/graphql';
import { Recurso } from '../../entities/recurso.entity.js';

@ObjectType()
export class RecursosOutput extends Recurso {
  @Field(() => [RecursosOutput], { nullable: true })
  sub_menu?: RecursosOutput[];
}
