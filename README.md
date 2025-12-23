# firebase-csv-import

[![CI](https://github.com/blackie365/firebase-csv-import/actions/workflows/ci.yml/badge.svg)](https://github.com/blackie365/firebase-csv-import/actions/workflows/ci.yml)

Tools for importing, exporting, and querying a Firestore `members` collection from CSV using Node.js, Express, and the Firebase Admin SDK. Includes a local API server, Firebase Cloud Functions entrypoint, and CLI-style scripts for one-off imports/exports.

## Features

- **Members API**: Express app exposing `/api/members` with filtering, search, pagination, and sorting.
- **CSV import**: Script to import a CSV file into a Firestore collection, adding a `searchName` field for efficient querying.
- **Collection export**: Script to export a Firestore collection to both JSON and CSV.
- **Jest tests**: Unit/integration tests that mock Firebase Admin (no real project access required).
- **Firebase Functions**: `functions/` directory with an HTTPS Cloud Function that wraps the `/api/members` endpoint for deployment.

## Requirements

- Node.js 18 or later
- npm (or another Node package manager)
- A Firebase project with a service account JSON key

This repository does **not** include any real service account keys. You must provide your own.

## Getting started

### 1. Clone and install dependencies

```bash
git clone git@github.com:blackie365/firebase-csv-import.git
cd firebase-csv-import
npm install
```

### 2. Provide Firebase credentials

For local development, create a service account key in the Firebase console and download the JSON file.

- Place it at the project root as `serviceAccountKey.json`, **or**
- Point to it via an environment variable when running scripts:

```bash
export FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/absolute/path/to/your-service-account.json
```

The local API in `src/api/app.js` uses `serviceAccountKey.json` by default and can be configured with `FIREBASE_DATABASE_URL` if you need a custom database URL.

## Running the local API

The entrypoint for the local API is `index.js`, which starts an Express server wrapping the members endpoint.

```bash
node index.js
```

By default it listens on `PORT` (environment variable) or `3000`.

Example request:

```bash
curl "http://localhost:3000/api/members?limit=20&offset=0&active=true&search=john&sortBy=joinDate&sortOrder=desc"
```

### Supported query parameters

The `/api/members` endpoint supports (depending on which version you deploy):

- `limit` (number, 1–100)
- `offset` (number, >= 0)
- `page` (number, >= 1, local API)
- `active` (boolean)
- `search` (string, matches `searchName` field)
- `sortBy` (`joinDate`, `lastName`, `firstName`, `email`)
- `sortOrder` (`asc` or `desc`)

Responses include a `members` array and a `pagination` object with `total`, `limit`, `offset`, and `hasMore` fields.

## Importing members from CSV

Use the generic import script under `src/scripts/import.js`.

```bash
node src/scripts/import.js path/to/members.csv members
```

- First argument: path to the CSV file (defaults to `members.csv`).
- Second argument: Firestore collection name (defaults to `members`).

The script:

- Reads and parses the CSV.
- Filters to records that have an avatar image and at least some profile text.
- Normalizes name/email fields and adds a `searchName` field.
- Writes the data to Firestore in batches.

You can point it at a custom service account JSON using the `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` environment variable.

## Exporting a collection to JSON/CSV

Use `src/scripts/exportFromFirebase.js` to export a collection:

```bash
node src/scripts/exportFromFirebase.js members
```

This will:

- Read all documents from the specified collection.
- Normalize timestamps and arrays into serializable values.
- Write two files at the project root:
  - `<collection>_export_<timestamp>.json`
  - `<collection>_export_<timestamp>.csv`

These export files are already ignored in `.gitignore` so they will not be committed to Git.

## Running tests

Tests are implemented with Jest and run entirely against mocked Firebase Admin APIs.

Common commands:

```bash
# Run the full test suite
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

The Jest configuration lives in `jest.config.js` and uses setup files under `test/` to configure mocks and custom matchers.

## Firebase Functions deployment

The `functions/` directory contains a Firebase Cloud Functions entrypoint that exposes the `/api/members` endpoint as an HTTPS function.

From the `functions/` directory you can run:

```bash
cd functions
npm install
npm run lint
# Deploy (requires Firebase CLI to be configured for your project)
npm run deploy
```

The Firebase configuration is controlled by `firebase.json` and `firestore.rules` in the project root.

## License

This project is licensed under the ISC License. See [LICENSE](./LICENSE) for details.
