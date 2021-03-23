import {
  CodeBlockWriter,
  OptionalKind,
  SourceFile,
  VariableDeclarationKind,
  VariableStatementStructure,
} from 'ts-morph';
import {
  AnyType,
  ArrayType,
  DictionaryType,
  LiteralType,
  NamedType,
  RecordType,
  RootType,
  UnionType,
} from './types_alt';

export function createRuntypes(file: SourceFile, ...roots: RootType[]): void {
  file.addVariableStatements(
    roots.map<OptionalKind<VariableStatementStructure>>((root) => {
      return {
        isExported: root.export,
        declarationKind: VariableDeclarationKind.Const,
        declarations: [
          { name: root.name, initializer: (w) => writeAnyType(w, root.type) },
        ],
      };
    }),
  );
}

// fixme: use mapped type so `node` is typed more narrowly maybe
const writers: Record<
  AnyType['kind'],
  (writer: CodeBlockWriter, node: AnyType) => void
> = {
  boolean: simpleWriter('rt.Boolean'),
  function: simpleWriter('rt.Function'),
  never: simpleWriter('rt.Never'),
  number: simpleWriter('rt.Number'),
  string: simpleWriter('rt.String'),
  unknown: simpleWriter('rt.Unknown'),
  void: simpleWriter('rt.Void'),
  array: writeArrayType,
  record: writeRecordType,
  union: writeUnionType,
  literal: writeLiteralType,
  named: writeNamedType,
  intersect: writeIntersectionType,
  dictionary: writeDictionaryType,
};

function simpleWriter(value: string): (writer: CodeBlockWriter) => void {
  return (writer) => writer.write(value);
}

function writeDictionaryType(w: CodeBlockWriter, node: DictionaryType) {
  w.write('rt.Dictionary(');
  writeAnyType(w, node.valueType);
  w.write(')');
}

function writeNamedType(w: CodeBlockWriter, node: NamedType) {
  w.write(node.name);
}

function writeAnyType(w: CodeBlockWriter, node: AnyType) {
  const writer = writers[node.kind];
  writer(w, node);
}

function writeLiteralType(w: CodeBlockWriter, node: LiteralType) {
  const { value } = node;
  w.write('rt.Literal(');
  if (value === undefined) {
    w.write('undefined');
  } else if (value === null) {
    w.write('null');
  } else if (typeof value === 'string') {
    w.write(`'${value}'`);
  } else {
    // It's a boolean or a number at this point.
    w.write(String(value));
  }
  w.write(')');
}

function writeArrayType(w: CodeBlockWriter, node: ArrayType) {
  w.write('rt.Array(');
  writeAnyType(w, node.type);
  w.write(')');
  w.conditionalWrite(node.readonly, '.asReadonly()');
}

function writeUnionType(w: CodeBlockWriter, node: UnionType) {
  w.writeLine('rt.Union(');
  for (const type of node.types) {
    writeAnyType(w, type);
    w.write(', ');
  }
  w.write(') ');
}

function writeIntersectionType(w: CodeBlockWriter, node: UnionType) {
  w.writeLine('rt.Intersect(');
  for (const type of node.types) {
    writeAnyType(w, type);
    w.write(', ');
  }
  w.write(') ');
}

function writeRecordType(w: CodeBlockWriter, node: RecordType) {
  w.writeLine('rt.Record({');
  for (const field of node.fields) {
    w.write(field.name);
    w.write(': ');
    writeAnyType(w, field.type);
    w.write(',');
  }
  w.write('})');
}
