/**
 * Catálogo de EJEMPLO de Plastimascotas Jimmys.
 *
 * Las categorías y marcas salen del volante de la tienda; los productos,
 * precios y cantidades son de ejemplo (is_sample) y se reemplazan desde el
 * panel /admin. Este archivo sirve para dos cosas:
 *  1. Generar supabase/seed.sql (node scripts/gen-seed.mjs).
 *  2. Mostrar la tienda si Supabase no responde (copia de respaldo).
 */

export type Pet = 'perro' | 'gato' | 'ave' | 'roedor' | 'peces';

export type SeedVariant = {
  label: string;
  price: number;
  stock: number;
  compareAt?: number;
  wholesale?: [price: number, minQty: number];
};

export type SeedProduct = {
  slug: string;
  name: string;
  category: string;
  brand?: string;
  description?: string;
  tag?: string;
  pets: Pet[];
  featured?: boolean;
  variants: SeedVariant[];
};

export const SEED_SETTINGS = {
  name: 'Plastimascotas Jimmys',
  claim: 'Todo para tus mascotas',
  whatsapp: '573172506565',
  phones: ['317 250 6565', '301 639 8635'],
  address: 'Cra. 6 #11-93, Serrezuelita',
  city: 'Funza, Cundinamarca',
  paymentMethods: ['Efectivo', 'Nequi', 'Daviplata', 'Tarjeta'],
  deliveryNote: '¡Domicilios sin costo!',
};

export const SEED_CATEGORIES = [
  { slug: 'alimento-perro', name: 'Alimento para perros', icon: '🐶', description: 'Concentrados de las mejores marcas, en bolsa o bulto.' },
  { slug: 'alimento-gato', name: 'Alimento para gatos', icon: '🐱', description: 'Comida seca para gatitos y adultos.' },
  { slug: 'premium', name: 'Comida premium e importada', icon: '⭐', description: 'Nutrición superior para los más consentidos.' },
  { slug: 'granel', name: 'Comida a granel', icon: '🥣', description: 'Por libra o por kilo. Al por mayor y al detal.' },
  { slug: 'arena', name: 'Arena para gatos', icon: '🪣', description: 'Somos distribuidores: precios especiales por mayor.' },
  { slug: 'antipulgas', name: 'Antipulgas', icon: '🛡️', description: 'Pipetas, collares y shampoos.' },
  { slug: 'desparasitantes', name: 'Desparasitantes', icon: '💊', description: 'Según el peso de tu mascota.' },
  { slug: 'aseo', name: 'Productos de aseo', icon: '🧴', description: 'Shampoos, toallitas y bolsas.' },
  { slug: 'juguetes', name: 'Juguetes y accesorios', icon: '🎾', description: 'Pelotas, huesos, correas y comederos.' },
  { slug: 'ropa', name: 'Vestidos', icon: '🧥', description: 'Buzos y chalecos para todas las tallas.' },
  { slug: 'gimnasios', name: 'Gimnasios y camas', icon: '🏠', description: 'Gimnasios para gatos, rascadores y camas.' },
  { slug: 'jaulas', name: 'Jaulas y guacales', icon: '🧳', description: 'Para aves, roedores y para viajar.' },
  { slug: 'aves-roedores', name: 'Aves, conejos y hámsters', icon: '🐹', description: 'Alimentos y accesorios.' },
];

export const SEED_BRANDS = [
  'Dogourmet', 'Chunky', 'Ringo', 'Nutrecan', 'Dog Chow', 'Nutra Nuggets', 'Monello',
  'Taste of the Wild', "Hill's", 'Cipa', 'Petys',
];

