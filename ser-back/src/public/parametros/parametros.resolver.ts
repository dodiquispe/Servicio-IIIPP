import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { ParametrosService } from './parametros.service.js';
import { Parametro } from './entities/parametro.entity.js';
import { CreateParametroInput } from './dto/create-parametro.input.js';
import { UpdateParametroInput } from './dto/update-parametro.input.js';
import { Public, Roles } from '../../seguridad/auth/graphql-auth.decorator.js';

@Resolver(() => Parametro)
@Roles('administrador', 'coordinador')
export class ParametrosResolver {
  constructor(private readonly parametrosService: ParametrosService) {}

  @Mutation(() => Parametro)
  createParametro(
    @Args('createParametroInput') createParametroInput: CreateParametroInput,
  ) {
    return this.parametrosService.create(createParametroInput);
  }

  @Query(() => [Parametro], { name: 'parametros' })
  @Public()
  findAll() {
    return this.parametrosService.findAll();
  }

  @Query(() => [Parametro], { name: 'parametrosByTipo' })
  @Public()
  findAllByTipo(@Args('tipo', { type: () => String }) tipo: string) {
    return this.parametrosService.findAllByTipo(tipo);
  }

  @Query(() => Parametro, { name: 'parametro' })
  findOne(@Args('id', { type: () => Int }) id: number) {
    return this.parametrosService.findOne(id);
  }

  @Mutation(() => Parametro)
  updateParametro(
    @Args('updateParametroInput') updateParametroInput: UpdateParametroInput,
  ) {
    return this.parametrosService.update(
      updateParametroInput.id,
      updateParametroInput,
    );
  }

  @Mutation(() => Parametro)
  removeParametro(@Args('id', { type: () => Int }) id: number) {
    return this.parametrosService.remove(id);
  }
}
