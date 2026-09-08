export type InvoiceDocumentType = 'invoice';
export type InvoiceTemplate = 'ledger';
export type QrMode = '' | 'contact' | 'epc' | 'paymentLink';
export type StampStyle = 'round' | 'square' | 'none';
export type LogoMimeType = 'image/png' | 'image/jpeg';

export interface PublicPartyV1 {
  name: string;
  addressLines: string[];
}

export interface PublicItemV1 {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxLabel?: string;
}

export interface PublicPaymentV1 {
  bankName?: string;
  iban?: string;
  bic?: string;
  accountNumber?: string;
  routingNumber?: string;
  reference?: string;
  poNumber?: string;
  terms?: string;
  dueText?: string;
  qrMode?: QrMode;
}

export interface PublicLogoV1 {
  data: string;
  mimeType: LogoMimeType;
}

export interface PublicBrandingV1 {
  accentColor?: string;
  stampStyle?: StampStyle;
  logo?: PublicLogoV1;
}

/**
 * The currently released PublicDocumentV1 surface.
 *
 * InvoiceCraftly's server remains authoritative for validation, totals and
 * rendering. This type intentionally exposes only the document type/template
 * combination that the public API currently supports.
 */
export interface PublicDocumentV1 {
  type: InvoiceDocumentType;
  number?: string;
  issueDate: string;
  dueDate?: string;
  currency: string;
  locale?: string;
  template?: InvoiceTemplate;
  seller: PublicPartyV1;
  buyer: PublicPartyV1;
  items: PublicItemV1[];
  payment?: PublicPaymentV1;
  notes?: string;
  branding?: PublicBrandingV1;
}

export type VatCategoryCode = 'AE' | 'B' | 'E' | 'G' | 'K' | 'L' | 'M' | 'O' | 'S' | 'Z';
export type TaxIdRole = 'seller-id' | 'legal-registration' | 'tax-registration' | 'vat';

export interface CompliancePostalAddressV1 {
  countryCode?: string;
  city?: string;
  postalCode?: string;
  region?: string;
}

export interface ComplianceTaxIdV1 {
  role?: TaxIdRole;
  schemeId?: string;
  taxSchemeId?: string;
}

export interface ComplianceTaxRegistrationIdentifierV1 {
  value?: string;
  taxSchemeId?: string;
}

export interface CompliancePartyV1 {
  postalAddress?: CompliancePostalAddressV1;
  electronicAddressSchemeId?: string;
  taxId?: ComplianceTaxIdV1;
  vatIdentifier?: string;
  taxRegistrationIdentifier?: ComplianceTaxRegistrationIdentifierV1;
}

export interface ComplianceLineV1 {
  sourceIndex: number;
  unitCode?: string;
  vatCategoryCode?: VatCategoryCode;
  vatExemptionReason?: string;
  vatExemptionReasonCode?: string;
}

export interface ComplianceSupplementV1 {
  version?: 1;
  buyerReference?: string;
  seller?: CompliancePartyV1;
  buyer?: CompliancePartyV1;
  lines?: ComplianceLineV1[];
}

export interface PublicStructuredRequestV1 {
  document: PublicDocumentV1;
  supplement?: ComplianceSupplementV1;
}

export interface ReadinessGapV1 {
  id: string;
  message: string;
}

export interface ReadinessResultV1 {
  apiVersion: 'v1';
  profileId: string;
  specificationIdentifier: string;
  ready: boolean;
  gaps: ReadinessGapV1[];
}

export interface StructuredArtifactV1 {
  mediaType: 'application/xml';
  content: string;
}

export interface StructuredResultV1 extends ReadinessResultV1 {
  artifact: StructuredArtifactV1 | null;
}

export interface PdfResult {
  data: Uint8Array;
  renderDurationMs: number | null;
  requestId: string | null;
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface InvoiceCraftlyClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: FetchLike;
}
