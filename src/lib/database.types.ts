// Tipos del proyecto Supabase PLASTIMASCOTAS (tablas y funciones de `public`).
// Escritos a mano a partir de supabase/migrations: si cambias el esquema, actualízalos.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update = Partial<Insert>> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };

export type SettingsRow = {
  id: number;
  name: string;
  claim: string;
  whatsapp: string;
  phones: string[];
  address: string;
  city: string;
  hours: Json | null;
  payment_methods: string[];
  delivery_note: string;
  instagram: string;
  facebook: string;
  low_stock_threshold: number;
  ordering_enabled: boolean;
  updated_at: string;
};
export type CategoryRow = {
  id: number;
  slug: string;
  name: string;
  icon: string;
  description: string | null;
  sort: number;
  active: boolean;
};
export type BrandRow = { id: number; name: string; sort: number; active: boolean };
export type ProductRow = {
  id: number;
  slug: string;
  category_id: number;
  brand_id: number | null;
  name: string;
  description: string | null;
  tag: string | null;
  photo_url: string | null;
  pets: string[];
  featured: boolean;
  is_sample: boolean;
  sort: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};
export type VariantRow = {
  id: number;
  product_id: number;
  label: string;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  wholesale_price: number | null;
  wholesale_min: number | null;
  stock: number;
  track_stock: boolean;
  sort: number;
  active: boolean;
};
export type AdminRow = { created_at: string; email: string; user_id: string };
export type OrderRow = {
  id: string;
  code: string;
  access_token: string;
  created_at: string;
  status: string;
  status_changed_at: string;
  stock_applied: boolean;
  customer_signal: string | null;
  customer_signal_at: string | null;
  customer_name: string;
  customer_phone: string | null;
  mode: string;
  address: string | null;
  barrio: string | null;
  reference: string | null;
  payment: string;
  cash_with: number | null;
  note: string | null;
  items_count: number;
  subtotal: number;
  savings: number;
  delivery_fee: number | null;
  total: number;
  cancel_reason: string | null;
  admin_note: string | null;
};
export type OrderItemRow = {
  id: number;
  order_id: string;
  product_id: number | null;
  variant_id: number | null;
  product_name: string;
  brand_name: string;
  category_name: string;
  variant_label: string;
  unit_price: number;
  list_price: number;
  wholesale: boolean;
  qty: number;
  line_total: number;
};
export type StockMovementRow = {
  id: number;
  variant_id: number;
  delta: number;
  stock_after: number;
  reason: string;
  order_id: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

type Opt<T> = { [K in keyof T]?: T[K] };

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' };
  public: {
    Tables: {
      settings: Table<SettingsRow, Opt<SettingsRow>>;
      categories: Table<CategoryRow, Omit<Opt<CategoryRow>, 'id'> & Pick<CategoryRow, 'slug' | 'name'>>;
      brands: Table<BrandRow, Omit<Opt<BrandRow>, 'id'> & Pick<BrandRow, 'name'>>;
      products: Table<ProductRow, Omit<Opt<ProductRow>, 'id'> & Pick<ProductRow, 'slug' | 'name' | 'category_id'>>;
      product_variants: Table<VariantRow, Omit<Opt<VariantRow>, 'id'> & Pick<VariantRow, 'product_id' | 'price'>>;
      admins: Table<AdminRow, AdminRow>;
      orders: Table<OrderRow, Opt<OrderRow>>;
      order_items: Table<OrderItemRow, Opt<OrderItemRow>>;
      stock_movements: Table<StockMovementRow, Opt<StockMovementRow>>;
    };
    Views: { [_ in never]: never };
    Functions: {
      create_order: { Args: { p: Json }; Returns: Json };
      track_orders: {
        Args: { p_orders: Json };
        Returns: {
          id: string;
          code: string;
          status: string;
          status_changed_at: string;
          created_at: string;
          total: number;
          delivery_fee: number | null;
          customer_signal: string | null;
        }[];
      };
      customer_signal: { Args: { p_id: string; p_token: string; p_signal: string }; Returns: string };
      adjust_stock: { Args: { p_variant_id: number; p_delta: number; p_reason: string; p_note?: string }; Returns: number };
      admin_setup_needed: { Args: never; Returns: boolean };
      claim_first_admin: { Args: never; Returns: boolean };
      add_admin: { Args: { p_email: string }; Returns: boolean };
      admin_metrics: { Args: { p_from: string; p_to: string }; Returns: Json };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
