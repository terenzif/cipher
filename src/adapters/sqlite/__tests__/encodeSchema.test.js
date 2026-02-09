import { appSchema, tableSchema } from '../../../../Schema'
import { encodeSchema, encodeMigrationSteps } from '../encodeSchema'

describe('encodeSchema with JSON and Generated Columns', () => {
  it('encodes JSON columns with TEXT type in SQLite', () => {
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
    expect(sql).toContain('create table "posts" ("id" primary key, "_changed", "_status", "data" TEXT);')
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

  it('encodes indexed generated columns correctly', () => {
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
              isIndexed: true,
              generationSql: "json_extract(data, '$.author_id')"
            },
          ],
        }),
      ],
    })
    const sql = encodeSchema(schema)
    expect(sql).toContain('"author_id" GENERATED ALWAYS AS (json_extract(data, \'$.author_id\')) VIRTUAL')
    expect(sql).toContain('create index if not exists "posts_author_id" on "posts" ("author_id");')
  })

  it('encodes migrations with generated columns', () => {
    const steps = [
      {
        type: 'add_columns',
        table: 'posts',
        columns: [
          {
            name: 'author_id',
            type: 'string',
            isGenerated: true,
            generationSql: "json_extract(data, '$.author_id')"
          },
        ],
      },
    ]
    const sql = encodeMigrationSteps(steps)
    expect(sql).toContain('alter table "posts" add column "author_id" GENERATED ALWAYS AS (json_extract(data, \'$.author_id\')) VIRTUAL;')
  })

  it('encodes migrations with indexed generated columns', () => {
    const steps = [
      {
        type: 'add_columns',
        table: 'posts',
        columns: [
          {
            name: 'author_id',
            type: 'string',
            isGenerated: true,
            isIndexed: true,
            generationSql: "json_extract(data, '$.author_id')"
          },
        ],
      },
    ]
    const sql = encodeMigrationSteps(steps)
    expect(sql).toContain('alter table "posts" add column "author_id" GENERATED ALWAYS AS (json_extract(data, \'$.author_id\')) VIRTUAL;')
    expect(sql).toContain('create index if not exists "posts_author_id" on "posts" ("author_id");')
  })

  it('encodes migrations with json columns', () => {
    const steps = [
      {
        type: 'add_columns',
        table: 'posts',
        columns: [
          {
            name: 'metadata',
            type: 'json',
            isOptional: true,
          },
        ],
      },
    ]
    const sql = encodeMigrationSteps(steps)
    expect(sql).toContain('alter table "posts" add "metadata" TEXT;')
  })

  it('throws error for generated columns without generationSql in schema validation', () => {
    expect(() => {
      appSchema({
        version: 1,
        tables: [
          tableSchema({
            name: 'posts',
            columns: [
              {
                name: 'author_id',
                type: 'string',
                isGenerated: true,
                // Missing generationSql
              },
            ],
          }),
        ],
      })
    }).toThrow('missing a generationSql expression')
  })
})
