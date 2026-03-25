interface BuyerReviewPathArgs {
  jobId?: string | null;
  jobType?: string | null;
  edit?: boolean;
}

export const getBuyerReviewPath = ({
  jobId,
  edit = false,
}: BuyerReviewPathArgs) => {
  if (!jobId) {
    return '/app/buyer/history';
  }

  const params = new URLSearchParams();
  params.set('focusReview', '1');

  if (edit) {
    params.set('editReview', '1');
  }

  return `/app/buyer/request/${jobId}?${params.toString()}`;
};
