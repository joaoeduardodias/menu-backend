import type { FastifyInstance } from 'fastify';
import { createOrder } from './create-order';
import { deleteOrder } from './delete-order';
import { getOrdersByCustomer } from './get-order-by-customer';
import { getOrderById } from './get-order-by-id';
import { getOrders } from './get-orders';
import { updateOrder } from './update-order';



export async function ordersRoutes(app: FastifyInstance) {
  await createOrder(app)
  await updateOrder(app)
  await deleteOrder(app)
  await getOrderById(app)
  await getOrdersByCustomer(app)
  await getOrders(app)
}
