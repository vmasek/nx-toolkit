export default [
  // before migration
  `
@Component({})
export class FormFieldComponent {
  constructor(
    @Optional()
    @Host()
    @SkipSelf()
    private readonly container: ControlContainer,
  ) {}
}`,

  // after migration
  `
import { inject } from '@angular/core';
@Component({})
export class FormFieldComponent {
  @Host()
  @SkipSelf()
  private readonly container? = inject(ControlContainer);
  constructor() {}
}`,
] as [string, string];
