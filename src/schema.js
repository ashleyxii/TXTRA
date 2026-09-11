/**
 * @file schema.js
 * TXTRA AST またはソーステキストを JSON Schema に基づき確定形 JSON オブジェクトへマッピングするモジュール。
 * 型推論・型キャスト、オブジェクト/配列の構造決定、LLM耐性のある寛容なバインディングを提供します。
 */

import { parseTXTRA } from './ast.js';

/**
 * プリミティブ値を JSON Schema の型定義に従って安全にキャストする。
 * @param {any} val - 入力値
 * @param {object} schema - 対象プロパティのスキーマ
 * @returns {any} キャスト後の値
 */
function castPrimitive(val, schema = {}) {
  if (val == null) {
    return schema.default !== undefined ? schema.default : null;
  }

  const type = schema.type || 'string';

  switch (type) {
    case 'integer': {
      const s = String(val).trim();
      const n = parseInt(s, 10);
      return Number.isNaN(n) ? (schema.default !== undefined ? schema.default : 0) : n;
    }
    case 'number': {
      const s = String(val).trim();
      const n = parseFloat(s);
      return Number.isNaN(n) ? (schema.default !== undefined ? schema.default : 0) : n;
    }
    case 'boolean': {
      if (typeof val === 'boolean') return val;
      const s = String(val).trim().toLowerCase();
      if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true;
      if (s === 'false' || s === '0' || s === 'no' || s === 'off') return false;
      return Boolean(val);
    }
    case 'null':
      return null;
    case 'string':
    default:
      return String(val);
  }
}

/**
 * ノードが子ノード配列（コンテナ）を持つかどうかを判定する。
 * @param {object} node - AST ノード
 * @returns {boolean}
 */
function isContainerNode(node) {
  return Boolean(
    node &&
    Array.isArray(node.data) &&
    node.data.length > 0 &&
    typeof node.data[0] === 'object' &&
    node.data[0] !== null
  );
}

/**
 * ノードから直接のテキスト文字列配列を取り出す。
 * @param {object} node - AST ノード
 * @returns {string[]}
 */
function getPrimitiveValues(node) {
  if (!node || !Array.isArray(node.data)) return [];
  return node.data.filter(v => typeof v !== 'object').map(String);
}

/**
 * リストの1アイテム（ヘッドプロパティ＋子プロパティ群）からオブジェクトのプロパティノード群を展開する。
 * （例: `- name: Bob \n role: Dev` のヘッドと子プロパティを並列なプロパティノード群として抽出）
 * @param {object} item - リストアイテム AST ノード
 * @returns {Array<object>}
 */
function extractPropertiesFromItem(item) {
  if (!item || typeof item !== 'object') return [];
  const props = [];

  if (Array.isArray(item.data)) {
    const primitives = [];
    const children = [];
    for (const child of item.data) {
      if (child && typeof child === 'object') {
        children.push(child);
      } else if (child !== undefined) {
        primitives.push(child);
      }
    }

    if (item.node && !item.node.startsWith('_')) {
      props.push({ node: item.node, data: primitives });
    }
    props.push(...children);
  } else if (item.node && !item.node.startsWith('_')) {
    props.push(item);
  }

  return props;
}

/**
 * ノード群からキー名にマッチする子ノードを探す。
 * @param {Array<object>} nodes - AST ノード配列
 * @param {string} key - プロパティキー
 * @param {boolean} caseInsensitive - 大文字小文字を無視するか
 * @returns {object|undefined}
 */
function findNodeByKey(nodes, key, caseInsensitive) {
  if (!Array.isArray(nodes)) return undefined;
  if (!caseInsensitive) {
    return nodes.find(n => n.node === key);
  }
  const lowerKey = key.toLowerCase();
  return nodes.find(n => n.node && n.node.toLowerCase() === lowerKey);
}

/**
 * ノードを JSON Schema の配列（array）型としてマッピングする。
 * @param {object|Array<object>} sourceNode - 対象ノードまたはノード配列
 * @param {object} schema - array スキーマ
 * @param {object} options - オプション
 * @returns {Array}
 */
