import {
  formatFiles,
  getProjects,
  Tree,
  visitNotIgnoredFiles,
} from '@nx/devkit';
import { prompt } from 'enquirer';
import * as ts from 'typescript';
import { InjectMigrationGeneratorSchema } from './schema';
import { escapeNewLines, lowerCaseFirstLetter, restoreNewLines } from './utils';

const SUPPORTED_MIGRATION_TARGETS = [
  'Component',
  'Directive',
  'Pipe',
  'Injectable',
];
const ALL_TARGETS_CHOICE = '* (all)';

export default async function (
  tree: Tree,
  options: InjectMigrationGeneratorSchema
): Promise<void> {
  const projects = getProjects(tree);

  const selectedTargets: string[] = (
    options.targets
      ? options
      : await prompt([
          {
            type: 'multiselect',
            name: 'targets',
            message: 'Select the targets or libraries you want to target:',
            choices: [ALL_TARGETS_CHOICE, ...projects.keys()],
            required: true,
          },
        ])
  )['targets'];

  if (!selectedTargets?.length) {
    console.info('Migration is terminated as no target was selected.');
    return;
  }

  if (
    selectedTargets.find(
      (target) => target === '*' || target === ALL_TARGETS_CHOICE
    )
  ) {
    console.info(`Running migration for all available targets.`);
    visitNotIgnoredFiles(tree, '.', fileVisitor(tree));
  } else {
    for (const [name, project] of projects) {
      if (!selectedTargets.includes(name)) {
        continue;
      }

      console.info(`Running migration for target ${name}`);
      visitNotIgnoredFiles(tree, project.root, fileVisitor(tree));
    }
  }

  await formatFiles(tree);
}

function transformConstructorBodyNonThisAccessorParamUsages(
  context: ts.TransformationContext
) {
  return (sourceFile: ts.SourceFile) => {
    function visit(node: ts.Node): ts.Node {
      // If the node is a constructor declaration
      if (ts.isConstructorDeclaration(node)) {
        // Extract the public or private parameters from the constructor
        const paramsToReplace = node.parameters
          .filter(
            (param) =>
              ts.isParameter(param) &&
              (param.modifiers?.some(
                (mod) => mod.kind === ts.SyntaxKind.PublicKeyword
              ) ||
                param.modifiers?.some(
                  (mod) => mod.kind === ts.SyntaxKind.PrivateKeyword
                ))
          )
          .map((param) => param.name.getText(sourceFile));

        // If there are no public or private parameters, no need to modify the constructor
        if (paramsToReplace.length === 0) {
          return node;
        }

        // Function to replace the identifier nodes in the constructor body
        const replaceIdentifiers = (node: ts.Node): ts.Node => {
          if (
            ts.isIdentifier(node) &&
            paramsToReplace.includes(node.getText(sourceFile))
          ) {
            const parent = node.parent;
            if (
              ts.isPropertyAccessExpression(parent) &&
              parent.expression.kind === ts.SyntaxKind.ThisKeyword
            ) {
              // The identifier is already prefixed with 'this.', so no need to replace it.
              return node;
            }

            return ts.factory.createPropertyAccessExpression(
              ts.factory.createThis(),
              node
            );
          }
          return ts.visitEachChild(node, replaceIdentifiers, context);
        };

        // Replace the identifiers in the constructor body
        const updatedBody = ts.visitNodes(
          node.body?.statements,
          replaceIdentifiers
        ) as unknown as ts.Statement[];

        // Create a new constructor node with the updated body
        return ts.factory.updateConstructorDeclaration(
          node,
          node.modifiers,
          node.parameters,
          ts.factory.updateBlock(node.body, updatedBody)
        );
      }
      return ts.visitEachChild(node, visit, context);
    }

    return ts.visitNode(sourceFile, visit);
  };
}

function transformConstructorBodyAccessors(sourceFile: ts.SourceFile): string {
  const result = ts.transform(sourceFile, [
    transformConstructorBodyNonThisAccessorParamUsages,
  ]);
  const printer = ts.createPrinter({
    removeComments: false,
    omitTrailingSemicolon: false,
  });
  const transformedCode = printer.printNode(
    ts.EmitHint.Unspecified,
    result.transformed[0],
    sourceFile
  );
  result.dispose();
  return transformedCode;
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

    const sourceFileBeforeBodyThisTransform = ts.createSourceFile(
      filePath,
      escapeNewLines(fileContent),
      ts.ScriptTarget.Latest,
      true
    );

    const sourceFile = ts.createSourceFile(
      filePath,
      transformConstructorBodyAccessors(sourceFileBeforeBodyThisTransform),
      ts.ScriptTarget.Latest,
      true
    );

    const changes = getChanges(sourceFile.statements);

    if (changes.length > 0) {
      const updatedFile = ts.factory.updateSourceFile(sourceFile, changes);
      const printer = ts.createPrinter({
        removeComments: false,
        omitTrailingSemicolon: false,
      });

      tree.write(
        filePath,
        restoreNewLines(
          printer.printNode(ts.EmitHint.Unspecified, updatedFile, sourceFile)
        )
      );
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
  const hasBody = body?.getText().replace(/\s/, '') !== '{}';

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
    .map((parameter: ts.ParameterDeclaration) => {
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

      const isTypeGenerics = ts.isTypeReferenceNode(parameter.type)
        ? parameter.type.typeArguments?.length > 0
        : false;

      const injectedName =
        injectTokenIdentifierName ||
        (ts.isTypeReferenceNode(parameter.type)
          ? parameter.type.typeName.getText()
          : parameter.type.getText());

      const initializer = ts.factory.createCallExpression(
        ts.factory.createIdentifier('inject'),
        isTypeGenerics ? [parameter.type] : [],
        [
          ts.factory.createIdentifier(injectedName),
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
