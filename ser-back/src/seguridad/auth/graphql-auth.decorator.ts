import { SetMetadata } from '@nestjs/common';

export const PUBLIC_ROUTE_KEY = 'isPublic';
export const REQUIRED_ROLES_KEY = 'requiredRoles';

export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);
export const Roles = (...roles: string[]) =>
  SetMetadata(REQUIRED_ROLES_KEY, roles);
