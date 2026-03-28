import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth      = inject(AuthService);
  const router    = inject(Router);
  const required  = route.data['permission'] as string | undefined;

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  if (required && !auth.hasPermission(required)) {
    return router.createUrlTree(['/unauthorized']);
  }

  return true;
};
