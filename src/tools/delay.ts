/**
 * A function to similate delay, works only in `dev` environment only
 * to run in all environments pass `all=true`
 */
export const delay = (ms: number, all = false) => {
  const DEV = process.env.NODE_ENV === 'development';
  if (all || DEV)
    return new Promise((rs) => {
      setTimeout(() => rs(null), ms);
    });
};
