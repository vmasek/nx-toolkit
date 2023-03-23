export default [
  // before migration
  `
abstract class MyClass {
  protected constructor(bar: Bar) {}
}
@Component({})
export class TestPseudoComponent extends MyClass {
  constructor(public foo: Foo, private bar: Bar) {
    super(bar);
  }
}`,

  // after migration
  `
abstract class MyClass {
  protected constructor(bar: Bar) {}
}
@Component({})
export class TestPseudoComponent extends MyClass {
  foo = inject(Foo);
  private bar = inject(Bar);
  constructor() {
    super(bar);
  }
}`,
] as [string, string];