function mapArray(sourceNode, schema = {}, options = {}) {
  const itemSchema = schema.items || {};
  const isObjectItem = itemSchema.type === 'object';

  // 1. ノードリストそのものが渡された場合
  if (Array.isArray(sourceNode)) {
    if (isObjectItem) {
      return sourceNode.map(item => {
        const props = extractPropertiesFromItem(item);
        return mapObject(props, itemSchema, options);
      });
    }
    return sourceNode.flatMap(node => {
      if (isContainerNode(node)) {
        return mapArray(node.data, schema, options);
      }
      return getPrimitiveValues(node).map(v => castPrimitive(v, itemSchema));
    });
  }

  if (!sourceNode) return schema.default || [];

  // 2. 単一ノードの場合
  if (isObjectItem) {
    if (isContainerNode(sourceNode)) {
      // コンテナの子要素群をリスト要素としてマッピング
      return mapArray(sourceNode.data, schema, options);
    }
    return [mapObject(extractPropertiesFromItem(sourceNode), itemSchema, options)];
  }

  // プリミティブ配列の場合
  if (isContainerNode(sourceNode)) {
    return sourceNode.data.flatMap(child => {
      return getPrimitiveValues(child).map(v => castPrimitive(v, itemSchema));
    });
  }

  const values = getPrimitiveValues(sourceNode);
  if (values.length > 0) {
    return values.map(v => castPrimitive(v, itemSchema));
  }

  return schema.default || [];
}

/**
 * ノード群を JSON Schema のオブジェクト（object）型としてマッピングする。
 * @param {Array<object>} nodes - AST ノード配列
 * @param {object} schema - object スキーマ
 * @param {object} options - オプション
 * @returns {object}
 */
function mapObject(nodes, schema = {}, options = {}) {
  const properties = schema.properties || {};
  const caseInsensitive = options.caseInsensitive !== false;
  const result = {};

  for (const [propKey, propSchema] of Object.entries(properties)) {
    const matchedNode = findNodeByKey(nodes, propKey, caseInsensitive);

    if (matchedNode) {
      const propType = propSchema.type;
      if (propType === 'object') {
        const childNodes = isContainerNode(matchedNode) ? matchedNode.data : [matchedNode];
        result[propKey] = mapObject(childNodes, propSchema, options);
      } else if (propType === 'array') {
        result[propKey] = mapArray(matchedNode, propSchema, options);
      } else {
        const values = getPrimitiveValues(matchedNode);
        const rawVal = values.length > 0 ? values[0] : matchedNode.data?.[0];
        result[propKey] = castPrimitive(rawVal, propSchema);
      }
    } else if (propSchema.default !== undefined) {
      result[propKey] = propSchema.default;
    }
  }

  // additionalProperties が明示的に true の場合、スキーマ外のキーも追加
  if (options.additionalProperties === true && Array.isArray(nodes)) {
    for (const node of nodes) {
      if (!node || !node.node || node.node.startsWith('_')) continue;
      const matched = findNodeByKey(Object.keys(properties).map(k => ({ node: k })), node.node, caseInsensitive);
      if (!matched) {
        if (isContainerNode(node)) {
          result[node.node] = node.data;
        } else {
          result[node.node] = (node.data && node.data.length === 1) ? node.data[0] : node.data;
        }
      }
    }
  }

  return result;
}

/**
 * TXTRA テキストまたは AST を JSON Schema に当てはめて JSON オブジェクトへ変換する。
 * @param {string|Array<object>} sourceOrAst - TXTRA ソース文字列または AST
 * @param {object} schema - JSON Schema 定義
 * @param {object} [options] - オプション
 * @param {boolean} [options.caseInsensitive=true] - キー名の大文字小文字を同一視するか
 * @param {boolean} [options.unwrapRoot=true] - 単一の親コンテナが存在する場合に自動アンラップするか
 * @param {boolean} [options.additionalProperties=false] - スキーマにないプロパティを含めるか
 * @returns {object|Array} 生成された JSON データ
 */
export function toJsonWithSchema(sourceOrAst, schema = {}, options = {}) {
  const ast = typeof sourceOrAst === 'string' ? parseTXTRA(sourceOrAst) : (sourceOrAst || []);
  const rootType = schema.type || 'object';
  const unwrapRoot = options.unwrapRoot !== false;

  // トップレベルが array の場合
  if (rootType === 'array') {
    if (unwrapRoot && ast.length === 1 && isContainerNode(ast[0])) {
      return mapArray(ast[0].data, schema, options);
    }
    return mapArray(ast, schema, options);
  }

  // トップレベルが object の場合
  let targetNodes = ast;
  if (unwrapRoot && ast.length === 1 && isContainerNode(ast[0])) {
    const singleNode = ast[0];
    const properties = schema.properties || {};
    const caseInsensitive = options.caseInsensitive !== false;
    const isDirectMatch = findNodeByKey(
      Object.keys(properties).map(k => ({ node: k })),
      singleNode.node,
      caseInsensitive
    );
    // スキーマのプロパティ名と単一トップノード名が直接マッチしない場合はアンラップ
    if (!isDirectMatch) {
      targetNodes = singleNode.data;
    }
  }

  return mapObject(targetNodes, schema, options);
}

export default toJsonWithSchema;
