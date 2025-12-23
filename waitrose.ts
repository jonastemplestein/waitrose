/**
 * Waitrose API Client
 * 
 * A dependency-free TypeScript client for the Waitrose grocery API.
 * Reverse-engineered from the Waitrose Android app v3.9.1.
 * 
 * Usage:
 *   const client = new WaitroseClient();
 *   await client.login(username, password);
 *   const trolley = await client.getTrolley();
 */

const GRAPHQL_URL = "https://www.waitrose.com/api/graphql-prod/graph/live";
const SEARCH_API_URL = "https://www.waitrose.com/api/content-prod/v2/cms/publish/productcontent";
const PRODUCTS_API_URL = "https://www.waitrose.com/api/products-prod/v1/products";
const CLIENT_ID = "ANDROID_APP";

// ============================================================================
// GraphQL Operations
// ============================================================================

const QUERIES = {
  // Session
  NewSession: `mutation NewSession($input: SessionInput) { generateSession(session: $input) { __typename ...SessionPayload failures { type message } } }  fragment SessionPayload on SetSessionPayload { accessToken refreshToken customerId customerOrderId customerOrderState defaultBranchId expiresIn }`,
  
  RefreshSession: `mutation RefreshSession($input: SessionInput) { generateSession(session: $input) { __typename ...SessionPayload failures { type message } } }  fragment SessionPayload on SetSessionPayload { accessToken refreshToken customerId customerOrderId customerOrderState defaultBranchId expiresIn }`,
  
  DeleteSession: `mutation DeleteSession { deleteSession }`,
  
  // Shopping Context
  GetShoppingContext: `query GetShoppingContext { shoppingContext { customerId customerOrderId customerOrderState defaultBranchId } }`,
  
  // Account
  GetAccountInfoAndMembership: `query GetAccountInfoAndMembership { getAccountProfile { id email contactAddress { __typename ...ContactAddress } } getMemberships { memberships { number type } } }  fragment Addressee on Addressee { title firstName lastName contactNumber }  fragment ContactAddress on Address { id line1 line2 line3 town region country postalCode addressee { __typename ...Addressee } }`,
  
  // Trolley
  GetTrolley: `query GetTrolley($orderId: ID!) { getTrolley(orderId: $orderId) { checkoutReadiness { __typename ...CheckoutReadiness } products { __typename ...TrolleyProduct } slotChangeable trolley { __typename ...TrolleyResponse } instantCheckout failures { __typename ...TrolleyFailure } } }  fragment CheckoutReadiness on CheckoutReadiness { slotTypeValid }  fragment TrolleyProductCategory on TrolleyProductCategory { id name }  fragment TrolleyPrice on Price { amount currencyCode }  fragment Quantity on Quantity { amount uom }  fragment QuantityPrice on QuantityPrice { price { __typename ...TrolleyPrice } quantity { __typename ...Quantity } }  fragment Hfss on Hfss { status }  fragment ProductImage on ProductImage { extraLarge large medium small }  fragment Group on Group { name }  fragment TrolleyProductPromotion on TrolleyProductPromotion { groups { __typename ...Group } myWaitrosePromotion promotionDescription promotionExpiryDate promotionId promotionTypeCode promotionUnitPrice { __typename ...TrolleyPrice } promotionalPricePerUnit discount { type } hidden }  fragment AvailableDate on AvailableDate { startDate endDate }  fragment Restriction on Restriction { availableDates { __typename ...AvailableDate } }  fragment ProductReview on ProductReview { averageRating reviewCount }  fragment ProductServings on ProductServings { max min }  fragment ProductWeight on ProductWeight { uoms }  fragment TrolleyProduct on TrolleyProduct { categories { __typename ...TrolleyProductCategory } currentSaleUnitPrice { __typename ...QuantityPrice } defaultQuantity { __typename ...Quantity } displayPrice displayPriceEstimated displayPriceQualifier formattedPriceRange formattedWeightRange hfss { __typename ...Hfss } id leadTime lineNumber maxPersonalisedMessageLength name brandName productImageUrls { __typename ...ProductImage } productType promotions { __typename ...TrolleyProductPromotion } restriction { __typename ...Restriction } reviews { __typename ...ProductReview } servings { __typename ...ProductServings } substitutionsProhibited size thumbnail weights { __typename ...ProductWeight } depositCharge { __typename ...TrolleyPrice } }  fragment SlotOptionDatesType on SlotOptionDatesType { date type }  fragment Conflict on Conflict { productId lineNumber messages priority outOfStock resolutionActions prohibitedActions itemId type slotOptionDates { __typename ...SlotOptionDatesType } }  fragment TrolleyItem on TrolleyItem { canSubstitute lineNumber noteToShopper personalisedMessage quantity { __typename ...Quantity } reservedQuantity totalPrice { __typename ...TrolleyPrice } triggeredPromotions trolleyItemId untriggeredPromotions }  fragment TrolleyItemCounts on TrolleyItemCounts { hardConflicts noConflicts softConflicts }  fragment TrolleyTotals on TrolleyTotals { collectionMinimumOrderValue { __typename ...TrolleyPrice } deliveryCharge { __typename ...TrolleyPrice } deliveryMinimumOrderValue { __typename ...TrolleyPrice } itemTotalEstimatedCost { __typename ...TrolleyPrice } minimumSpendThresholdMet savingsFromOffers { __typename ...TrolleyPrice } savingsFromMyWaitrose { __typename ...TrolleyPrice } totalDepositCharge { __typename ...TrolleyPrice } totalEstimatedCost { __typename ...TrolleyPrice } trolleyItemCounts { __typename ...TrolleyItemCounts } }  fragment TrolleyResponse on TrolleyResponse { amendingOrder conflicts { __typename ...Conflict } orderId trolleyItems { __typename ...TrolleyItem } trolleyTotals { __typename ...TrolleyTotals } }  fragment TrolleyFailure on TrolleyFailure { message type }`,
  
  UpdateTrolleyItems: `mutation UpdateTrolleyItems($trolleyItemsInput: [TrolleyItemInput!], $orderId: ID!) { updateTrolleyItems(trolleyItems: $trolleyItemsInput, orderId: $orderId) { products { __typename ...TrolleyProduct } trolley { __typename ...TrolleyResponse } instantCheckout failures { __typename ...TrolleyFailure } } }  fragment TrolleyProductCategory on TrolleyProductCategory { id name }  fragment TrolleyPrice on Price { amount currencyCode }  fragment Quantity on Quantity { amount uom }  fragment QuantityPrice on QuantityPrice { price { __typename ...TrolleyPrice } quantity { __typename ...Quantity } }  fragment Hfss on Hfss { status }  fragment ProductImage on ProductImage { extraLarge large medium small }  fragment Group on Group { name }  fragment TrolleyProductPromotion on TrolleyProductPromotion { groups { __typename ...Group } myWaitrosePromotion promotionDescription promotionExpiryDate promotionId promotionTypeCode promotionUnitPrice { __typename ...TrolleyPrice } promotionalPricePerUnit discount { type } hidden }  fragment AvailableDate on AvailableDate { startDate endDate }  fragment Restriction on Restriction { availableDates { __typename ...AvailableDate } }  fragment ProductReview on ProductReview { averageRating reviewCount }  fragment ProductServings on ProductServings { max min }  fragment ProductWeight on ProductWeight { uoms }  fragment TrolleyProduct on TrolleyProduct { categories { __typename ...TrolleyProductCategory } currentSaleUnitPrice { __typename ...QuantityPrice } defaultQuantity { __typename ...Quantity } displayPrice displayPriceEstimated displayPriceQualifier formattedPriceRange formattedWeightRange hfss { __typename ...Hfss } id leadTime lineNumber maxPersonalisedMessageLength name brandName productImageUrls { __typename ...ProductImage } productType promotions { __typename ...TrolleyProductPromotion } restriction { __typename ...Restriction } reviews { __typename ...ProductReview } servings { __typename ...ProductServings } substitutionsProhibited size thumbnail weights { __typename ...ProductWeight } depositCharge { __typename ...TrolleyPrice } }  fragment SlotOptionDatesType on SlotOptionDatesType { date type }  fragment Conflict on Conflict { productId lineNumber messages priority outOfStock resolutionActions prohibitedActions itemId type slotOptionDates { __typename ...SlotOptionDatesType } }  fragment TrolleyItem on TrolleyItem { canSubstitute lineNumber noteToShopper personalisedMessage quantity { __typename ...Quantity } reservedQuantity totalPrice { __typename ...TrolleyPrice } triggeredPromotions trolleyItemId untriggeredPromotions }  fragment TrolleyItemCounts on TrolleyItemCounts { hardConflicts noConflicts softConflicts }  fragment TrolleyTotals on TrolleyTotals { collectionMinimumOrderValue { __typename ...TrolleyPrice } deliveryCharge { __typename ...TrolleyPrice } deliveryMinimumOrderValue { __typename ...TrolleyPrice } itemTotalEstimatedCost { __typename ...TrolleyPrice } minimumSpendThresholdMet savingsFromOffers { __typename ...TrolleyPrice } savingsFromMyWaitrose { __typename ...TrolleyPrice } totalDepositCharge { __typename ...TrolleyPrice } totalEstimatedCost { __typename ...TrolleyPrice } trolleyItemCounts { __typename ...TrolleyItemCounts } }  fragment TrolleyResponse on TrolleyResponse { amendingOrder conflicts { __typename ...Conflict } orderId trolleyItems { __typename ...TrolleyItem } trolleyTotals { __typename ...TrolleyTotals } }  fragment TrolleyFailure on TrolleyFailure { message type }`,
  
  EmptyTrolley: `mutation EmptyTrolley($orderId: ID!) { emptyTrolley(orderId: $orderId) { products { __typename ...TrolleyProduct } trolley { __typename ...TrolleyResponse } instantCheckout failures { __typename ...TrolleyFailure } } }  fragment TrolleyProductCategory on TrolleyProductCategory { id name }  fragment TrolleyPrice on Price { amount currencyCode }  fragment Quantity on Quantity { amount uom }  fragment QuantityPrice on QuantityPrice { price { __typename ...TrolleyPrice } quantity { __typename ...Quantity } }  fragment Hfss on Hfss { status }  fragment ProductImage on ProductImage { extraLarge large medium small }  fragment Group on Group { name }  fragment TrolleyProductPromotion on TrolleyProductPromotion { groups { __typename ...Group } myWaitrosePromotion promotionDescription promotionExpiryDate promotionId promotionTypeCode promotionUnitPrice { __typename ...TrolleyPrice } promotionalPricePerUnit discount { type } hidden }  fragment AvailableDate on AvailableDate { startDate endDate }  fragment Restriction on Restriction { availableDates { __typename ...AvailableDate } }  fragment ProductReview on ProductReview { averageRating reviewCount }  fragment ProductServings on ProductServings { max min }  fragment ProductWeight on ProductWeight { uoms }  fragment TrolleyProduct on TrolleyProduct { categories { __typename ...TrolleyProductCategory } currentSaleUnitPrice { __typename ...QuantityPrice } defaultQuantity { __typename ...Quantity } displayPrice displayPriceEstimated displayPriceQualifier formattedPriceRange formattedWeightRange hfss { __typename ...Hfss } id leadTime lineNumber maxPersonalisedMessageLength name brandName productImageUrls { __typename ...ProductImage } productType promotions { __typename ...TrolleyProductPromotion } restriction { __typename ...Restriction } reviews { __typename ...ProductReview } servings { __typename ...ProductServings } substitutionsProhibited size thumbnail weights { __typename ...ProductWeight } depositCharge { __typename ...TrolleyPrice } }  fragment SlotOptionDatesType on SlotOptionDatesType { date type }  fragment Conflict on Conflict { productId lineNumber messages priority outOfStock resolutionActions prohibitedActions itemId type slotOptionDates { __typename ...SlotOptionDatesType } }  fragment TrolleyItem on TrolleyItem { canSubstitute lineNumber noteToShopper personalisedMessage quantity { __typename ...Quantity } reservedQuantity totalPrice { __typename ...TrolleyPrice } triggeredPromotions trolleyItemId untriggeredPromotions }  fragment TrolleyItemCounts on TrolleyItemCounts { hardConflicts noConflicts softConflicts }  fragment TrolleyTotals on TrolleyTotals { collectionMinimumOrderValue { __typename ...TrolleyPrice } deliveryCharge { __typename ...TrolleyPrice } deliveryMinimumOrderValue { __typename ...TrolleyPrice } itemTotalEstimatedCost { __typename ...TrolleyPrice } minimumSpendThresholdMet savingsFromOffers { __typename ...TrolleyPrice } savingsFromMyWaitrose { __typename ...TrolleyPrice } totalDepositCharge { __typename ...TrolleyPrice } totalEstimatedCost { __typename ...TrolleyPrice } trolleyItemCounts { __typename ...TrolleyItemCounts } }  fragment TrolleyResponse on TrolleyResponse { amendingOrder conflicts { __typename ...Conflict } orderId trolleyItems { __typename ...TrolleyItem } trolleyTotals { __typename ...TrolleyTotals } }  fragment TrolleyFailure on TrolleyFailure { message type }`,
  
  // Orders
  GetOrders: `query GetOrders($getPendingOrdersInput: GetOrdersInput, $getPreviousOrdersInput: GetOrdersInput, $getAmendingOrderInput: GetOrdersInput) { pendingOrders: getOrders(getOrdersInput: $getPendingOrdersInput) { content { __typename ...Order } links { rel title href } } previousOrders: getOrders(getOrdersInput: $getPreviousOrdersInput) { content { __typename ...Order } links { rel title href } } amendingOrder: getOrders(getOrdersInput: $getAmendingOrderInput) { content { __typename ...Order } } }  fragment Price on OrderPrice { amount currencyCode }  fragment OrderAddress on OrderAddress { id line1 line2 line3 postalCode town region country }  fragment OrderSlot on OrderSlot { branchId branchName branchAddress { __typename ...OrderAddress } type startDateTime endDateTime amendOrderCutoffDateTime deliveryAddress { __typename ...OrderAddress } status }  fragment Order on OrderContent { customerOrderId status created lastUpdated links { rel title href } totals { estimated { totalPrice { __typename ...Price } toPay { __typename ...Price } } actual { paid { __typename ...Price } } } slots { __typename ...OrderSlot } containsEntertainingLines orderLines { lineNumber } }`,
  
  GetPendingOrders: `query GetPendingOrders($getPendingOrdersInput: GetOrdersInput) { pendingOrders: getOrders(getOrdersInput: $getPendingOrdersInput) { content { __typename ...Order } links { rel title href } } }  fragment Price on OrderPrice { amount currencyCode }  fragment OrderAddress on OrderAddress { id line1 line2 line3 postalCode town region country }  fragment OrderSlot on OrderSlot { branchId branchName branchAddress { __typename ...OrderAddress } type startDateTime endDateTime amendOrderCutoffDateTime deliveryAddress { __typename ...OrderAddress } status }  fragment Order on OrderContent { customerOrderId status created lastUpdated links { rel title href } totals { estimated { totalPrice { __typename ...Price } toPay { __typename ...Price } } actual { paid { __typename ...Price } } } slots { __typename ...OrderSlot } containsEntertainingLines orderLines { lineNumber } }`,
  
  GetPreviousOrders: `query GetPreviousOrders($getPreviousOrdersInput: GetOrdersInput) { previousOrders: getOrders(getOrdersInput: $getPreviousOrdersInput) { content { __typename ...Order } links { rel title href } } }  fragment Price on OrderPrice { amount currencyCode }  fragment OrderAddress on OrderAddress { id line1 line2 line3 postalCode town region country }  fragment OrderSlot on OrderSlot { branchId branchName branchAddress { __typename ...OrderAddress } type startDateTime endDateTime amendOrderCutoffDateTime deliveryAddress { __typename ...OrderAddress } status }  fragment Order on OrderContent { customerOrderId status created lastUpdated links { rel title href } totals { estimated { totalPrice { __typename ...Price } toPay { __typename ...Price } } actual { paid { __typename ...Price } } } slots { __typename ...OrderSlot } containsEntertainingLines orderLines { lineNumber } }`,
  
  GetOrder: `query GetOrder($customerOrderId: String) { getOrder(customerOrderId: $customerOrderId) { customerOrderId status created lastUpdated orderLines { __typename ...OrderLine } slots { __typename ...OrderSlot } containsEntertainingLines substitutionsAllowed bagless paperStatement links { rel title href } totals { actual { paid { __typename ...Price } savings { __typename ...Price } carrierBagCharge { __typename ...Price } deliveryCharge { __typename ...Price } depositCharge { __typename ...Price } offerSavings { __typename ...Price } partnerDiscountSavings { __typename ...Price } membershipSavings { __typename ...Price } pickedPrice { __typename ...Price } } estimated { giftCards { __typename ...Price } giftVouchers { __typename ...Price } paymentCard { __typename ...Price } carrierBagCharge { __typename ...Price } deliveryCharge { __typename ...Price } depositCharge { __typename ...Price } orderLines { __typename ...Price } offerSavings { __typename ...Price } membershipSavings { __typename ...Price } incentiveSavings { __typename ...Price } totalSavings { __typename ...Price } totalPrice { __typename ...Price } toPay { __typename ...Price } } } paymentInfo { giftCards { __typename ...OrderGiftCard } giftVouchers { __typename ...OrderGiftVoucher } cardPayment { __typename ...CardPayment } } } }  fragment Quantity on Quantity { amount uom }  fragment Price on OrderPrice { amount currencyCode }  fragment PersonalisedMessage on PersonalisedInfo { message }  fragment OrderLine on OrderLine { lineNumber orderLineStatus estimatedQuantity { __typename ...Quantity } quantity { __typename ...Quantity } estimatedUnitPrice { __typename ...Price } estimatedTotalPrice { __typename ...Price } estimatedDepositCharge { __typename ...Price } estimatedPrice { __typename ...Price } price { __typename ...Price } unitPrice { __typename ...Price } depositCharge { __typename ...Price } totalPrice { __typename ...Price } substitutionAllowed noteToShopper personalisedInfos { __typename ...PersonalisedMessage } }  fragment OrderAddress on OrderAddress { id line1 line2 line3 postalCode town region country }  fragment OrderSlot on OrderSlot { branchId branchName branchAddress { __typename ...OrderAddress } type startDateTime endDateTime amendOrderCutoffDateTime deliveryAddress { __typename ...OrderAddress } status }  fragment OrderGiftCard on OrderGiftCard { serialNumber remainingBalance { __typename ...Price } amountToDeduct { __typename ...Price } }  fragment OrderGiftVoucher on OrderGiftVoucher { serialNumber status value { __typename ...Price } }  fragment CardPayment on CardPayment { cardType cardholderName maskedCardNumber startDate expiryDate businessAccount billingAddress { __typename ...OrderAddress } }`,
  
  CancelOrder: `mutation CancelOrder($input: ID!) { cancelOrder(customerOrderId: $input) { failures { __typename ...OrderFailure } } }  fragment OrderFailure on OrderFailure { type message }`,
  
  InitiateAmendOrder: `mutation InitiateAmendOrder($input: ID!) { amendOrder(customerOrderId: $input) { failures { __typename ...OrderFailure } } }  fragment OrderFailure on OrderFailure { type message }`,
  
  CancelAmendOrder: `mutation CancelAmendOrder($input: ID!) { cancelAmendOrder(customerOrderId: $input) { failures { __typename ...OrderFailure } } }  fragment OrderFailure on OrderFailure { type message }`,
  
  // Slots
  CurrentSlot: `query CurrentSlot($input: CurrentSlotInput) { currentSlot(currentSlotInput: $input) { slotType branchId addressId postcode startDateTime endDateTime expiryDateTime orderCutoffDateTime amendOrderCutoffDateTime shopByDateTime deliveryCharge { amount currencyCode } slotGridType } }`,
  
  SlotDates: `query SlotDates($slotDatesInput: SlotDatesInput) { slotDates(slotDatesInput: $slotDatesInput) { content { id dayOfWeek } failures { message type } } }`,
  
  SlotDays: `query SlotDays($slotDaysInput: SlotDaysInput) { slotDays(slotDaysInput: $slotDaysInput) { content { id branchId slotType date slots { id startDateTime endDateTime shopByDateTime status slotGridType charge { currencyCode amount } greenSlot deliveryPassSlot } } failures { message type } variant } }`,
  
  BookSlot: `mutation BookSlot($input: BookSlotInput) { bookSlot(bookSlotInput: $input) { slotExpiryDateTime orderCutoffDateTime amendOrderCutoffDateTime shopByDateTime failures { type message } variant } }`,
  
  // Campaigns
  GetCampaigns: `query GetCampaigns { campaigns { id name marketingStartDate marketingEndDate startDate endDate } }`,
};

