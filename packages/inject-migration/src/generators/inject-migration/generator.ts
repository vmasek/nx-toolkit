import {
  Tree,
  getProjects,
  visitNotIgnoredFiles,
  formatFiles,
} from '@nrwl/devkit';
import * as ts from 'typescript';
import { InjectMigrationGeneratorSchema } from './schema';
import { escapeNewLines, lowerCaseFirstLetter, restoreNewLines } from './utils';

const SUPPORTED_MIGRATION_TARGETS = [
  'Component',
  'Directive',
  'Pipe',
  'Injectable',
];

export default async function (
  tree: Tree,
  { projectName }: InjectMigrationGeneratorSchema
): Promise<void> {
  const projects = getProjects(tree);

  if (projects.size > 0) {
    for (const [name, project] of projects) {
      if (projectName && projectName !== name) {
        return;
      }
      // TODO: rewrite to nicer prompt
      console.info(`Running migration for project ${name}`);

      visitNotIgnoredFiles(tree, project.root, fileVisitor(tree));
    }
  } else {
    visitNotIgnoredFiles(tree, '.', fileVisitor(tree));
  }

  await formatFiles(tree);
}

function fileVisitor(tree: Tree) {
  return (filePath: string) => {
    if (!filePath.endsWith('.ts')) {
      return;
    }

    const fileContent = tree.read(filePath, 'utf8');
    if (!fileContent) {
      return;
    }

    const sourceFile = ts.createSourceFile(
      filePath,
      escapeNewLines(fileContent),
      ts.ScriptTarget.Latest,
      true
    );

    const changes = getChanges(sourceFile.statements);

    console.log('~~ ', filePath, changes.length);
    if (changes.length > 0) {
      const updatedFile = ts.factory.updateSourceFile(sourceFile, changes);
      const printer = ts.createPrinter();

      tree.write(filePath, restoreNewLines(printer.printFile(updatedFile)));
    }
  };
}

function getDecoratorName({ expression }: ts.Decorator): string | undefined {
  if (
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression)
  ) {
    return expression.expression.getText();
  }
}
function getDecoratorArguments({
  expression,
}: ts.Decorator): ts.NodeArray<ts.Expression> {
  if (
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression)
  ) {
    return expression.arguments;
  }
}

function isConstructorEmpty({ body, parameters }: ts.ConstructorDeclaration) {
  const hasParameters = parameters.length > 0;
  const hasBody = body?.getText().trim() !== '{}';

  return !hasParameters && !hasBody;
}

function getChanges(
  statements: ts.NodeArray<ts.Statement>
): (ts.ClassDeclaration | ts.Statement)[] {
  let shouldPerformChanges = false;

  const changes = statements.map((statement) => {
    if (
      statement.kind === ts.SyntaxKind.ClassDeclaration &&
      ts.canHaveDecorators(statement)
    ) {
      const decorators = ts.getDecorators(statement);
      const isSupportedClass = decorators?.some((decorator) => {
        const decoratorName = getDecoratorName(decorator);
        return SUPPORTED_MIGRATION_TARGETS.includes(decoratorName);
      });

      if (isSupportedClass) {
        const newClassMembers = statement.members.reduce<ts.ClassElement[]>(
          (acc, member) => {
            if (ts.isConstructorDeclaration(member)) {
              const newConstructor = ts.factory.updateConstructorDeclaration(
                member,
                member.modifiers,
                member.parameters.filter(
                  ({ modifiers }) =>
                    !modifiers?.some(
                      (modifier) =>
                        modifier.kind === ts.SyntaxKind.PublicKeyword ||
                        modifier.kind === ts.SyntaxKind.PrivateKeyword
                    )
                ),
                member.body
              );

              const newProperties = extractConstructorParamsProperties(member);

              if (newProperties.length === 0) {
                shouldPerformChanges = false;
                return [...acc, member];
              }

              shouldPerformChanges = true;

              if (isConstructorEmpty(newConstructor)) {
                return [...newProperties, ...acc];
              }

              return [...newProperties, ...acc, newConstructor];
            }

            return [...acc, member];
          },
          []
        );

        return shouldPerformChanges
          ? ts.factory.updateClassDeclaration(
              statement,
              statement.modifiers,
              statement.name,
              statement.typeParameters,
              statement.heritageClauses,
              newClassMembers
            )
          : statement;
      }
    }

    return statement;
  });

  console.log('~~ ', { shouldPerformChanges });

  if (shouldPerformChanges) {
    return addInjectImport(changes);
  }
  return [];
}

