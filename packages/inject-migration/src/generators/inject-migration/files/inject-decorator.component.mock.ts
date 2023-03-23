export default [
  // before migration
  `
@Component({})
export class TestPseudoComponent {
  constructor(
    @Inject(TRANSLATION_TEXTS)
    public readonly lang: Translation
  ) {}
}`,
  // after migration
  `
@Component({})
export class TestPseudoComponent {
  readonly lang: Translation = inject(TRANSLATION_TEXTS);
  constructor() {}
}`,
] as [string, string];
