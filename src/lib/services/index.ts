// Service Layer Exports

export * from './base.service';
export * from './customer.service';
export * from './inquiry.service';
export * from './order.service';
export * from './product.service';
export * from './types';
export * from './user.service';

// Service instances (can be used for dependency injection)
export { CustomerService } from './customer.service';
export { InquiryService } from './inquiry.service';
export { OrderService } from './order.service';
export { ProductService } from './product.service';
export { UserService } from './user.service';
