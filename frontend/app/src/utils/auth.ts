export interface User {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  profileImage?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  roles: Array<{ name: string }>;
}

export const hasRole = (user: User | null, role: string): boolean => {
  if (!user || !user.roles) return false;
  return user.roles.some(userRole => userRole.name === role);
};

export const hasAnyRole = (user: User | null, roles: string[]): boolean => {
  if (!user || !user.roles) return false;
  return user.roles.some(userRole => roles.includes(userRole.name));
};

export const isAdmin = (user: User | null): boolean => {
  return hasRole(user, 'ADMIN');
};

export const isCustomer = (user: User | null): boolean => {
  return hasRole(user, 'CUSTOMER');
};

export const isDeliveryMan = (user: User | null): boolean => {
  return hasRole(user, 'DELIVERY_MAN');
};

export const getDefaultRoute = (user: User | null): string => {
  if (isAdmin(user)) {
    return '/';
  } else  {
    return '/customer-profile';
  } 
}; 