export const SEED_PRODUCTS: SeedProduct[] = [
  // Alimento para perros
  { slug: 'dogourmet-adulto-parrilla', name: 'Dogourmet Adulto Carne a la Parrilla', category: 'alimento-perro', brand: 'Dogourmet', pets: ['perro'], featured: true, tag: 'Más vendido',
    description: 'Alimento completo para perros adultos de todas las razas.',
    variants: [{ label: '1 kg', price: 11900, stock: 24 }, { label: '4 kg', price: 42900, stock: 10 }, { label: 'Bulto 22 kg', price: 189000, stock: 3 }] },
  { slug: 'chunky-adulto-pollo', name: 'Chunky Adulto Pollo', category: 'alimento-perro', brand: 'Chunky', pets: ['perro'],
    description: 'Con pollo real, para perros adultos.',
    variants: [{ label: '2 kg', price: 21500, stock: 15 }, { label: '4 kg', price: 39900, stock: 8 }, { label: 'Bulto 25 kg', price: 198000, stock: 2 }] },
  { slug: 'ringo-adulto', name: 'Ringo Adulto', category: 'alimento-perro', brand: 'Ringo', pets: ['perro'],
    description: 'Rinde más: ideal para comprar por mayor.',
    variants: [{ label: '2 kg', price: 15900, stock: 20, wholesale: [14500, 6] }, { label: 'Bulto 25 kg', price: 159000, stock: 4 }] },
  { slug: 'nutrecan-cachorros', name: 'Nutrecan Cachorros', category: 'alimento-perro', brand: 'Nutrecan', pets: ['perro'],
    description: 'Para cachorros en crecimiento.',
    variants: [{ label: '2 kg', price: 18900, stock: 12 }, { label: '8 kg', price: 66000, stock: 0 }] },
  { slug: 'dog-chow-adultos', name: 'Dog Chow Adultos Medianos y Grandes', category: 'alimento-perro', brand: 'Dog Chow', pets: ['perro'], tag: 'Oferta',
    variants: [{ label: '2 kg', price: 24900, compareAt: 27900, stock: 9 }, { label: '4 kg', price: 46500, stock: 6 }] },
  { slug: 'nutra-nuggets-mantenimiento', name: 'Nutra Nuggets Mantenimiento', category: 'alimento-perro', brand: 'Nutra Nuggets', pets: ['perro'],
    variants: [{ label: '3 kg', price: 52000, stock: 5 }, { label: '15 kg', price: 210000, stock: 2 }] },

  // Alimento para gatos
  { slug: 'monello-gatos-adultos', name: 'Monello Gatos Adultos', category: 'alimento-gato', brand: 'Monello', pets: ['gato'], featured: true,
    variants: [{ label: '1 kg', price: 16900, stock: 14 }, { label: '7 kg', price: 99000, stock: 3 }] },
  { slug: 'chunky-gatos', name: 'Chunky Gatos Adultos', category: 'alimento-gato', brand: 'Chunky', pets: ['gato'],
    variants: [{ label: '1,5 kg', price: 19900, stock: 10 }, { label: '8 kg', price: 92000, stock: 2 }] },
  { slug: 'nutrecan-gato-adulto', name: 'Nutrecan Gato Adulto', category: 'alimento-gato', brand: 'Nutrecan', pets: ['gato'],
    variants: [{ label: '1 kg', price: 12900, stock: 18 }] },

  // Premium e importada
  { slug: 'taste-of-the-wild-high-prairie', name: 'Taste of the Wild High Prairie', category: 'premium', brand: 'Taste of the Wild', pets: ['perro'], featured: true, tag: 'Importado',
    description: 'Sin granos, con bisonte y venado asados.',
    variants: [{ label: '2 kg', price: 98000, stock: 4 }, { label: '5,6 kg', price: 215000, stock: 2 }, { label: '12,2 kg', price: 399000, stock: 1 }] },
  { slug: 'hills-adulto-raza-pequena', name: "Hill's Science Diet Adulto Raza Pequeña", category: 'premium', brand: "Hill's", pets: ['perro'], tag: 'Importado',
    variants: [{ label: '2 kg', price: 112000, stock: 3 }] },
  { slug: 'taste-of-the-wild-canyon-river', name: 'Taste of the Wild Canyon River', category: 'premium', brand: 'Taste of the Wild', pets: ['gato'], tag: 'Importado',
    variants: [{ label: '2 kg', price: 105000, stock: 2 }] },

  // A granel
  { slug: 'concentrado-perro-granel', name: 'Concentrado para perro a granel', category: 'granel', pets: ['perro'], tag: 'Por mayor',
    description: 'Llévalo por libra o por kilo. Desde 10 unidades pagas precio por mayor.',
    variants: [{ label: 'Libra', price: 3500, stock: 200, wholesale: [3000, 10] }, { label: 'Kilo', price: 7000, stock: 100, wholesale: [6000, 10] }] },
  { slug: 'concentrado-gato-granel', name: 'Concentrado para gato a granel', category: 'granel', pets: ['gato'], tag: 'Por mayor',
    variants: [{ label: 'Libra', price: 4500, stock: 120 }, { label: 'Kilo', price: 9000, stock: 60, wholesale: [8000, 10] }] },

  // Arena
  { slug: 'arena-aglomerante', name: 'Arena aglomerante para gatos', category: 'arena', brand: 'Petys', pets: ['gato'], featured: true, tag: 'Distribuidores',
    description: 'Forma bolitas firmes y controla el olor. Precio especial por mayor.',
    variants: [{ label: 'Bolsa 4,5 kg', price: 15900, stock: 60, wholesale: [13500, 6] }, { label: 'Bulto 20 kg', price: 52000, stock: 25, wholesale: [46000, 3] }] },
  { slug: 'arena-sanitaria', name: 'Arena sanitaria tradicional', category: 'arena', pets: ['gato'], tag: 'Por mayor',
    variants: [{ label: 'Bolsa 4,5 kg', price: 9900, stock: 80, wholesale: [8500, 6] }] },

  // Antipulgas
  { slug: 'pipeta-antipulgas-perro', name: 'Pipeta antipulgas para perro', category: 'antipulgas', pets: ['perro'],
    description: 'Elige según el peso de tu perro.',
    variants: [{ label: '0 a 10 kg', price: 22000, stock: 15 }, { label: '10 a 20 kg', price: 26000, stock: 12 }, { label: '20 a 40 kg', price: 30000, stock: 6 }] },
  { slug: 'collar-antipulgas', name: 'Collar antipulgas', category: 'antipulgas', pets: ['perro', 'gato'],
    variants: [{ label: 'Perro', price: 28000, stock: 8 }, { label: 'Gato', price: 24000, stock: 5 }] },
  { slug: 'shampoo-antipulgas', name: 'Shampoo antipulgas 250 ml', category: 'antipulgas', pets: ['perro', 'gato'],
    variants: [{ label: '', price: 16500, stock: 10 }] },

  // Desparasitantes
  { slug: 'desparasitante-perro', name: 'Desparasitante en tableta para perro', category: 'desparasitantes', pets: ['perro'],
    variants: [{ label: 'Hasta 10 kg', price: 9000, stock: 30 }, { label: 'Hasta 20 kg', price: 14000, stock: 20 }, { label: 'Hasta 40 kg', price: 22000, stock: 8 }] },
  { slug: 'desparasitante-gato', name: 'Desparasitante para gato', category: 'desparasitantes', pets: ['gato'],
    variants: [{ label: 'Tableta', price: 8500, stock: 25 }] },

  // Aseo
  { slug: 'shampoo-perro-gato', name: 'Shampoo para perro y gato 500 ml', category: 'aseo', pets: ['perro', 'gato'],
    variants: [{ label: '', price: 18900, stock: 12 }] },
  { slug: 'toallitas-humedas', name: 'Toallitas húmedas para mascotas x100', category: 'aseo', pets: ['perro', 'gato'],
    variants: [{ label: '', price: 12500, stock: 20 }] },
  { slug: 'bolsas-popo', name: 'Bolsas para popó (4 rollos)', category: 'aseo', pets: ['perro'],
    variants: [{ label: '', price: 7500, stock: 40, wholesale: [6000, 6] }] },

  // Juguetes y accesorios
  { slug: 'pelota-caucho', name: 'Pelota de caucho resistente', category: 'juguetes', pets: ['perro'],
    variants: [{ label: 'Pequeña', price: 6500, stock: 20 }, { label: 'Grande', price: 9900, stock: 12 }] },
  { slug: 'hueso-nylon', name: 'Hueso de nylon', category: 'juguetes', pets: ['perro'],
    variants: [{ label: '', price: 12000, stock: 15 }] },
  { slug: 'correa-collar', name: 'Correa y collar ajustable', category: 'juguetes', pets: ['perro'],
    variants: [{ label: 'S', price: 18000, stock: 6 }, { label: 'M', price: 22000, stock: 4 }, { label: 'L', price: 26000, stock: 0 }] },
  { slug: 'comedero-acero', name: 'Comedero de acero inoxidable', category: 'juguetes', pets: ['perro', 'gato'],
    variants: [{ label: 'Pequeño', price: 9000, stock: 15 }, { label: 'Grande', price: 14000, stock: 10 }] },
  { slug: 'raton-juguete-gato', name: 'Ratoncitos de juguete x3', category: 'juguetes', pets: ['gato'],
    variants: [{ label: '', price: 8000, stock: 18 }] },

  // Vestidos
  { slug: 'buzo-perro', name: 'Buzo para perro', category: 'ropa', pets: ['perro'],
    variants: [{ label: 'XS', price: 25000, stock: 5 }, { label: 'S', price: 25000, stock: 4 }, { label: 'M', price: 28000, stock: 3 }, { label: 'L', price: 32000, stock: 2 }] },
  { slug: 'chaleco-impermeable', name: 'Chaleco impermeable', category: 'ropa', pets: ['perro'],
    variants: [{ label: 'S', price: 35000, stock: 3 }, { label: 'M', price: 38000, stock: 2 }, { label: 'L', price: 42000, stock: 1 }] },

  // Gimnasios y camas
  { slug: 'gimnasio-gato-3-niveles', name: 'Gimnasio para gato de 3 niveles', category: 'gimnasios', pets: ['gato'], featured: true,
    description: 'Con casita, rascadores y plataforma de descanso.',
    variants: [{ label: '', price: 189000, stock: 2 }] },
  { slug: 'rascador-gato', name: 'Rascador con juguete', category: 'gimnasios', pets: ['gato'],
    variants: [{ label: '', price: 59000, stock: 4 }] },
  { slug: 'cama-acolchada', name: 'Cama acolchada', category: 'gimnasios', pets: ['perro', 'gato'],
    variants: [{ label: 'M', price: 55000, stock: 3 }, { label: 'L', price: 75000, stock: 2 }] },

  // Jaulas
  { slug: 'guacal-transportador', name: 'Guacal transportador', category: 'jaulas', pets: ['perro', 'gato'],
    variants: [{ label: 'Pequeño', price: 65000, stock: 4 }, { label: 'Mediano', price: 95000, stock: 2 }] },
  { slug: 'jaula-hamster', name: 'Jaula para hámster con accesorios', category: 'jaulas', pets: ['roedor'],
    variants: [{ label: '', price: 85000, stock: 3 }] },
  { slug: 'jaula-aves', name: 'Jaula para aves mediana', category: 'jaulas', pets: ['ave'],
    variants: [{ label: '', price: 78000, stock: 2 }] },

  // Aves, conejos y hámsters
  { slug: 'alpiste', name: 'Alpiste para aves', category: 'aves-roedores', pets: ['ave'],
    variants: [{ label: 'Libra', price: 3000, stock: 50, wholesale: [2500, 10] }] },
  { slug: 'semillas-loros', name: 'Mezcla de semillas para loros', category: 'aves-roedores', pets: ['ave'],
    variants: [{ label: 'Libra', price: 5500, stock: 20 }] },
  { slug: 'alimento-conejo', name: 'Alimento para conejo', category: 'aves-roedores', pets: ['roedor'],
    variants: [{ label: '1 kg', price: 9500, stock: 15 }] },
  { slug: 'viruta-roedores', name: 'Viruta para roedores', category: 'aves-roedores', pets: ['roedor'],
    variants: [{ label: 'Paca', price: 12000, stock: 10 }] },
];