function isImportModule(
  statement: ts.Statement,
  module: string
): statement is ts.ImportDeclaration {
  if (ts.isImportDeclaration(statement)) {
    if (
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === module
    ) {
      return true;
    }
  }

  return false;
}

function addInjectImport(changes: ts.Statement[]): ts.Statement[] {
  const existingImportIndex = changes.findIndex((statement) =>
    isImportModule(statement, '@angular/core')
  );
  const angularCoreModuleImport = changes[
    existingImportIndex
  ] as ts.ImportDeclaration;

  if (angularCoreModuleImport) {
    if (
      !angularCoreModuleImport.importClause.namedBindings
        .getText()
        .includes('inject')
    ) {
      const updatedImport = ts.factory.updateImportDeclaration(
        angularCoreModuleImport,
        angularCoreModuleImport.modifiers,
        ts.factory.updateImportClause(
          angularCoreModuleImport.importClause,
          false,
          undefined,
          ts.factory.createNamedImports([
            ...(ts.isNamedImports(
              angularCoreModuleImport.importClause.namedBindings
            )
              ? angularCoreModuleImport.importClause.namedBindings.elements
              : []),
            ts.factory.createImportSpecifier(
              false,
              undefined,
              ts.factory.createIdentifier('inject')
            ),
          ])
        ),
        angularCoreModuleImport.moduleSpecifier,
        angularCoreModuleImport.assertClause
      );

      if (existingImportIndex !== -1) {
        changes[existingImportIndex] = updatedImport;
      }

      return changes;
    }
  } else {
    const newImport = ts.factory.createImportDeclaration(
      undefined,
      ts.factory.createImportClause(
        false,
        undefined,
        ts.factory.createNamedImports([
          ts.factory.createImportSpecifier(
            false,
            undefined,
            ts.factory.createIdentifier('inject')
          ),
        ])
      ),
      ts.factory.createStringLiteral('@angular/core')
    );
    return [newImport, ...changes];
  }

  return changes;
}

function extractConstructorParamsProperties({
  parameters,
}: ts.ConstructorDeclaration): ts.PropertyDeclaration[] {
  return parameters
    .filter((parameter) => parameter.modifiers?.length)
    .map((parameter) => {
      const { modifiers, optionsProperties, injectTokenIdentifierName } =
        parameter.modifiers.reduce<{
          modifiers: ts.NodeArray<ts.ModifierLike>;
          injectTokenIdentifierName?: string;
          optionsProperties: ts.PropertyAssignment[];
        }>(
          (acc, modifier) => {
            if (modifier.kind === ts.SyntaxKind.Decorator) {
              const decoratorName = getDecoratorName(modifier);
              if (
                ['Optional', 'Self', 'SkipSelf', 'Host'].includes(decoratorName)
              ) {
                // transform these decorators to inject options
                return {
                  ...acc,
                  optionsProperties: [
                    ...acc.optionsProperties,
                    ts.factory.createPropertyAssignment(
                      lowerCaseFirstLetter(decoratorName),
                      ts.factory.createTrue()
                    ),
                  ],
                };
              } else if (decoratorName === 'Inject') {
                // safe the identifier name for inject token
                return {
                  ...acc,
                  injectTokenIdentifierName:
                    getDecoratorArguments(modifier)[0].getText(),
                };
              }
            }

            if (modifier.kind === ts.SyntaxKind.PublicKeyword) {
              // if parameter is marked as public, continue without keeping it as it is default for class properties
              return acc;
            }

            return {
              ...acc,
              modifiers: [
                ...acc.modifiers,
                modifier,
              ] as unknown as ts.NodeArray<ts.ModifierLike>,
            };
          },
          {
            modifiers: [] as unknown as ts.NodeArray<ts.ModifierLike>,
            optionsProperties: [] as unknown as ts.PropertyAssignment[],
            injectTokenIdentifierName: undefined,
          }
        );

      const initializer = ts.factory.createCallExpression(
        ts.factory.createIdentifier('inject'),
        [],
        [
          ts.factory.createIdentifier(
            injectTokenIdentifierName || parameter.type.getText()
          ),
          ...(optionsProperties.length
            ? [ts.factory.createObjectLiteralExpression(optionsProperties)]
            : []),
        ]
      );

      return ts.factory.createPropertyDeclaration(
        modifiers,
        parameter.name.getText(),
        parameter.questionToken,
        undefined,
        initializer
      );
    });
}