// ============================================================================
// Types
// ============================================================================

/** GraphQL error structure */
interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: string[];
}

/** GraphQL response with errors */
type GraphQLResponse<T> = T & { errors?: GraphQLError[] };

/** Standard API failure type */
export interface ApiFailure {
  type: string;
  message: string;
}

/** Slot type options */
export type SlotType = "DELIVERY" | "COLLECTION";

/** Standard unit of measure (C62 = "each") */
export type UnitOfMeasure = "C62" | "KGM" | "GRM";

/** Slot date with day of week */
export interface SlotDate {
  id: string;
  dayOfWeek: string;
}

/** Book slot result */
export interface BookSlotResult {
  slotExpiryDateTime: string;
  orderCutoffDateTime: string;
  amendOrderCutoffDateTime?: string;
  shopByDateTime?: string;
}

export interface Price {
  amount: number;
  currencyCode: string;
}

export interface Quantity {
  amount: number;
  uom: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  customerId: string;
  customerOrderId: string;
  customerOrderState: string;
  defaultBranchId: string;
  expiresIn: number;
}

export interface ShoppingContext {
  customerId: string;
  customerOrderId: string;
  customerOrderState: string;
  defaultBranchId: string;
}

export interface TrolleyProduct {
  id: string;
  lineNumber: string;
  name: string;
  brandName: string;
  displayPrice: string;
  size: string;
  thumbnail: string;
  productType: string;
}

