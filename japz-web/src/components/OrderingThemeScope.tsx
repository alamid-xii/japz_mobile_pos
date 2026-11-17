import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { activateOrderingTheme } from '../theme';

/** Staff and login screens always use the original light appearance. */
export default function OrderingThemeScope() {
  const { pathname } = useLocation();
  const ordering = /^\/(japz|order)(\/|$)/.test(pathname);
  useLayoutEffect(() => {
    activateOrderingTheme(ordering);
  }, [ordering]);
  return null;
}
