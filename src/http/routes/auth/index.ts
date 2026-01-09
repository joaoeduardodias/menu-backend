import type { FastifyInstance } from 'fastify';
import { authenticateWithGoogle } from './authenticate-with-google';
import { authenticateWithPassword } from './authenticate-with-password';
import { createUser } from './create-user';
import { getProfile } from './get-profile';
import { getUsers } from './get-users';
import { requestPasswordRecover } from './request-password-recover';
import { resetPassword } from './reset-password';
import { updateUser } from './update-user';


export async function authRoutes(app: FastifyInstance) {
  await createUser(app)
  await getProfile(app)
  await getUsers(app)
  await updateUser(app)
  await resetPassword(app)
  await requestPasswordRecover(app)
  await authenticateWithGoogle(app)
  await authenticateWithPassword(app)

}