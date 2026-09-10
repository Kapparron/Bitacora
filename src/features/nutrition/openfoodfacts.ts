/**
 * Open Food Facts client.
 *
 * The database is crowd-sourced, so a product may be missing anything. Only the
 * energy value is required here; a product without it cannot be logged and is
 * reported as incomplete rather than saved with a zero.
 *
 * Rate limits are roughly 100 requests a minute for a product and 10 for a
 * search, and the identifying User-Agent is mandatory — requests without one get
 * blocked.
 */
const API = 'https://world.openfoodfacts.org';
/** Text search lives on its own host; the old /cgi/search.pl now answers 503. */
const SEARCH_API = 'https://search.openfoodfacts.org';
const USER_AGENT = 'Bitacora/0.1 (personal workout and nutrition app)';

const FIELDS = [
  'code',
  'product_name',
  'product_name_es',
  'brands',
  'quantity',
  'serving_size',
  'serving_quantity',
  'image_front_small_url',
  'countries_tags',
  'nutriments',
].join(',');

export type OffProduct = {
  barcode: string;
  name: string;
  brand: string | null;
  /** Per 100 g or 100 ml. */
  kcalPer100g: number;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  fiberPer100g: number | null;
  sugarPer100g: number | null;
  saltPer100g: number | null;
  /** Grams in one serving, when the product declares it. */
  servingSizeG: number | null;
  imageUrl: string | null;
};

type Nutriments = Record<string, unknown>;

function num(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}

/** kcal per 100 g, converting from kJ when that is all the product carries. */
function energyPer100g(nutriments: Nutriments): number | null {
  const kcal = num(nutriments['energy-kcal_100g']);
  if (kcal !== null) return kcal;

  const kj = num(nutriments['energy-kj_100g']) ?? num(nutriments['energy_100g']);
  return kj === null ? null : Math.round(kj / 4.184);
}

function toProduct(raw: Record<string, unknown>): OffProduct | null {
  const nutriments = (raw.nutriments ?? {}) as Nutriments;
  const kcal = energyPer100g(nutriments);
  const barcode = typeof raw.code === 'string' ? raw.code : null;

  const name =
    (typeof raw.product_name_es === 'string' && raw.product_name_es.trim()) ||
    (typeof raw.product_name === 'string' && raw.product_name.trim()) ||
    '';

  // Without a barcode, a name or an energy value there is nothing to log.
  if (!barcode || !name || kcal === null) return null;

  // The product endpoint returns brands as a comma-separated string, the search
  // one as an array.
  const brands = Array.isArray(raw.brands)
    ? String(raw.brands[0] ?? '').trim()
    : typeof raw.brands === 'string'
      ? raw.brands.split(',')[0].trim()
      : '';

  return {
    barcode,
    name,
    brand: brands || null,
    kcalPer100g: kcal,
    proteinPer100g: num(nutriments.proteins_100g),
    carbsPer100g: num(nutriments.carbohydrates_100g),
    fatPer100g: num(nutriments.fat_100g),
    fiberPer100g: num(nutriments.fiber_100g),
    sugarPer100g: num(nutriments.sugars_100g),
    saltPer100g: num(nutriments.salt_100g),
    servingSizeG: num(raw.serving_quantity),
    imageUrl: typeof raw.image_front_small_url === 'string' ? raw.image_front_small_url : null,
  };
}

async function request(url: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    signal,
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });

  if (!response.ok) throw new Error(`Open Food Facts respondio ${response.status}`);
  return (await response.json()) as Record<string, unknown>;
}

export type LookupResult =
  | { status: 'found'; product: OffProduct }
  | { status: 'not_found' }
  | { status: 'incomplete' };

/** One product by barcode. */
export async function lookupBarcode(
  barcode: string,
  signal?: AbortSignal
): Promise<LookupResult> {
  const body = await request(`${API}/api/v2/product/${barcode}.json?fields=${FIELDS}`, signal);

  if (body.status !== 1 || typeof body.product !== 'object' || body.product === null) {
    return { status: 'not_found' };
  }

  const product = toProduct(body.product as Record<string, unknown>);
  return product ? { status: 'found', product } : { status: 'incomplete' };
}

/**
 * Text search. Results missing an energy value are dropped: they cannot be
 * logged, so offering them only wastes a tap.
 *
 * The country filter is applied here rather than in the query. This deployment
 * returns nothing for `countries_tags:en:spain` in any syntax tried, so products
 * sold in Spain are simply floated to the top of what comes back.
 */
export async function searchProducts(query: string, signal?: AbortSignal): Promise<OffProduct[]> {
  const params = new URLSearchParams({
    q: query,
    langs: 'es',
    page_size: '25',
    fields: FIELDS,
  });

  const body = await request(`${SEARCH_API}/search?${params.toString()}`, signal);
  const hits = Array.isArray(body.hits) ? body.hits : [];

  const found = hits.map((raw) => {
    const record = raw as Record<string, unknown>;
    const countries = Array.isArray(record.countries_tags) ? record.countries_tags : [];

    return { product: toProduct(record), spanish: countries.includes('en:spain') };
  });

  return found
    .filter((entry): entry is { product: OffProduct; spanish: boolean } => entry.product !== null)
    .sort((a, b) => Number(b.spanish) - Number(a.spanish))
    .map((entry) => entry.product);
}
