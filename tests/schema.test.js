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

test('toJsonWithSchema: スカラー値付きキーから自動昇格したノードのマッピング (_ と子プロパティ)', () => {
  const source = `
key: value
  childKey: childVal
`;
  const schema = {
    type: 'object',
    properties: {
      key: {
        type: 'object',
        properties: {
          _: { type: 'string' },
          childKey: { type: 'string' }
        }
      }
    }
  };

  const json = toJsonWithSchema(source, schema);
  assert.deepEqual(json, {
    key: {
      _: 'value',
      childKey: 'childVal'
    }
  });
});

test('toJsonWithSchema: ノード内の文字列を string または string 配列として抽出するマッピング', () => {
  // 1. スカラー昇格ノードから単一文字列 (string) を抽出:
  //    子プロパティ (childKey) は混入せず、ノード自身の文字列 ("value") が取得できる
  const source1 = `
key: value
  childKey: childVal
`;
  const schemaString = {
    type: 'object',
    properties: {
      key: { type: 'string' }
    }
  };
  assert.deepEqual(toJsonWithSchema(source1, schemaString), {
    key: 'value'
  });

  // 2. スカラー昇格ノードから文字列配列 (array of string) を抽出:
  //    子プロパティ (childVal) は混入せず、ノード自身の値配列 (["value"]) が取得できる
  const schemaArray = {
    type: 'object',
    properties: {
      key: {
        type: 'array',
        items: { type: 'string' }
      }
    }
  };
  assert.deepEqual(toJsonWithSchema(source1, schemaArray), {
    key: ['value']
  });

  // 3. インライン配列を持つ昇格ノード (key: val1    val2 \n  childKey: childVal)
  const source2 = `
key: val1    val2
  childKey: childVal
`;
  assert.deepEqual(toJsonWithSchema(source2, schemaString), {
    key: 'val1    val2'
  });
  assert.deepEqual(toJsonWithSchema(source2, schemaArray), {
    key: ['val1', 'val2']
  });

  // 4. 複数行テキストコンテナ (description:\n  Line 1\n  Line 2)
  const source3 = `
description:
  Line 1
  Line 2
`;
  assert.deepEqual(toJsonWithSchema(source3, {
    type: 'object',
    properties: {
      description: { type: 'string' }
    }
  }), {
    description: 'Line 1\nLine 2'
  });
  assert.deepEqual(toJsonWithSchema(source3, {
    type: 'object',
    properties: {
      description: {
        type: 'array',
        items: { type: 'string' }
      }
    }
  }), {
    description: ['Line 1', 'Line 2']
  });

  // 5. 数値型 (number) の昇格ノード
  const source4 = `
score: 98.5
  verified: true
`;
  assert.deepEqual(toJsonWithSchema(source4, {
    type: 'object',
    properties: {
      score: { type: 'number' }
    }
  }), {
    score: 98.5
  });
});


