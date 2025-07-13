interface IResponseUtil {
  data: unknown;
  totalCount?: number;
}

export const responseUtil = ({ data, totalCount }: IResponseUtil) => {
  if (totalCount !== undefined) {
    return {
      data,
      totalCount,
    };
  }

  return data;
};
