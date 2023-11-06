import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { formatFiles, Tree } from '@nx/devkit';
import migration from './generator';
import { join } from 'path';
import { expect } from '@jest/globals';
import SIMPLE_COMPONENT from './files/simple.component.mock';
import INJECT_DECORATOR_COMPONENT from './files/inject-decorator.component.mock';
import TYPE_GENERICS from './files/type-generics.component.mock';
import OPTIONAL_DECORATOR_COMPONENT from './files/optional-decorator.component.mock';
import CLASS_EXTEND_COMPONENT from './files/class-extend.component.mock';
import MODULE_AND_COMPONENT from './files/module-and-components.mock';
import EXPRESSION_COMPONENT from './files/expression-component.mock';
import COMPLEX_SERVICE from './files/complex.service.mock';
import LOGIC_WITHOIUT_PARAMS from './files/logic-without-params-component.mock';
// import KEEP_COMMENTS from './files/keep-comments.component.mock';

describe('migrate constructor parameters to class properties', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('should migrate simple component', async () =>
    compareFileMigration(tree, SIMPLE_COMPONENT));

  it('should migrate optional decorated parameter', async () =>
    compareFileMigration(tree, OPTIONAL_DECORATOR_COMPONENT));

  it('should migrate inject decorated parameter', async () =>
    compareFileMigration(tree, INJECT_DECORATOR_COMPONENT));

  it('should migrate state the type with generics correctly ', async () =>
    compareFileMigration(tree, TYPE_GENERICS));

  it('should migrate component extending the class', async () =>
    compareFileMigration(tree, CLASS_EXTEND_COMPONENT));

  it('should migrate file holding components and module', async () =>
    compareFileMigration(tree, MODULE_AND_COMPONENT));

  it('should skip params without modifiers used for property assignment in constructor', async () =>
    compareFileMigration(tree, EXPRESSION_COMPONENT));

  it('should migrate complex service', async () =>
    compareFileMigration(tree, COMPLEX_SERVICE));

  it('should skip touching constructor as it has just logic and no params', async () =>
    compareFileMigration(tree, LOGIC_WITHOIUT_PARAMS));

  // it('should keep comments related to params and the constructor that includes a comment', async () =>
  //   compareFileMigration(tree, KEEP_COMMENTS));
});

async function compareFileMigration(
  tree: Tree,
  [before, expected]: [string, string],
  sourceRoot = 'src'
): Promise<void> {
  const mockFileName = 'file-to-transform.ts';
  const mockFilePath = join(sourceRoot, mockFileName);
  // Create a test file with a class that has constructor parameters
  tree.write(mockFilePath, before);
  await formatFiles(tree);

  // Run the generator to migrate the constructor parameters to class properties
  await migration(tree, {
    targets: ['*'],
  });

  // Check that the constructor parameters were migrated to class properties
  expect(tree.read(mockFilePath)?.toString()).toMatchWithDiff(expected);
}
