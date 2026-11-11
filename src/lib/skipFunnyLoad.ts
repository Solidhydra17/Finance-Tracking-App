const SKIP_FUNNY_LOAD_KEY = 'kuripot-skip-funny-load';

export const markSkipFunnyLoad = (): void => {
  try {
    sessionStorage.setItem(SKIP_FUNNY_LOAD_KEY, '1');
  } catch {
    // sessionStorage can be unavailable in private contexts
  }
};

export const consumeSkipFunnyLoad = (): boolean => {
  try {
    if (sessionStorage.getItem(SKIP_FUNNY_LOAD_KEY) !== '1') return false;
    sessionStorage.removeItem(SKIP_FUNNY_LOAD_KEY);
    return true;
  } catch {
    return false;
  }
};
