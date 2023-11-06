export default [
  // before migration
  `
import { a, inject, b } from '@angular/core';

@Component({})
export class ComponentTwo {
  _host: Document | null = null;

  constructor(
    private readonly wololo: Wololo,
    public foo: Foo,
    host: Document,
  ) {
    this._host = host;
    wololo.x();
    foo = { bar: foo };

    if (this.foo) {
      foo.bar = foo.bar + 2;
    }

    console.log(wololo, this.foo);
  }
}
`,

  // after migration
  `
import { a, inject, b } from '@angular/core';

@Component({})
export class ComponentTwo {
  private readonly wololo = inject(Wololo);
  foo = inject(Foo);
  _host: Document | null = null;

  constructor(host: Document) {
    this._host = host;
    this.wololo.x();
    this.foo = { bar: this.foo };

    if (this.foo) {
      this.foo.bar = this.foo.bar + 2;
    }

    console.log(this.wololo, this.foo);
  }
}
`,
] as [string, string];
