// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const safely = (fn: Function) => {
  try {
    fn();
  } catch {}
};
