import { getApiBaseUrl } from '../services/api';

// Menu items may carry their own photo (imageUrl). When they don't, the
// storefront falls back to a category photo, then to a branded tile.

/**
 * Uploaded photos are stored as server-relative paths like /uploads/menu/x.jpg.
 * The backend is a different origin from the web app, so those must be resolved
 * against the API base. Absolute URLs and bundled /*.jpg assets pass through.
 */
export const resolveImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/uploads/')) return `${getApiBaseUrl()}${url}`;
    return url;
};

const CATEGORY_IMAGES: Record<string, string> = {
    burgers: '/burgers.jpg',
    sandwiches: '/burgers2.jpg',
    pasta: '/pasta.jpg',
    beverages: '/beverage1.jpg',
    coolers: '/coolers.jpg',
    coffee: '/coffee.jpg',
};

export const categoryImage = (categoryName?: string): string | null => {
    if (!categoryName) return null;
    return CATEGORY_IMAGES[categoryName.trim().toLowerCase()] ?? null;
};

export const itemImage = (
    item: { imageUrl?: string | null; categoryId?: number },
    categoryNameById: Map<number, string>,
): string | null => {
    if (item.imageUrl) return resolveImageUrl(item.imageUrl);
    const name = item.categoryId != null ? categoryNameById.get(item.categoryId) : undefined;
    return categoryImage(name);
};

// Deterministic warm tint for items with no photo, so the grid still reads as
// a set of distinct product tiles rather than identical grey blocks.
const TINTS = [
    'from-amber-300 to-orange-400',
    'from-yellow-300 to-amber-400',
    'from-orange-300 to-rose-400',
    'from-lime-300 to-amber-400',
];

export const fallbackTint = (seed: number) => TINTS[seed % TINTS.length];
