interface IResponseUtil {
  data: unknown;
  paginationData?: {
    limit: number;
    page: number;
    total: number;
  };
}

export const responseUtil = ({ data, paginationData }: IResponseUtil) => {
  if (paginationData) {
    const { limit, page, total } = paginationData;

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  return data;
};
