export const EventTypes = {
  // SALES → BILLING
  ORDER_CREATED: 'order.created',

  // BILLING → SHIPPING
  ORDER_BILLED: 'order.billed',
  PAYMENT_FAILED: 'payment.failed',

  // SHIPPING → SYSTEM
  SHIPPING_CREATED: 'shipping.created',
  SHIPPING_FAILED: 'shipping.failed',
  ORDER_COMPLETED: 'order.completed',

  // EXTERNAL DELIVERY
  DELIVERY_COMPLETED: 'delivery.completed',
};