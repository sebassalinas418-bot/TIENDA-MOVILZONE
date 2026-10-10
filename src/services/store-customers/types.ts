export type StoreCustomerPublic = {
  id: string;
  email: string;
  name: string;
  alias: string;
  phone: string;
  addressLine: string;
  addressCity: string;
  addressZip: string;
  verified: boolean;
  createdAt: string;
};

export type StoreCustomerOrderItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type StoreCustomerOrder = {
  id: string;
  createdAt: string;
  status: string;
  statusLabel: string;
  total: number;
  itemCount: number;
  items: StoreCustomerOrderItem[];
};
