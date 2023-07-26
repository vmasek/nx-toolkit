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
    @Self()
    public foo: Foo,
  ) {}
}`,

  // after migration
  `
import { inject } from '@angular/core';
@Component({})
export class FormFieldComponent {
  private readonly container = inject(ControlContainer, {
    optional: true,
    host: true,
    skipSelf: true,
  });
  foo = inject(Foo, { self: true });
  constructor() {}
}`,
] as [string, string];
