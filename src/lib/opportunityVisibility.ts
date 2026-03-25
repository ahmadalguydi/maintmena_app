import { isOpenRequestVisible } from './maintenanceRequest';

export const isRequestOpportunityVisible = (status?: string | null) =>
  isOpenRequestVisible(status);
