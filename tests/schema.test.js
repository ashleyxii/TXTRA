import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTXTRA, toJsonWithSchema, txtra } from '../src/index.js';

test('toJsonWithSchema: オブジェクト・基本型（数値、真偽値、文字列）の型キャスト', () => {
  const source = `
User
  name: Alice
  age: 25
  score: 98.5
  isActive: true
  isBanned: false
`;

  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'integer' },
      score: { type: 'number' },
      isActive: { type: 'boolean' },
      isBanned: { type: 'boolean' }
    }
  };

  const json = toJsonWithSchema(source, schema);

  assert.deepEqual(json, {
    name: 'Alice',
    age: 25,
    score: 98.5,
    isActive: true,
    isBanned: false
  });
});

test('toJsonWithSchema: プリミティブ配列（インラインおよびリスト）のマッピング', () => {
  const source = `
Data
  tags: js    python    rust
  scores:
    - 10
    - 20
    - 30
`;

  const schema = {
    type: 'object',
    properties: {
      tags: {
        type: 'array',
        items: { type: 'string' }
      },
      scores: {
        type: 'array',
        items: { type: 'integer' }
      }
    }
  };

  const json = toJsonWithSchema(source, schema);

  assert.deepEqual(json, {
    tags: ['js', 'python', 'rust'],
    scores: [10, 20, 30]
  });
});

test('toJsonWithSchema: オブジェクト配列（Array of Objects）のマッピング', () => {
  const source = `
Company
  employees:
    - name: Bob
      role: Developer
      level: 3
    - name: Charlie
      role: Designer
      level: 2
`;

  const schema = {
    type: 'object',
    properties: {
      employees: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            role: { type: 'string' },
            level: { type: 'integer' }
          }
        }
      }
    }
  };

  const json = toJsonWithSchema(source, schema);

  assert.deepEqual(json, {
    employees: [
      { name: 'Bob', role: 'Developer', level: 3 },
      { name: 'Charlie', role: 'Designer', level: 2 }
    ]
  });
});

test('toJsonWithSchema: ネストしたオブジェクトのマッピング', () => {
  const source = `
Profile
  user:
    name: Eve
    details:
      city: Tokyo
      postal: 100
`;

  const schema = {
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          details: {
            type: 'object',
            properties: {
              city: { type: 'string' },
              postal: { type: 'integer' }
            }
          }
        }
      }
    }
  };

  const json = toJsonWithSchema(source, schema);

  assert.deepEqual(json, {
    user: {
      name: 'Eve',
      details: {
        city: 'Tokyo',
        postal: 100
      }
    }
  });
});

test('toJsonWithSchema: txtra ファサードとチェーン実行', () => {
  const source = `
title: TXTRA
stars: 100
`;
  const schema = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      stars: { type: 'integer' }
    }
  };

  // txtra(source).toJson(schema)
  const doc = txtra(source);
  assert.deepEqual(doc.toJson(schema), { title: 'TXTRA', stars: 100 });

  // txtra.toJson(source, schema)
  assert.deepEqual(txtra.toJson(source, schema), { title: 'TXTRA', stars: 100 });
});

test('toJsonWithSchema: デフォルト値および大文字小文字の寛容性 (caseInsensitive)', () => {
  const source = `
NAME: Alice
`;
  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      role: { type: 'string', default: 'guest' }
    }
  };

  const json = toJsonWithSchema(source, schema, { caseInsensitive: true });
  assert.deepEqual(json, {
    name: 'Alice',
    role: 'guest'
  });
});

test('toJsonWithSchema: トップレベルが array の場合', () => {
  const source = `
- name: Item1
  price: 100
- name: Item2
  price: 200
`;
  const schema = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        price: { type: 'integer' }
      }
    }
  };

  const json = toJsonWithSchema(source, schema);
  assert.deepEqual(json, [
    { name: 'Item1', price: 100 },
    { name: 'Item2', price: 200 }
  ]);
});
