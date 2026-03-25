import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { getBuyerReviewPath } from '@/lib/buyerReviewNavigation';

export const BuyerReviewRedirect = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [searchParams] = useSearchParams();

  const targetPath = getBuyerReviewPath({
    jobId: bookingId,
    jobType: searchParams.get('type') || 'request',
    edit: searchParams.get('edit') === 'true',
  });

  return <Navigate replace to={targetPath} />;
};
