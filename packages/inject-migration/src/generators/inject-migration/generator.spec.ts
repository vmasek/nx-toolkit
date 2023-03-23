import { createTree } from '@nrwl/devkit/testing';
import { formatFiles, Tree } from '@nrwl/devkit';
import migration from './generator';
import { join } from 'path';
import { expect } from '@jest/globals';
import SIMPLE_COMPONENT from './files/simple.component.mock';
import INJECT_DECORATOR_COMPONENT from './files/inject-decorator.component.mock';
import OPTIONAL_DECORATOR_COMPONENT from './files/optional-decorator.component.mock';

describe('migrate constructor parameters to class properties', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTree();
  });

  it('should migrate simple component', async () =>
    compareFileMigration(tree, SIMPLE_COMPONENT));

  it('should migrate optional decorated parameter', async () =>
    compareFileMigration(tree, OPTIONAL_DECORATOR_COMPONENT));

  it('should migrate inject decorated parameter', async () =>
    compareFileMigration(tree, INJECT_DECORATOR_COMPONENT));
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
    name: 'file-to-transform.ts',
  });

  // Check that the constructor parameters were migrated to class properties
  expect(tree.read(mockFilePath)?.toString()).toMatchWithDiff(expected);
}
