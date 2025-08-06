export const safely = (fn: () => void) => {
  try {
    fn();
  } catch {}
};
