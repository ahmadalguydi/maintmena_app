export interface Job {
    id: string;
    title: string;
    description: string;
    location: string;
    urgency: string;
    budget: number;
    estimated_budget_min?: number | null;
    estimated_budget_max?: number | null;
    status: string;
    created_at: string;
    buyer_type?: 'company' | 'individual';
    buyer_company_name?: string | null;
    is_saved?: boolean;
    profiles?: {
        id: string;
        company_name?: string;
        buyer_type?: 'company' | 'individual';
        verified_seller?: boolean;
    };
}

export interface BuyerInfo {
    id: string;
    company_name?: string;
    buyer_type?: 'company' | 'individual';
    verified_seller?: boolean;
}

export interface Quote {
    id: string;
    request_id: string;
    price: number;
    estimated_duration: string;
    status: string;
    created_at: string;
    proposal: string;
    request_title?: string;
    unread_messages?: number;
    buyer_info?: BuyerInfo;
}

export interface Opportunity {
    id: string;
    title: string;
    location: string;
    type: 'signal' | 'tender';
    isRemote: boolean;
    latitude: number;
    longitude: number;
}

export interface TrackedItem {
    id: string;
    title: string;
    company: string;
    deadline: string | null;
    value: string | number | null;
    type: 'signal' | 'tender';
    location: string | null;
}
