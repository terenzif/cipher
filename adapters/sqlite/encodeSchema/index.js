"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.encodeCreateIndices = encodeCreateIndices;
exports.encodeDropIndices = encodeDropIndices;
exports.encodeSchema = exports.encodeMigrationSteps = void 0;
var _RawRecord = require("../../../RawRecord");
var _encodeValue = _interopRequireDefault(require("../encodeValue"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const standardColumns = `"id" primary key, "_changed", "_status"`;
const commonSchema = 'create table "local_storage" ("key" varchar(16) primary key not null, "value" text not null);' + 'create index "local_storage_key_index" on "local_storage" ("key");';
const encodeCreateTable = ({
  name,
  columns
}) => {
  const columnsSQL = [standardColumns].concat(Object.keys(columns).map(columnName => {
    const column = columns[columnName];
    if (column.isGenerated) {
      if (!column.generationSql || !column.generationSql.trim()) {
        throw new Error(`Generated column "${columnName}" on table "${name}" is missing a generationSql expression.`);
      }
      return `"${columnName}" GENERATED ALWAYS AS (${column.generationSql}) VIRTUAL`;
    }
    // Add TEXT type for json columns
    if (column.type === 'json') {
      return `"${columnName}" TEXT`;
    }
    return `"${columnName}"`;
  })).join(', ');
  return `create table "${name}" (${columnsSQL});`;
};
const encodeIndex = (column, tableName) => column.isIndexed ? `create index if not exists "${tableName}_${column.name}" on "${tableName}" ("${column.name}");` : '';
const encodeTableIndicies = ({
  name: tableName,
  columns
}) => Object.values(columns)
// $FlowFixMe
.map(column => encodeIndex(column, tableName)).concat([`create index if not exists "${tableName}__status" on "${tableName}" ("_status");`]).join('');
const identity = (sql, _) => sql;

/** FTS Full Text Search */

const encodeFTSTrigger = ({
  tableName,
  ftsTableName,
  event,
  action
}) => {
  const triggerName = `${ftsTableName}_${event}`;
  return `create trigger "${triggerName}" after ${event} on "${tableName}" begin ${action} end;`;
};
const encodeFTSDeleteTrigger = ({
  tableName,
  ftsTableName
}) => encodeFTSTrigger({
  tableName,
  ftsTableName,
  event: 'delete',
  action: `delete from "${ftsTableName}" where "rowid" = OLD.rowid;`
});
const encodeFTSInsertTrigger = ({
  tableName,
  ftsTableName,
  ftsColumns
}) => {
  const rawColumnNames = ['rowid', ...ftsColumns.map(column => column.name)];
  const columns = rawColumnNames.map(col => `"${col}"`);
  const valueColumns = rawColumnNames.map(column => `NEW."${column}"`);
  const columnsSQL = columns.join(', ');
  const valueColumnsSQL = valueColumns.join(', ');
  return encodeFTSTrigger({
    tableName,
    ftsTableName,
    event: 'insert',
    action: `insert into "${ftsTableName}" (${columnsSQL}) values (${valueColumnsSQL});`
  });
};
const encodeFTSUpdateTrigger = ({
  tableName,
  ftsTableName,
  ftsColumns
}) => {
  const rawColumnNames = ftsColumns.map(column => column.name);
  const assignments = rawColumnNames.map(column => `"${column}" = NEW."${column}"`);
  const assignmentsSQL = assignments.join(', ');
  return encodeFTSTrigger({
    tableName,
    ftsTableName,
    event: 'update',
    action: `update "${ftsTableName}" set ${assignmentsSQL} where "rowid" = NEW."rowid";`
  });
};
const encodeFTSTriggers = ({
  tableName,
  ftsTableName,
  ftsColumns
}) => {
  return encodeFTSDeleteTrigger({
    tableName,
    ftsTableName
  }) + encodeFTSInsertTrigger({
    tableName,
    ftsTableName,
    ftsColumns
  }) + encodeFTSUpdateTrigger({
    tableName,
    ftsTableName,
    ftsColumns
  });
};
const encodeFTSTable = ({
  ftsTableName,
  ftsColumns,
  ftsConfig
}) => {
  const columnsSQL = ftsColumns.map(column => `"${column.name}"`).join(', ');
  const tokenizer = !ftsConfig ? '' : ftsConfig.tokenizer;
  const isCaseSensitive = !ftsConfig ? false : ftsConfig.caseSensitive;
  const ftsInnerSQL = `${tokenizer || 'unicode61'}${isCaseSensitive ? ' case_sensitive 1' : ''}`;
  const ftsSQL = ftsConfig !== null && ftsConfig !== void 0 && ftsConfig.disabled ? '' : `, tokenize="${ftsInnerSQL}"`;
  return `create virtual table "${ftsTableName}" using fts5(${columnsSQL}${ftsSQL});`;
};
const encodeFTSSearch = tableSchema => {
  const {
    name: tableName,
    columnArray,
    ftsConfig
  } = tableSchema;
  const ftsColumns = columnArray.filter(column => column.isFTS);
  if (ftsColumns.length === 0) {
    return '';
  }
  const ftsTableName = `_fts_${tableName}`;
  return encodeFTSTable({
    ftsTableName,
    ftsColumns,
    ftsConfig
  }) + encodeFTSTriggers({
    tableName,
    ftsTableName,
    ftsColumns
  });
};

/** FTS END */

function encodeCreateIndices({
  tables,
  unsafeSql
}) {
  const sql = Object.values(tables)
  // $FlowFixMe
  .map(encodeTableIndicies).join('');
  return (unsafeSql || identity)(sql, 'create_indices');
}
function encodeDropIndices({
  tables,
  unsafeSql
}) {
  const sql = Object.values(tables)
  // $FlowFixMe
  .map(({
    name: tableName,
    columns
  }) => Object.values(columns)
  // $FlowFixMe
  .map(column => column.isIndexed ? `drop index if exists "${tableName}_${column.name}";` : '').concat([`drop index if exists "${tableName}__status";`]).join('')).join('');
  return (unsafeSql || identity)(sql, 'drop_indices');
}
const encodeAddColumnsMigrationStep = ({
  table,
  columns,
  unsafeSql
}) => columns.map(column => {
  if (column.isGenerated) {
    if (!column.generationSql || !column.generationSql.trim()) {
      throw new Error(`Generated column "${column.name}" on table "${table}" is missing a generationSql expression.`);
    }
    const addColumn = `alter table "${table}" add column "${column.name}" GENERATED ALWAYS AS (${column.generationSql}) VIRTUAL;`;
    const addIndex = encodeIndex(column, table);
    return (unsafeSql || identity)(addColumn + addIndex);
  }

  // Add TEXT type for json columns in migrations
  const columnType = column.type === 'json' ? ' TEXT' : '';
  const addColumn = `alter table "${table}" add "${column.name}"${columnType};`;
  const setDefaultValue = `update "${table}" set "${column.name}" = ${(0, _encodeValue.default)((0, _RawRecord.nullValue)(column))};`;
  const addIndex = encodeIndex(column, table);
  return (unsafeSql || identity)(addColumn + setDefaultValue + addIndex);
}).join('');
const encodeTable = table => (table.unsafeSql || identity)(encodeCreateTable(table) + encodeTableIndicies(table) + encodeFTSSearch(table));
const encodeSchema = ({
  tables,
  unsafeSql
}) => {
  const sql = Object.values(tables)
  // $FlowFixMe
  .map(encodeTable).join('');
  return (unsafeSql || identity)(commonSchema + sql, 'setup');
};
exports.encodeSchema = encodeSchema;
const encodeMigrationSteps = steps => steps.map(step => {
  if (step.type === 'create_table') {
    return encodeTable(step.schema);
  } else if (step.type === 'add_columns') {
    return encodeAddColumnsMigrationStep(step);
  } else if (step.type === 'sql') {
    return step.sql;
  }
  throw new Error(`Unsupported migration step ${step.type}`);
}).join('');
exports.encodeMigrationSteps = encodeMigrationSteps;