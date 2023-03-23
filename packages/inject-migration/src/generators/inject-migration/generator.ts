import {
  Tree,
  getProjects,
  visitNotIgnoredFiles,
  formatFiles,
} from '@nrwl/devkit';
import * as ts from 'typescript';
import { InjectMigrationGeneratorSchema } from './schema';

const SUPPORTED_MIGRATION_TARGETS = [
  'Component',
  'Directive',
  'Pipe',
  'Injectable',
];

export default async function (
  tree: Tree,
  schema: InjectMigrationGeneratorSchema
): Promise<void> {
  const projects = getProjects(tree);

  if (projects.size > 0) {
    for (const [name, project] of projects) {
      // TODO: rewrite to nicer prompt
      console.info(`Running migration for project ${name}`);

      visitNotIgnoredFiles(tree, project.root, fileVisitor(tree, schema));
    }
  } else {
    visitNotIgnoredFiles(tree, '.', fileVisitor(tree, schema));
  }

  await formatFiles(tree);
}

function fileVisitor(tree: Tree, schema: InjectMigrationGeneratorSchema) {
  return (filePath) => {
    if (!filePath.endsWith('.ts') || !filePath.includes(schema.name)) {
      return;
    }

    const fileContent = tree.read(filePath, 'utf8');
    if (!fileContent) {
      return;
    }

    const sourceFile = ts.createSourceFile(
      filePath,
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );

    const changes = getChanges(sourceFile.statements);

    const updatedFile = ts.factory.updateSourceFile(sourceFile, changes);
    const printer = ts.createPrinter();

    tree.write(filePath, printer.printFile(updatedFile));
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

function getChanges(
  statements: ts.NodeArray<ts.Statement>
): (ts.ClassDeclaration | ts.Statement)[] {
  return statements.map((statement) => {
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
        const newClassMembers = statement.members.flatMap((member) => {
          if (ts.isConstructorDeclaration(member)) {
            const newConstructor = ts.factory.updateConstructorDeclaration(
              member,
              member.modifiers,
              [],
              member.body
            );

            const newProperties = extractConstructorParamsProperties(member);

            return [...newProperties, newConstructor];
          }

          return member;
        });

        return ts.factory.updateClassDeclaration(
          statement,
          statement.modifiers,
          statement.name,
          statement.typeParameters,
          statement.heritageClauses,
          newClassMembers
        );
      }
    }

    return statement;
  });
}

function extractConstructorParamsProperties(
  constructor: ts.ConstructorDeclaration
): ts.PropertyDeclaration[] {
  return constructor.parameters.map((parameter) => {
    const { modifiers, isOptional } = parameter.modifiers.reduce(
      (acc, modifier) => {
        if (modifier.kind === ts.SyntaxKind.Decorator) {
          const decoratorName = getDecoratorName(modifier);
          if (decoratorName === 'Optional') {
            return { ...acc, isOptional: true };
          }
        }

        return { ...acc, modifiers: [...acc.modifiers, modifier] };
      },
      { modifiers: [], isOptional: false }
    );

    const initializer = ts.factory.createCallExpression(
      ts.factory.createIdentifier('inject'),
      [],
      [ts.factory.createIdentifier(parameter.type.getText())]
    );

    return ts.factory.createPropertyDeclaration(
      modifiers,
      parameter.name.getText(),
      isOptional
        ? ts.factory.createToken(ts.SyntaxKind.QuestionToken)
        : parameter.questionToken,
      undefined,
      initializer
    );
  });
}
