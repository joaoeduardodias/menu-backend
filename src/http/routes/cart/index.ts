import type { FastifyInstance } from 'fastify';
import { checkout } from './checkout';


export async function cartRoutes(app: FastifyInstance) {
  await checkout(app)

}