import type { FastifyInstance } from 'fastify';
import { createProduct } from './create-product';
import { deleteProduct } from './delete-product';
import { getProduct } from './get-product-by-slug';
import { listProducts } from './get-products';
import { updateProduct } from './update-product';


export async function productRoutes(app: FastifyInstance) {
  await createProduct(app)
  await listProducts(app)
  await getProduct(app)
  await updateProduct(app)
  await deleteProduct(app)
}