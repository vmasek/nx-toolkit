export default [
  // before migration
  `
import { Component } from '@angular/core';

@Component({})
export class TestPseudoComponent {
  constructor(public foo: Foo, private bar: Bar) {
  }
}`,

  // after migration
  `
import { Component, inject } from '@angular/core';

@Component({})
export class TestPseudoComponent {
  foo = inject(Foo);
  private bar = inject(Bar);
  constructor() {}
}`,
] as [string, string];
