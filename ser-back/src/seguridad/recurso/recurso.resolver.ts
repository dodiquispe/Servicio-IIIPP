import {
  Args,
  Field,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { RecursoArgs, RecursoOrderArgs } from './args/recurso.args.js';
import { RecursoService } from './recurso.service.js';
import { Recurso } from './entities/recurso.entity.js';
import { CreateRecursoInput } from './dto/create-recurso.input.js';
import { UpdateRecursoInput } from './dto/update-recurso.input.js';
import { Roles } from '../auth/graphql-auth.decorator.js';

@ObjectType()
class RecursosPage {
  @Field(() => [Recurso])
  rows: Recurso[];

  @Field(() => Int)
  count: number;
}

@Resolver(() => Recurso)
@Roles('administrador')
export class RecursoResolver {
  constructor(private readonly recursoService: RecursoService) {}

  @Mutation(() => Recurso)
  createRecurso(
    @Args('createRecursoInput') createRecursoInput: CreateRecursoInput,
  ) {
    return this.recursoService.create(createRecursoInput);
  }

  @Query(() => RecursosPage, { name: 'recursos' })
  findAll(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('pagina', { type: () => Int, defaultValue: 1 }) pagina: number,
    @Args('search', { type: () => RecursoArgs, nullable: true })
    search?: RecursoArgs,
    @Args('order', { type: () => RecursoOrderArgs, nullable: true })
    order?: RecursoOrderArgs,
  ) {
    return this.recursoService.findAll(limit, pagina, search, order);
  }

  @Query(() => Recurso, { name: 'recurso' })
  findOne(@Args('id', { type: () => String }) id: string) {
    return this.recursoService.findOne(id);
  }

  @Mutation(() => Recurso)
  updateRecurso(
    @Args('updateRecursoInput') updateRecursoInput: UpdateRecursoInput,
  ) {
    return this.recursoService.update(
      updateRecursoInput.id,
      updateRecursoInput,
    );
  }

  @Mutation(() => Recurso)
  removeRecurso(@Args('id', { type: () => String }) id: string) {
    return this.recursoService.remove(id);
  }
}
