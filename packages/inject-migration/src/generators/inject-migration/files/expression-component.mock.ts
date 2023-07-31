export default [
  // before migration
  `
import { a, inject, b } from '@angular/core';

@Component({})
export class ComponentTwo {
  _host: Host = null;

  constructor(
    private wololo: Wololo,
    host: Host,
  ) {
    this._host = host;
  }
}
`,

  // after migration
  `
import { a, inject, b } from '@angular/core';

@Component({})
export class ComponentTwo {
  _host: Host = null;
  private wololo = inject(Wololo);

  constructor(host: Host) {
    this._host = host;
  }
}
`,
] as [string, string];
