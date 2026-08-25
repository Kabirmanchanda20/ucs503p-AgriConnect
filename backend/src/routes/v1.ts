import { Router } from 'express';
import { sendSuccess } from '../common/response.js';
import { adminRouter } from '../modules/admin/admin.routes.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { listingsRouter } from '../modules/listings/listings.routes.js';
import { notificationsRouter } from '../modules/notifications/notifications.routes.js';
import { ordersRouter } from '../modules/orders/orders.routes.js';
import { reportsRouter } from '../modules/reports/reports.routes.js';
import { usersRouter } from '../modules/users/users.routes.js';

export const apiV1Router = Router();

apiV1Router.get('/', (_request, response) => {
  sendSuccess(response, {
    name: 'AgriConnect API',
    version: 'v1',
  });
});

apiV1Router.use('/auth', authRouter);
apiV1Router.use('/users', usersRouter);
apiV1Router.use('/listings', listingsRouter);
apiV1Router.use('/orders', ordersRouter);
apiV1Router.use('/notifications', notificationsRouter);
apiV1Router.use('/reports', reportsRouter);
apiV1Router.use('/admin', adminRouter);
