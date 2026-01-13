import type { FastifyInstance } from 'fastify';
import { createProduct } from './create-product';
import { deleteProduct } from './delete-product';
import { getProductBySlug } from './get-product-by-slug';
import { getProducts } from './get-products';
import { updateProduct } from './update-product';


export async function productRoutes(app: FastifyInstance) {
  await createProduct(app)
  await getProducts(app)
  await getProductBySlug(app)
  await updateProduct(app)
  await deleteProduct(app)
}