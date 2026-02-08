# WatermelonDB with Document DB Support (JSON/CBOR) & FTS

This fork of WatermelonDB adds powerful Document DB capabilities, including first-class JSON support, Full Text Search (FTS), and Indexing on JSON paths. It also includes SQLite Encryption (SQLCipher).

## Document DB Features

### JSON Support

You can now define columns as `type: 'json'`. This allows you to store arbitrary JSON documents, which are stored as `TEXT` in SQLite but handled intelligently by the ORM.

```javascript
// schema.js
import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const mySchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'posts',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'body', type: 'string' },
        { name: 'metadata', type: 'json' }, // Store arbitrary JSON
      ]
    }),
  ]
})
```

### Using `@json` Decorator

In your Model definition, use the `@json` decorator to automatically parse and stringify JSON data.

```javascript
// Post.js
import { Model } from '@nozbe/watermelondb'
import { field, json } from '@nozbe/watermelondb/decorators'

export default class Post extends Model {
  static table = 'posts'

  @field('title') title
  @field('body') body
  @json('metadata') metadata // Automatically parses JSON on get, stringifies on set
}
```

Usage:

```javascript
const post = await database.get('posts').create(post => {
  post.title = 'Hello World'
  post.metadata = { tags: ['news', 'tech'], author: { name: 'John', id: 123 } }
})

console.log(post.metadata.author.name) // "John"
```

### Indexing JSON Paths & Generated Columns

To query or index specific fields deeply nested within a JSON document, you can use **Generated Columns**. This feature leverages SQLite's ability to extract data from JSON and expose it as a virtual column, which can then be indexed.

```javascript
tableSchema({
  name: 'posts',
  columns: [
    { name: 'metadata', type: 'json' },
    // Create a virtual column extracting 'author.id' from metadata
    {
      name: 'author_id',
      type: 'string',
      isGenerated: true,
      generationSql: "json_extract(metadata, '$.author.id')",
      isIndexed: true // Index this virtual column for fast lookups!
    }
  ]
})
```

Now you can query `author_id` like a normal column, and it will be fast!

```javascript
const posts = await database.get('posts').query(
  Q.where('author_id', '123')
).fetch()
```

### Foreign Keys on JSON Fields

You can use Generated Columns to create Foreign Key relationships based on data inside your JSON documents.

1. Create a generated column for the FK (as above).
2. (Optional) Use `unsafeSql` to enforce a strict Foreign Key constraint at the DB level.

```javascript
tableSchema({
  name: 'comments',
  columns: [
    { name: 'payload', type: 'json' },
    {
      name: 'post_id',
      type: 'string',
      isGenerated: true,
      generationSql: "json_extract(payload, '$.post_id')",
      isIndexed: true
    }
  ],
  unsafeSql: sql => sql.replace(
    'create table "comments" (',
    'create table "comments" (foreign key ("post_id") references "posts" ("id"), '
  )
})
```

In your Model, you can define the relation normally:

```javascript
export default class Comment extends Model {
  @relation('posts', 'post_id') post
}
```

## Full Text Search (FTS)

WatermelonDB supports FTS. You can index JSON content or specific fields.

```javascript
tableSchema({
  name: 'documents',
  columns: [
    { name: 'content', type: 'json' },
    { name: 'text_content', type: 'string', isGenerated: true, generationSql: "json_extract(content, '$.text')", isFTS: true }
  ]
})
```

## CBOR Support

While JSON is the recommended format for queryability, you can store CBOR (Concise Binary Object Representation) data using `type: 'string'` (if base64 encoded) or by creating a custom column type if needed. Note that SQLite's native JSON functions will not work on CBOR blobs directly. We recommend transcoding to JSON for storage if you need database-level indexing, or storing CBOR as opaque blobs if you only process them in JavaScript.

## Development & Testing

This repo includes scripts for testing and building.

- `npm test`: Run the test suite (Jest).
- `npm run build`: Build the source code.
- `npm run lint`: Lint the codebase.

## Installation

```bash
npm install @nozbe/watermelondb
```

Follow the standard WatermelonDB installation instructions for iOS/Android native setup.
