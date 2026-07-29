import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type { Category } from '@ruleprod/contracts';

export function registerCategoryRoutes(app: FastifyInstance, pool: Pool): void {
  app.get('/api/categories', async () => {
    const result = await pool.query<Category>(
      'SELECT slug, name, subtitle, image FROM catalog.categories ORDER BY sort_order ASC',
    );
    return { categories: result.rows };
  });
}
