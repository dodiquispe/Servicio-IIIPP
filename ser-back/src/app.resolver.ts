import { Query, Resolver } from '@nestjs/graphql';
import { Public } from './seguridad/auth/graphql-auth.decorator.js';

@Resolver()
export class AppResolver {
  @Query(() => String, { name: 'health' })
  @Public()
  health(): string {
    return 'ok';
  }
}
