export type PriceTiers = {
  msrp: number;
  dealerNet?: number;
  map?: number;
  displayCost?: number;
};

export type Product = {
  sku: string;
  title: string;
  vendor: 'Lib&Co' | 'Savoy House' | 'Hubbardton Forge' | string;
  images: string[];
  videoUrls?: string[];
  specs: {
    'Collection name'?: string;
    'Number of Bulbs'?: string | number;
    'Finish'?: string;
    size?: string;
    dimmable?: boolean;
    [k: string]: unknown;
  };
  collectionId: string;
  price: PriceTiers;
  isNewIntro?: boolean;
  isMarketRecommended?: boolean;
  active: boolean;
};

export type Collection = {
  id: string;
  name: string;
  heroVideoUrl?: string;
  description?: string;
  sortOrder: number;
  specComparison?: SpecComparisonConfig;
};

export type DealerDisplayItem = { sku: string; installedAt?: string };

export type DealerProfile = {
  id: string;
  name: string;
  priceTier: 'dealer' | 'msrpOnly';
  displays: DealerDisplayItem[];
  previouslyPurchasedSkus: string[];
  starterSelectionSkus?: string[];
  vendors?: string[];
};

export type SelectionLine = {
  sku: string;
  qty: number;
  notes?: string;
  pickedBy: string[];
  favorites: string[];
  collectionId?: string;
};

export type Selection = {
  id: string;
  dealerId: string;
  name: string;
  lines: SelectionLine[];
  createdAt: string;
  updatedAt: string;
};

export type SharePayload = {
  token: string;
  selectionId: string;
};

export type SpecValue = {
  value: string;
  note: string;
};

export type SpecRow = {
  label: string;
  industryStandard: SpecValue;
  professionalSpec: SpecValue;
  emphasis: 'high' | 'medium' | 'low';
};

export type SpecComparisonConfig = {
  headline: string;
  subheadline: string;
  specs: SpecRow[];
  roiCallout: {
    headline: string;
    bullets: string[];
  };
  whenToUse: {
    label: string;
    description: string;
  }[];
};
