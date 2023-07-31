export default [
  // before migration
  `
import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({})
export class ComponentOne {
  constructor(public readonly wololo: Foo) {
    wololo.subscribe();
  }
}

@Component({})
export class ComponentTwo {
  constructor(public host: Host) {}
}

@NgModule({
  imports: [CommonModule],
  declarations: [ComponentOne, ComponentTwo],
})
export class MyModule {}
`,

  // after migration
  `
import { Component, NgModule, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({})
export class ComponentOne {
  readonly wololo = inject(Foo);
  constructor() {
    wololo.subscribe();
  }
}

@Component({})
export class ComponentTwo {
  host = inject(Host);
  constructor() {}
}

@NgModule({
  imports: [CommonModule],
  declarations: [ComponentOne, ComponentTwo],
})
export class MyModule {}
`,
] as [string, string];
