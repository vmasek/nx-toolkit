export default [
  // before migration
  `
@Component({})
export class TestPseudoComponent {
  constructor(private foo: Foo, public bar: Bar) {
  }
}`,

  // after migration
  `
@Component({})
export class TestPseudoComponent {
  private foo = inject(Foo);
  public bar = inject(Bar);
  constructor() {}
}`,
] as [string, string];
