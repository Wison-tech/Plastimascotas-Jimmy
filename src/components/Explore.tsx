import { PET_LABEL, useCatalog, type Pet } from '../data/catalog';
import { CategoryIcon } from './CategoryIcon';

const PET_PHOTO: Partial<Record<Pet, string>> = {
  perro: '/img/pet-perro.jpg',
  gato: '/img/pet-gato.jpg',
  ave: '/img/pet-ave.jpg',
  roedor: '/img/pet-roedor.jpg',
};

type Props = {
  pet: Pet | null;
  category: string | null;
  onPet: (p: Pet) => void;
  onCategory: (c: string) => void;
};

/** "Compra por mascota" y la cuadrícula de categorías: llevan a la tienda ya filtrada. */
export function Explore({ pet, category, onPet, onCategory }: Props) {
  const { products, categories } = useCatalog();
  const petCount = (p: Pet) => products.filter((x) => x.pets.includes(p)).length;
  const pets = (Object.keys(PET_LABEL) as Pet[]).filter((p) => PET_PHOTO[p] && petCount(p) > 0);
  const catCount = (id: string) => products.filter((x) => x.categoryId === id).length;

  return (
    <section className="section" id="explorar" aria-labelledby="exploreTitle">
      <div className="wrap">
        <div className="section__head">
          <span className="kicker">Compra por mascota</span>
          <h2 id="exploreTitle">
            ¿Para <em>quién</em> es?
          </h2>
        </div>

        <div className="pets">
          {pets.map((p) => (
            <button key={p} type="button" className={`pet ${pet === p ? 'is-active' : ''}`} onClick={() => onPet(p)} aria-pressed={pet === p}>
              <span className="pet__img">
                <img src={PET_PHOTO[p]} alt="" width={560} height={560} loading="lazy" />
              </span>
              <strong>{PET_LABEL[p]}</strong>
              <span>
                {petCount(p)} producto{petCount(p) === 1 ? '' : 's'}
              </span>
            </button>
          ))}
        </div>

        <div className="cats" role="list" aria-label="Categorías">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              role="listitem"
              className={`cat ${category === c.id ? 'is-active' : ''}`}
              onClick={() => onCategory(c.id)}
            >
              <span className="cat__icon" aria-hidden="true">
                <CategoryIcon slug={c.id} />
              </span>
              <span className="cat__text">
                <strong>{c.name}</strong>
                <span>{catCount(c.id)} productos</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
