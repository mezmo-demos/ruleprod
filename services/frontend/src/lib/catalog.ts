import type { Category, ProductListResponse, Product, ProductCard } from '@ruleprod/contracts';

const CATALOG_URL = process.env.CATALOG_URL || 'http://localhost:4101';

export async function getCategories(): Promise<{ categories: Category[] }> {
  const res = await fetch(`${CATALOG_URL}/api/categories`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    console.error('Failed to fetch categories:', await res.text());
    throw new Error('Failed to fetch categories');
  }
  return res.json();
}

export async function getProducts(params?: Record<string, string | string[]>): Promise<ProductListResponse> {
  const searchParams = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, v));
      } else if (value !== undefined) {
        searchParams.append(key, value);
      }
    }
  }
  const query = searchParams.toString();
  const res = await fetch(`${CATALOG_URL}/api/products${query ? `?${query}` : ''}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    console.error('Failed to fetch products:', await res.text());
    throw new Error('Failed to fetch products');
  }
  return res.json();
}

export async function getProduct(slug: string): Promise<Product> {
  const res = await fetch(`${CATALOG_URL}/api/products/${slug}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    console.error(`Failed to fetch product ${slug}:`, await res.text());
    throw new Error(`Failed to fetch product ${slug}`);
  }
  return res.json();
}

export async function getRelatedProducts(slug: string): Promise<{ products: ProductCard[] }> {
  const res = await fetch(`${CATALOG_URL}/api/products/${slug}/related`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    console.error(`Failed to fetch related products for ${slug}:`, await res.text());
    throw new Error(`Failed to fetch related products for ${slug}`);
  }
  return res.json();
}
