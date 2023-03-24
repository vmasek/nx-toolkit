export default [
  // before migration
  `
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