export interface TrolleyItem {
  lineNumber: string;
  trolleyItemId: number;
  quantity: Quantity;
  totalPrice: Price;
  canSubstitute: boolean;
  noteToShopper: string | null;
}

export interface TrolleyTotals {
  totalEstimatedCost: Price;
  itemTotalEstimatedCost: Price;
  deliveryCharge: Price | null;
  savingsFromOffers: Price | null;
  savingsFromMyWaitrose: Price | null;
}

export interface Trolley {
  orderId: string;
  trolleyItems: TrolleyItem[];
  trolleyTotals: TrolleyTotals;
  conflicts: unknown[];
}

export interface TrolleyResponse {
  products: TrolleyProduct[];
  trolley: Trolley;
  failures: ApiFailure[] | null;
}

export interface OrderSlot {
  branchId: string;
  branchName: string;
  type: string;
  startDateTime: string;
  endDateTime: string;
  status: string;
}

export interface Order {
  customerOrderId: string;
  status: string;
  created: string;
  lastUpdated: string;
  slots: OrderSlot[];
  totals: {
    estimated: { totalPrice: Price; toPay: Price };
    actual: { paid: Price | null };
  };
}

export interface Slot {
  id: string;
  startDateTime: string;
  endDateTime: string;
  shopByDateTime: string;
  status: string;
  charge: Price;
  greenSlot: boolean;
  deliveryPassSlot: boolean;
}

