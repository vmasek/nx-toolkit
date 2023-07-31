export default [
  // before migration
  `
import { Component } from '@angular/core';
  
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
import { Component, inject } from '@angular/core';

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
