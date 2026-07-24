/**********************************************************************
 * Copyright (C) 2026 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/

import { createServer } from 'node:http';
import { URL } from 'node:url';
import { Pool } from 'pg';

const port = Number(process.env.PORT ?? 3000);
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://grocery:grocery@db:5432/grocery',
});

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function readJsonBody(req: import('node:http').IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function waitForDatabase(maxAttempts = 30): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch {
      await wait(1000);
    }
  }
  throw new Error('Database did not become ready in time');
}

async function init(): Promise<void> {
  await waitForDatabase();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS grocery_items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL
    )
  `);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM grocery_items');
  if (rows[0].count === 0) {
    await pool.query(`
      INSERT INTO grocery_items(name, quantity)
      VALUES ('Milk', 1), ('Bread', 2), ('Tomatoes', 4)
    `);
  }
}

init()
  .then(() => {
    const server = createServer(async (req, res) => {
      const reqUrl = new URL(req.url ?? '/', 'http://localhost');
      const allowedOrigins = new Set(['http://localhost:8080', 'http://127.0.0.1:8080']);
      const origin = req.headers.origin;
      const isAllowedOrigin = typeof origin === 'string' && allowedOrigins.has(origin);

      if (isAllowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      }

      if (req.method === 'OPTIONS') {
        res.writeHead(isAllowedOrigin ? 204 : 403);
        res.end();
        return;
      }

      if (req.method === 'GET' && reqUrl.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      if (req.method === 'GET' && reqUrl.pathname === '/api/items') {
        try {
          const { rows } = await pool.query('SELECT id, name, quantity FROM grocery_items ORDER BY id');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(rows));
        } catch {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to load items' }));
        }
        return;
      }

      if (req.method === 'POST' && reqUrl.pathname === '/api/items') {
        try {
          const body = (await readJsonBody(req)) as { name?: unknown; quantity?: unknown };
          const name = String(body.name ?? '').trim();
          const quantity = Number(body.quantity ?? 1);

          if (!name || !Number.isInteger(quantity) || quantity < 1) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'name and positive integer quantity are required' }));
            return;
          }

          const { rows } = await pool.query(
            'INSERT INTO grocery_items(name, quantity) VALUES ($1, $2) RETURNING id, name, quantity',
            [name, quantity],
          );
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(rows[0]));
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid request body' }));
        }
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    server.listen(port, () => {
      console.log(`API started on ${port}`);
    });
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