export interface SlotDay {
  id: string;
  branchId: string;
  slotType: string;
  date: string;
  slots: Slot[];
}

export interface AccountProfile {
  id: string;
  email: string;
  contactAddress: {
    id: string;
    line1: string;
    line2: string;
    line3: string;
    town: string;
    postalCode: string;
  };
}

export interface Membership {
  number: string;
  type: string;
}

export interface TrolleyItemInput {
  lineNumber: string;
  quantity: { amount: number; uom: UnitOfMeasure };
  noteToShopper?: string;
  canSubstitute?: boolean;
}

export interface CurrentSlot {
  slotType: string | null;
  branchId: string | null;
  addressId: string | null;
  postcode: string | null;
  startDateTime: string | null;
  endDateTime: string | null;
  expiryDateTime: string | null;
  orderCutoffDateTime: string | null;
  amendOrderCutoffDateTime: string | null;
  shopByDateTime: string | null;
  deliveryCharge: Price | null;
  slotGridType: string | null;
}

export interface OrderLine {
  lineNumber: string;
  orderLineStatus: string;
  estimatedQuantity: Quantity | null;
  quantity: Quantity | null;
  estimatedUnitPrice: Price | null;
  estimatedTotalPrice: Price | null;
  estimatedPrice: Price | null;
  price: Price | null;
  unitPrice: Price | null;
  totalPrice: Price | null;
  substitutionAllowed: boolean;
  noteToShopper: string | null;
}

