// Íconos de línea por categoría: reemplazan a los emojis para un look más sobrio.
// Si la categoría es nueva (creada en el panel), se usa la huella.
const PATHS: Record<string, string> = {
  // plato con comida
  'alimento-perro': 'M3 13h18a9 9 0 0 1-18 0ZM8 9.5c0-1.2 1-2 2-2M12 8c0-1.5 1-2.5 2.5-2.5',
  'alimento-gato': 'M4 4l3 5M20 4l-3 5M5 13a7 6 0 0 0 14 0 7 7 0 0 0-14 0ZM9.5 13h.01M14.5 13h.01M11 16h2',
  premium: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7Z',
  granel: 'M6 3h12l-1 4H7ZM7 7l-1.5 13h13L17 7M9.5 12h5',
  arena: 'M4 10h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2ZM8 10V6a4 4 0 0 1 8 0v4M8 15h.01M12 14h.01M16 15h.01',
  antipulgas: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6ZM9 12l2 2 4-4',
  desparasitantes: 'M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7ZM7 10l7 7',
  aseo: 'M9 3h6M10 3v3h4V3M8 9a2 2 0 0 1 2-3h4a2 2 0 0 1 2 3v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2Z',
  juguetes: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM5.6 5.6c3.5 3.5 3.5 9.3 0 12.8M18.4 5.6c-3.5 3.5-3.5 9.3 0 12.8',
  ropa: 'M9 3l3 2 3-2 5 3-2 4-2-1v12H8V9L6 10 4 6Z',
  gimnasios: 'M4 21h16M6 21V11M18 21V7M6 11h6M12 7h6M12 7v14M9 11v-2',
  jaulas: 'M5 21h14M6 21V10a6 6 0 0 1 12 0v11M9 21v-9M12 21V4M15 21v-9',
  'aves-roedores': 'M16 7a3 3 0 1 0-6 0c0 1-1 2-3 3l-3 2 4 .5L6 16h5a6 6 0 0 0 6-6V8l3-1ZM13 7h.01M9 21l2-5M13 21l1-5',
};

const PAW = 'M8.4 16a3.6 3.6 0 1 0 7.2 0a3.6 3.6 0 1 0 -7.2 0M4.199999999999999 11a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M7.800000000000001 7a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M13.0 7a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0M16.599999999999998 11a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0';

export function CategoryIcon({ slug, className }: { slug?: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" style={{ strokeWidth: 1.5 }}>
      <path d={(slug && PATHS[slug]) || PAW} />
    </svg>
  );
}
