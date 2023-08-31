export default [
  // before migration
  `
import { Component } from '@angular/core';
import { Store } from '@state-management';

interface MyState {
  foo: number;
}

@Component({})
export class TestPseudoComponent {
  constructor(public foo: Store<MyState>) {
  }
}`,

  // after migration
  `
import { Component, inject } from '@angular/core';
import { Store } from '@state-management';

interface MyState {
  foo: number;
}

@Component({})
export class TestPseudoComponent {
  foo: Store<MyState> = inject(Store);
}`,
] as [string, string];
