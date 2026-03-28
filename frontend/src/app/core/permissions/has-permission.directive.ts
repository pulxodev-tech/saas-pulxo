import {
  Directive,
  Input,
  OnInit,
  TemplateRef,
  ViewContainerRef,
  inject,
} from '@angular/core';
import { AuthService } from '../auth/auth.service';

/**
 * Usage:
 *   <button *hasPermission="'users.create'">Crear usuario</button>
 *   <div *hasPermission="'campaigns.send'; else noAccess">...</div>
 */
@Directive({
  selector: '[hasPermission]',
  standalone: true,
})
export class HasPermissionDirective implements OnInit {
  private auth    = inject(AuthService);
  private tpl     = inject(TemplateRef);
  private vcr     = inject(ViewContainerRef);

  @Input('hasPermission')       permission = '';
  @Input('hasPermissionElse')   elseTpl?: TemplateRef<unknown>;

  ngOnInit(): void {
    if (this.auth.hasPermission(this.permission)) {
      this.vcr.createEmbeddedView(this.tpl);
    } else if (this.elseTpl) {
      this.vcr.createEmbeddedView(this.elseTpl);
    }
  }
}
