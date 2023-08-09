export default [
  // before migration
  `
// this class should not be touched by inject migration
// even all spaces and wrong indent should be spared any formatting
export class TestClass {
  wololo = 42;




  constructor(public foo: Foo, private bar: Bar) 
  {
                    bar.serve(foo);
  }

}`,

  // after migration
  `
// this class should not be touched by inject migration
// even all spaces and wrong indent should be spared any formatting
export class TestClass {
  wololo = 42;




  constructor(public foo: Foo, private bar: Bar) 
  {
                    bar.serve(foo);
  }

}`,
] as [string, string];
