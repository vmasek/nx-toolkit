export default [
  // before migration
  `
@Component({})
export class TestPseudoComponent {
  constructor(public foo: Foo, private bar: Bar) {
  }
}`,

  // after migration
  `
@Component({})
export class TestPseudoComponent {
  foo = inject(Foo);
  private bar = inject(Bar);
  constructor() {}
}`,
] as [string, string];
