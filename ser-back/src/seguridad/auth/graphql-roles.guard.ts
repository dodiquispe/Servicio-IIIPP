import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuthenticatedRequest } from './graphql-auth.guard.js';
import {
  PUBLIC_ROUTE_KEY,
  REQUIRED_ROLES_KEY,
} from './graphql-auth.decorator.js';

@Injectable()
export class GraphqlRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType<string>() !== 'graphql') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic) return true;
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) return true;

    const gqlContext = GqlExecutionContext.create(context).getContext<{
      req: AuthenticatedRequest;
    }>();
    const roles = gqlContext.req.user?.roles ?? [];
    if (!hasRequiredRole(roles, requiredRoles)) {
      throw new ForbiddenException('No tiene permiso para esta operación');
    }
    return true;
  }
}

export function hasRequiredRole(roles: string[], requiredRoles: string[]): boolean {
  return roles.some((role) => requiredRoles.some((required) => normalize(role) === normalize(required)));
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}