export interface OrderTotals {
  estimated: {
    totalPrice: Price | null;
    toPay: Price | null;
    deliveryCharge: Price | null;
    offerSavings: Price | null;
    membershipSavings: Price | null;
  };
  actual: {
    paid: Price | null;
    savings: Price | null;
    deliveryCharge: Price | null;
  };
}

export interface OrderDetails {
  customerOrderId: string;
  status: string;
  created: string;
  lastUpdated: string;
  orderLines: OrderLine[];
  slots: OrderSlot[];
  containsEntertainingLines: boolean;
  substitutionsAllowed: boolean;
  bagless: boolean;
  totals: OrderTotals;
}

export interface Campaign {
  id: string;
  name: string;
  marketingStartDate: string;
  marketingEndDate: string;
  startDate: string;
  endDate: string;
}

// ============================================================================
// Product Search Types (REST API)
// ============================================================================

/** Sort options for product search */
export type SearchSortBy = 
  | "RELEVANCE" 
  | "PRICE_LOW_2_HIGH" 
  | "PRICE_HIGH_2_LOW" 
  | "A_2_Z" 
  | "Z_2_A"
  | "TOP_RATED"
  | "MOST_POPULAR"
  | "CATEGORY_RANKING";

/** Search tag for filtering */
export interface SearchTag {
  group: string;
  value: string;
}

/** Filter tag for filtering results */
export interface FilterTag {
  group: string;
  value: string;
}

/** Search query parameters */
export interface SearchQueryParams {
  /** Search term (for text search) */
  searchTerm?: string;
  /** Category path (for browsing) */
  category?: string;
  /** Sort order */
  sortBy?: SearchSortBy;
  /** Pagination offset (0-based) */
  start?: number;
  /** Page size (max 128 for search, 15 for orders) */
  size?: number;
  /** Search tags for filtering */
  searchTags?: SearchTag[];
  /** Filter tags for filtering */
  filterTags?: FilterTag[];
  /** Branch ID for availability */
  branchId?: string;
  /** Promotion ID to filter by promotion */
  promotionId?: string;
  /** Category level depth */
  categoryLevel?: number;
}

/** Product promotion information */
export interface ProductPromotion {
  promotionId: string;
  promotionDescription: string;
  promotionTypeCode: string;
  promotionExpiryDate?: string;
  promotionUnitPrice?: Price;
  myWaitrosePromotion: boolean;
}

/** Product review information */
export interface ProductReview {
  averageRating: number;
  reviewCount: number;
}

/** Product image URLs */
export interface ProductImageUrls {
  small?: string;
  medium?: string;
  large?: string;
  extraLarge?: string;
}

/** Product details from search results */
export interface SearchProduct {
  id: string;
  lineNumber: string;
  name: string;
  brandName?: string;
  displayPrice: string;
  displayPriceEstimated?: boolean;
  displayPriceQualifier?: string;
  formattedPriceRange?: string;
  formattedWeightRange?: string;
  size?: string;
  thumbnail?: string;
  productImageUrls?: ProductImageUrls;
  productType?: string;
  promotions?: ProductPromotion[];
  reviews?: ProductReview;
  currentSaleUnitPrice?: {
    price: Price;
    quantity: Quantity;
  };
  defaultQuantity?: Quantity;
  leadTime?: number;
  categories?: Array<{ id: string; name: string }>;
  depositCharge?: Price;
  hasDepositCharge?: boolean;
  servings?: { min?: number; max?: number };
  isHfss?: boolean;
  marketingBadges?: string[];
}

/** Favourite category in search results */
export interface FavouriteCategory {
  id: string;
  name: string;
  productCount: number;
}

/** Search results response */
export interface SearchResponse {
  /** Products matching the search */
  products: SearchProduct[];
  /** Total number of matching products */
  totalMatches: number;
  /** Favourite categories (for logged-in users) */
  favouriteCategories?: FavouriteCategory[];
  /** Personalisation information */
  personalisation?: {
    experimentId?: string;
    variant?: string;
  };
}

/** Product details from batch lookup by line numbers */
export interface ProductDetail {
  lineNumber: string;
  name: string;
  brandName?: string;
  displayPrice?: string;
  size?: string;
  thumbnail?: string;
  productImageUrls?: ProductImageUrls;
  currentSaleUnitPrice?: {
    price: Price;
    quantity: Quantity;
  };
}

