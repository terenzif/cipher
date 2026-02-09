"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.appSchema = appSchema;
exports.columnName = columnName;
exports.tableName = tableName;
exports.tableSchema = tableSchema;
exports.validateColumnSchema = validateColumnSchema;
var _invariant = _interopRequireDefault(require("../utils/common/invariant"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// NOTE: Only require files needed (critical path on web)
/**
 * String that signifies a database table name (mapping to WatermelonDB Models)
 */
/**
 * String that signifies a database column name (mapping to WatermelonDB fields)
 */
/**
 * Type of a column
 */
/**
 * Definition of a table column
 */
/**
 * Creates a typed TableName
 */
function tableName(name) {
  return name;
}

/**
 * Creates a typed ColumnName
 */
function columnName(name) {
  return name;
}

/**
 * Creates a database schema object. Pass table definitions created using {@see tableSchema}
 */
function appSchema({
  version,
  tables: tableList,
  unsafeSql
}) {
  if (process.env.NODE_ENV !== 'production') {
    (0, _invariant.default)(version > 0, `Schema version must be greater than 0`);
  }
  const tables = tableList.reduce((map, table) => {
    if (process.env.NODE_ENV !== 'production') {
      (0, _invariant.default)(typeof table === 'object' && table.name, `Table schema must contain a name`);
    }
    map[table.name] = table;
    return map;
  }, {});
  return {
    version,
    tables,
    unsafeSql
  };
}
const validateName = name => {
  if (process.env.NODE_ENV !== 'production') {
    (0, _invariant.default)(!['id', '_changed', '_status', 'local_storage'].includes(name.toLowerCase()), `Invalid column or table name '${name}' - reserved by WatermelonDB`);
    const checkName = require('../utils/fp/checkName').default;
    checkName(name);
  }
};
function validateColumnSchema(column) {
  if (process.env.NODE_ENV !== 'production') {
    (0, _invariant.default)(column.name, `Missing column name`);
    validateName(column.name);
    (0, _invariant.default)(['string', 'boolean', 'number', 'json'].includes(column.type), `Invalid type ${column.type} for column '${column.name}' (valid: string, boolean, number, json)`);
    if (column.name === 'created_at' || column.name === 'updated_at') {
      (0, _invariant.default)(column.type === 'number' && !column.isOptional, `${column.name} must be of type number and not optional`);
    }
    if (column.name === 'last_modified') {
      (0, _invariant.default)(column.type === 'number', `For compatibility reasons, column last_modified must be of type 'number', and should be optional`);
    }
    // Validate generated columns
    if (column.isGenerated) {
      (0, _invariant.default)(column.generationSql && column.generationSql.trim(), `Generated column '${column.name}' is missing a generationSql expression`);
    }
  }
}

/**
 * Creates a typed TableSchema
 */
function tableSchema({
  name,
  columns: columnArray,
  unsafeSql,
  ftsConfig
}) {
  if (process.env.NODE_ENV !== 'production') {
    (0, _invariant.default)(name, `Missing table name in schema`);
    validateName(name);
  }
  const columns = columnArray.reduce((map, column) => {
    if (process.env.NODE_ENV !== 'production') {
      validateColumnSchema(column);
    }
    map[column.name] = column;
    return map;
  }, {});
  return {
    name,
    columns,
    columnArray,
    unsafeSql,
    ftsConfig
  };
}