export const introPlayedKey = 'japz.intro.played';
export const introEnteredKey = 'japz.intro.entered';
export const hasEnteredOrdering = () => { try { return sessionStorage.getItem(introEnteredKey) === 'yes'; } catch { return false; } };