/** Category information for browsing */
export interface CategoryInfo {
  id: string;
  name: string;
  parentCategoryId?: string;
  isRootCategory?: boolean;
  childCategories?: CategoryInfo[];
  productCount?: number;
}

// ============================================================================
// API Client
// ============================================================================

export class WaitroseClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private customerId: string | null = null;
  private customerOrderId: string | null = null;
  private defaultBranchId: string | null = null;

  /** Execute a GraphQL query/mutation */
  private async graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Waitrose/3.9.1 (Android)",
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const json = await response.json() as GraphQLResponse<T>;
    
    if (json.errors?.length) {
      throw new Error(`GraphQL Error: ${json.errors.map(e => e.message).join(", ")}`);
    }

    return json as T;
  }

  /** Execute a REST API call to the content/search API */
  private async restApi(
    endpoint: "search" | "browse",
    body: Record<string, unknown>
  ): Promise<SearchResponse> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "Waitrose/3.9.1 (Android)",
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    // Use -1 for anonymous users, customerId for logged-in users
    const customerId = this.customerId || "-1";
    const url = `${SEARCH_API_URL}/${endpoint}/${customerId}?clientType=WEB_APP`;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    // The API returns products inside componentsAndProducts[].searchProduct
    const raw = await response.json() as {
      totalMatches: number;
      productsInResultset?: number;
      componentsAndProducts?: Array<{ searchProduct?: SearchProduct }>;
    };

    // Map the raw response to our cleaner SearchResponse type
    const products: SearchProduct[] = [];
    if (raw.componentsAndProducts) {
      for (const item of raw.componentsAndProducts) {
        if (item.searchProduct) {
          products.push(item.searchProduct);
        }
      }
    }

    return {
      products,
      totalMatches: raw.totalMatches,
    };
  }

  // ==========================================================================
  // Session Management
  // ==========================================================================

  /** Log in with username and password */
  async login(username: string, password: string): Promise<Session> {
    const result = await this.graphql<{ data: { generateSession: Session & { failures: ApiFailure[] | null } } }>(
      QUERIES.NewSession,
      { input: { username, password, clientId: CLIENT_ID } }
    );

    const session = result.data.generateSession;
    if (session.failures?.length) {
      throw new Error(`Login failed: ${session.failures.map(f => f.message).join(", ")}`);
    }

    this.accessToken = session.accessToken;
    this.refreshToken = session.refreshToken;
    this.customerId = session.customerId;
    this.customerOrderId = session.customerOrderId;
    this.defaultBranchId = session.defaultBranchId;

    return session;
  }

  /** 
   * Re-authenticate using stored credentials.
   * Note: The Waitrose API doesn't support token refresh via GraphQL - 
   * re-login is required when the token expires.
   */
  async reAuthenticate(username: string, password: string): Promise<Session> {
    return this.login(username, password);
  }

  /** Check if the client is authenticated */
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  /** Log out and delete the session */
  async logout(): Promise<void> {
    await this.graphql(QUERIES.DeleteSession);
    this.accessToken = null;
    this.refreshToken = null;
    this.customerId = null;
    this.customerOrderId = null;
  }

  /** Get the current order ID */
  getOrderId(): string | null {
    return this.customerOrderId;
  }

  /** Get the current customer ID */
  getCustomerId(): string | null {
    return this.customerId;
  }

  // ==========================================================================
  // Shopping Context
  // ==========================================================================

  /** Get the current shopping context */
  async getShoppingContext(): Promise<ShoppingContext> {
    const result = await this.graphql<{ data: { shoppingContext: ShoppingContext } }>(QUERIES.GetShoppingContext);
    return result.data.shoppingContext;
  }

  // ==========================================================================
  // Account
  // ==========================================================================

  /** Get account profile and membership info */
  async getAccountInfo(): Promise<{ profile: AccountProfile; memberships: Membership[] | null }> {
    const result = await this.graphql<{ 
      data: { 
        getAccountProfile: AccountProfile; 
        getMemberships: { memberships: Membership[] } | null
      } 
    }>(QUERIES.GetAccountInfoAndMembership);

    return {
      profile: result.data.getAccountProfile,
      memberships: result.data.getMemberships?.memberships || null,
    };
  }

  // ==========================================================================
  // Trolley
  // ==========================================================================

  /** Get the current trolley contents */
  async getTrolley(orderId?: string): Promise<TrolleyResponse> {
    const id = orderId || this.customerOrderId;
    if (!id) throw new Error("No order ID available");

    const result = await this.graphql<{ data: { getTrolley: TrolleyResponse } }>(
      QUERIES.GetTrolley,
      { orderId: id }
    );

    return result.data.getTrolley;
  }

  /** Add or update items in the trolley */
  async updateTrolleyItems(items: TrolleyItemInput[], orderId?: string): Promise<TrolleyResponse> {
    const id = orderId || this.customerOrderId;
    if (!id) throw new Error("No order ID available");

    const result = await this.graphql<{ data: { updateTrolleyItems: TrolleyResponse } }>(
      QUERIES.UpdateTrolleyItems,
      { trolleyItemsInput: items, orderId: id }
    );

    return result.data.updateTrolleyItems;
  }

  /** Add an item to the trolley by line number */
  async addToTrolley(lineNumber: string, quantity: number = 1, uom: UnitOfMeasure = "C62"): Promise<TrolleyResponse> {
    return this.updateTrolleyItems([{ lineNumber, quantity: { amount: quantity, uom } }]);
  }

  /** Remove an item from the trolley */
  async removeFromTrolley(lineNumber: string): Promise<TrolleyResponse> {
    return this.updateTrolleyItems([{ lineNumber, quantity: { amount: 0, uom: "C62" } }]);
  }

  /** Empty the entire trolley */
  async emptyTrolley(orderId?: string): Promise<TrolleyResponse> {
    const id = orderId || this.customerOrderId;
    if (!id) throw new Error("No order ID available");

    const result = await this.graphql<{ data: { emptyTrolley: TrolleyResponse } }>(
      QUERIES.EmptyTrolley,
      { orderId: id }
    );

    return result.data.emptyTrolley;
  }

  // ==========================================================================
  // Orders
  // ==========================================================================

  /** 
   * Get all orders (pending and previous)
   * @param limit Max number of orders per category (API max is 15)
   */
  async getOrders(limit: number = 10): Promise<{ pending: Order[]; previous: Order[] }> {
    const [pending, previous] = await Promise.all([
      this.getPendingOrders(limit),
      this.getPreviousOrders(limit),
    ]);

    return { pending, previous };
  }

  /** 
   * Get pending orders only
   * @param limit Max number of orders to return (API max is 15)
   */
  async getPendingOrders(limit: number = 10): Promise<Order[]> {
    // API has a max page size of 15
    const effectiveLimit = Math.min(limit, 15);
    
    const result = await this.graphql<{ data: { pendingOrders: { content: Order[] } } }>(
      QUERIES.GetPendingOrders,
      { 
        getPendingOrdersInput: { 
          size: effectiveLimit, 
          sortBy: "+",  // ASCENDING
          statuses: ["PAYMENT_FAILED", "PLACED", "FULFIL", "PAID", "PICKED"]
        } 
      }
    );
    return result.data.pendingOrders?.content || [];
  }

  /** 
   * Get previous/completed orders
   * @param limit Max number of orders to return (API max is 15)
   */
  async getPreviousOrders(limit: number = 10): Promise<Order[]> {
    // API has a max page size of 15
    const effectiveLimit = Math.min(limit, 15);
    
    const result = await this.graphql<{ data: { previousOrders: { content: Order[] } } }>(
      QUERIES.GetPreviousOrders,
      { 
        getPreviousOrdersInput: { 
          size: effectiveLimit, 
          sortBy: "-",  // DESCENDING
          statuses: ["COMPLETED", "CANCELLED", "REFUND_PENDING"]
        } 
      }
    );
    return result.data.previousOrders?.content || [];
  }

  /** Get details for a specific order */
  async getOrder(customerOrderId: string): Promise<OrderDetails> {
    const result = await this.graphql<{ data: { getOrder: OrderDetails } }>(
      QUERIES.GetOrder,
      { customerOrderId }
    );
    return result.data.getOrder;
  }

  /** Cancel an order */
  async cancelOrder(customerOrderId: string): Promise<void> {
    const result = await this.graphql<{ data: { cancelOrder: { failures: ApiFailure[] | null } } }>(
      QUERIES.CancelOrder,
      { input: customerOrderId }
    );

    if (result.data.cancelOrder.failures?.length) {
      throw new Error(`Cancel failed: ${result.data.cancelOrder.failures.map(f => f.message).join(", ")}`);
    }
  }

  /** Start amending an existing order */
  async initiateAmendOrder(customerOrderId: string): Promise<void> {
    const result = await this.graphql<{ data: { amendOrder: { failures: ApiFailure[] | null } } }>(
      QUERIES.InitiateAmendOrder,
      { input: customerOrderId }
    );

    if (result.data.amendOrder.failures?.length) {
      throw new Error(`Amend failed: ${result.data.amendOrder.failures.map(f => f.message).join(", ")}`);
    }
  }

  /** Cancel amending an order */
  async cancelAmendOrder(customerOrderId: string): Promise<void> {
    const result = await this.graphql<{ data: { cancelAmendOrder: { failures: ApiFailure[] | null } } }>(
      QUERIES.CancelAmendOrder,
      { input: customerOrderId }
    );

    if (result.data.cancelAmendOrder.failures?.length) {
      throw new Error(`Cancel amend failed: ${result.data.cancelAmendOrder.failures.map(f => f.message).join(", ")}`);
    }
  }

  // ==========================================================================
  // Slots
  // ==========================================================================

  /** Get the currently booked slot */
  async getCurrentSlot(postcode?: string): Promise<CurrentSlot | null> {
    const result = await this.graphql<{ data: { currentSlot: CurrentSlot | null } }>(
      QUERIES.CurrentSlot,
      { input: { postcode, customerOrderId: this.customerOrderId } }
    );
    return result.data.currentSlot;
  }

  /** Get available slot dates */
  async getSlotDates(slotType: SlotType, branchId?: string, addressId?: string): Promise<SlotDate[]> {
    const result = await this.graphql<{ 
      data: { 
        slotDates: { 
          content: SlotDate[];
          failures: ApiFailure[] | null;
        } 
      } 
    }>(QUERIES.SlotDates, {
      slotDatesInput: {
        slotType,
        branchId: branchId || this.defaultBranchId,
        customerOrderId: this.customerOrderId,
        addressId,
      },
    });

    if (result.data.slotDates.failures?.length) {
      throw new Error(`Get slots failed: ${result.data.slotDates.failures.map(f => f.message).join(", ")}`);
    }

    return result.data.slotDates.content;
  }

  /** Get available slots for specific days */
  async getSlotDays(slotType: SlotType, fromDate: string, branchId?: string, addressId?: string): Promise<SlotDay[]> {
    const result = await this.graphql<{ 
      data: { 
        slotDays: { 
          content: SlotDay[];
          failures: ApiFailure[] | null;
        } 
      } 
    }>(QUERIES.SlotDays, {
      slotDaysInput: {
        slotType,
        branchId: branchId || this.defaultBranchId,
        customerOrderId: this.customerOrderId,
        addressId,
        fromDate,
      },
    });

    if (result.data.slotDays.failures?.length) {
      throw new Error(`Get slot days failed: ${result.data.slotDays.failures.map(f => f.message).join(", ")}`);
    }

    return result.data.slotDays.content;
  }

  /** Book a delivery/collection slot */
  async bookSlot(slotId: string, slotType: SlotType, addressId?: string): Promise<BookSlotResult> {
    const result = await this.graphql<{ 
      data: { 
        bookSlot: BookSlotResult & { failures: ApiFailure[] | null };
      } 
    }>(QUERIES.BookSlot, {
      input: {
        slotId,
        slotType,
        addressId,
      },
    });

    if (result.data.bookSlot.failures?.length) {
      throw new Error(`Book slot failed: ${result.data.bookSlot.failures.map(f => f.message).join(", ")}`);
    }

    return result.data.bookSlot;
  }

  // ==========================================================================
  // Campaigns
  // ==========================================================================

  /** Get active campaigns */
  async getCampaigns(): Promise<Campaign[]> {
    const result = await this.graphql<{ data: { campaigns: Campaign[] } }>(
      QUERIES.GetCampaigns
    );
    return result.data.campaigns;
  }

  // ==========================================================================
  // Product Search (REST API)
  // ==========================================================================

  /**
   * Search for products by text query
   * 
   * @example
   * ```ts
   * // Simple search
   * const results = await client.searchProducts("organic milk");
   * 
   * // Search with options (size defaults to API default, max ~128)
   * const results = await client.searchProducts("milk", {
   *   sortBy: "PRICE_LOW_2_HIGH",
   *   size: 24
   * });
   * ```
   */
  async searchProducts(
    searchTerm: string,
    options: Omit<SearchQueryParams, "searchTerm" | "category"> = {}
  ): Promise<SearchResponse> {
    const queryParams: SearchQueryParams = {
      searchTerm,
      start: options.start ?? 0,
      sortBy: options.sortBy ?? "RELEVANCE",
      ...options,
    };

    // Add branch ID if we have one
    if (this.defaultBranchId && !queryParams.branchId) {
      queryParams.branchId = this.defaultBranchId;
    }

    return this.restApi("search", {
      customerSearchRequest: { queryParams },
    });
  }

  /**
   * Browse products by category
   * 
   * @example
   * ```ts
   * // Browse a category
   * const results = await client.browseProducts("groceries/bakery/bread");
   * 
   * // Browse with sorting
   * const results = await client.browseProducts("groceries/dairy", {
   *   sortBy: "MOST_POPULAR"
   * });
   * ```
   */
  async browseProducts(
    category: string,
    options: Omit<SearchQueryParams, "searchTerm" | "category"> = {}
  ): Promise<SearchResponse> {
    const queryParams: SearchQueryParams = {
      category,
      start: options.start ?? 0,
      sortBy: options.sortBy ?? "RELEVANCE",
      ...options,
    };

    // Add branch ID if we have one
    if (this.defaultBranchId && !queryParams.branchId) {
      queryParams.branchId = this.defaultBranchId;
    }

    return this.restApi("browse", {
      customerSearchRequest: { queryParams },
    });
  }

  /**
   * Get product details by line numbers
   * 
   * @example
   * ```ts
   * const products = await client.getProductsByLineNumbers(["123456", "789012"]);
   * console.log(products[0].name); // "Waitrose Organic Milk 2 Pints"
   * ```
   */
  async getProductsByLineNumbers(lineNumbers: string[]): Promise<ProductDetail[]> {
    if (lineNumbers.length === 0) {
      return [];
    }

    // Join line numbers with + as per the API format
    const lineNumbersParam = lineNumbers.join("+");
    const url = `${PRODUCTS_API_URL}/${lineNumbersParam}`;

    const params: Record<string, string> = {
      view: "EXTENDED",
      excludeLinesWithConflicts: "false",
      filterByCustomerSlot: "false",
    };

    if (this.defaultBranchId) {
      params.branchId = this.defaultBranchId;
    }

    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${url}?${queryString}`;

    const headers: Record<string, string> = {
      "Accept": "application/json",
      "User-Agent": "Waitrose/3.9.1 (Android)",
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(fullUrl, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const result = await response.json() as { products?: ProductDetail[] };
    return result.products || [];
  }

  /**
   * Get products on promotion
   * 
   * @example
   * ```ts
   * const results = await client.getPromotionProducts("myWaitrose");
   * ```
   */
  async getPromotionProducts(
    promotionId: string,
    options: Omit<SearchQueryParams, "searchTerm" | "category" | "promotionId"> = {}
  ): Promise<SearchResponse> {
    const queryParams: SearchQueryParams = {
      promotionId,
      start: options.start ?? 0,
      sortBy: options.sortBy ?? "RELEVANCE",
      ...options,
    };

    if (this.defaultBranchId && !queryParams.branchId) {
      queryParams.branchId = this.defaultBranchId;
    }

    return this.restApi("search", {
      customerSearchRequest: { queryParams },
    });
  }

  /**
   * Search with filters
   * 
   * @example
   * ```ts
   * const results = await client.searchWithFilters("milk", {
   *   filterTags: [
   *     { group: "dietary", value: "vegan" },
   *     { group: "brand", value: "Oatly" }
   *   ]
   * });
   * ```
   */
  async searchWithFilters(
    searchTerm: string,
    filters: {
      filterTags?: FilterTag[];
      searchTags?: SearchTag[];
      sortBy?: SearchSortBy;
      start?: number;
      size?: number;
    }
  ): Promise<SearchResponse> {
    return this.searchProducts(searchTerm, filters);
  }

  /**
   * Paginated search helper
   * 
   * @example
   * ```ts
   * // Get page 2 (products 24-47)
   * const results = await client.searchProductsPage("milk", 2, 24);
   * ```
   */
  async searchProductsPage(
    searchTerm: string,
    page: number,
    pageSize: number = 24,
    options: Omit<SearchQueryParams, "searchTerm" | "category" | "start" | "size"> = {}
  ): Promise<SearchResponse> {
    return this.searchProducts(searchTerm, {
      ...options,
      start: (page - 1) * pageSize,
      size: pageSize,
    });
  }
}

// Export for default usage
export default WaitroseClient;

