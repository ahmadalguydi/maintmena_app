import { describe, expect, it } from 'vitest';

import { isRequestOpportunityVisible } from './opportunityVisibility';

describe('opportunityVisibility', () => {
  it('only allows open maintenance requests into seller opportunities', () => {
    expect(isRequestOpportunityVisible('open')).toBe(true);
    expect(isRequestOpportunityVisible('accepted')).toBe(false);
    expect(isRequestOpportunityVisible('completed')).toBe(false);
    expect(isRequestOpportunityVisible('cancelled')).toBe(false);
  });
});
