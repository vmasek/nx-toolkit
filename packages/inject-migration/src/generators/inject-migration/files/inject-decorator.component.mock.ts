export default [
  // before migration
  `
import { Translation } from 'i18n';
import { Component, Inject } from '@angular/core';

@Component({})
export class TestPseudoComponent {
  constructor(
    @Inject(TRANSLATION_TEXTS)
    public readonly lang: Translation
  ) {}
}`,
  // after migration
  `
import { Translation } from 'i18n';
import { Component, Inject, inject } from '@angular/core';

@Component({})
export class TestPseudoComponent {
  readonly lang: Translation = inject(TRANSLATION_TEXTS);
  constructor() {}
}`,
] as [string, string];
