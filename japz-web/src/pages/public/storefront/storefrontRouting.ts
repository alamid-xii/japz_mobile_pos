import { useLocation } from 'react-router-dom';
/** Canonical storefront and existing table QR codes. */
export const useStorefrontBase = () => useLocation().pathname.startsWith('/japz') ? '/japz' : '/order';
