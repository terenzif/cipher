import { appSchema, tableSchema } from '../../../../Schema'
import { encodeSchema } from '../encodeSchema'

describe('encodeSchema with JSON and Generated Columns', () => {
  it('encodes JSON columns as normal columns (TEXT in SQLite)', () => {
    const schema = appSchema({
      version: 1,
      tables: [
        tableSchema({
          name: 'posts',
          columns: [
            { name: 'data', type: 'json' },
          ],
        }),
      ],
    })
    const sql = encodeSchema(schema)
    expect(sql).toContain('create table "posts" ("id" primary key, "_changed", "_status", "data");')
  })

  it('encodes Generated Columns correctly', () => {
    const schema = appSchema({
      version: 1,
      tables: [
        tableSchema({
          name: 'posts',
          columns: [
            { name: 'data', type: 'json' },
            {
              name: 'author_id',
              type: 'string',
              isGenerated: true,
              generationSql: "json_extract(data, '$.author_id')"
            },
          ],
        }),
      ],
    })
    const sql = encodeSchema(schema)
    // The expected SQL depends on implementation details (newlines, etc), but generally:
    // "author_id" GENERATED ALWAYS AS (json_extract(data, '$.author_id')) VIRTUAL
    expect(sql).toContain('"author_id" GENERATED ALWAYS AS (json_extract(data, \'$.author_id\')) VIRTUAL')
  })
})
