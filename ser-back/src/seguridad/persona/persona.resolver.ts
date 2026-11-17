import {
  Resolver,
  Query,
  Mutation,
  Args,
  Int,
  Field,
  ObjectType,
  Context,
} from '@nestjs/graphql';
import { PersonaService } from './persona.service.js';
import { Persona } from './entities/persona.entity.js';
import { CreatePersonaInput } from './dto/create-persona.input.js';
import { UpdatePersonaInput } from './dto/update-persona.input.js';
import { CreatePacienteInput } from './dto/create-paciente.input.js';
import type { AuthenticatedRequest } from '../auth/graphql-auth.guard.js';
import { PersonaArgs, PersonaOrderArgs } from './args/persona.args.js';
import { Public, Roles } from '../auth/graphql-auth.decorator.js';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ObjectType()
class PersonaReservable {
  @Field()
  id: string;

  @Field()
  nombres: string;

  @Field(() => String, { nullable: true })
  primer_apellido: string | null;

  @Field(() => String, { nullable: true })
  segundo_apellido: string | null;

  @Field()
  esPaciente: boolean;
}

@ObjectType()
class PersonasPage {
  @Field(() => [Persona])
  rows: Persona[];

  @Field(() => Int)
  count: number;
}

@Resolver(() => Persona)
@Roles('responsable', 'administrador', 'coordinador')
export class PersonaResolver {
  constructor(
    private readonly personaService: PersonaService,
    @InjectDataSource('services')
    private readonly dataSource: DataSource,
  ) {}

  @Mutation(() => Persona)
  @Roles('administrador')
  createPaciente(
    @Args('input') input: CreatePacienteInput,
    @Context() context: { req: AuthenticatedRequest },
  ) {
    return this.personaService.createPaciente(input, context.req.user!.sub);
  }

  @Mutation(() => Persona)
  @Public()
  admisionInicial(@Args('input') input: CreatePersonaInput) { return this.personaService.admisionInicial(input); }

  @Mutation(() => Persona)
  @Public()
  createPersona(@Args('createPersonaInput') createPersonaInput: CreatePersonaInput) {
    return this.personaService.create(createPersonaInput);
  }

  @Query(() => PersonaReservable, { nullable: true })
  @Public()
  async personaPorCarnet(
    @Args('nro_documento') nroDocumento: string,
  ): Promise<PersonaReservable | null> {
    const person = await this.personaService.findOneByCarnet(nroDocumento);
    if (!person) return null;
    const [patientStatus] = await this.dataSource.query(
      `SELECT EXISTS (
        SELECT 1
        FROM serviciosiiipp.expediente
        WHERE id_persona = $1 AND deleted_at IS NULL
      ) AS "esPaciente"`,
      [person.id],
    ) as [{ esPaciente: boolean }];
    return {
      id: person.id,
      nombres: person.nombres,
      primer_apellido: person.primer_apellido ?? null,
      segundo_apellido: person.segundo_apellido ?? null,
      esPaciente: patientStatus.esPaciente,
    };
  }

  @Query(() => PersonasPage, { name: 'personas' })
  findAll(
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('pagina', { type: () => Int, defaultValue: 1 }) pagina: number,
    @Args('search', { type: () => PersonaArgs, nullable: true })
    search?: PersonaArgs,
    @Args('order', { type: () => PersonaOrderArgs, nullable: true })
    order?: PersonaOrderArgs,
  ) {
    return this.personaService.findAll(limit, pagina, search, order);
  }

  @Query(() => Persona, { name: 'persona' })
  findOne(@Args('id', { type: () => String }) id: string) {
    return this.personaService.findOne(id);
  }

  @Mutation(() => Persona)
  updatePersona(@Args('updatePersonaInput') updatePersonaInput: UpdatePersonaInput) {
    return this.personaService.update(updatePersonaInput.id, updatePersonaInput);
  }

  @Mutation(() => Persona)
  removePersona(@Args('id', { type: () => String }) id: string) {
    return this.personaService.remove(id);
  }
}
