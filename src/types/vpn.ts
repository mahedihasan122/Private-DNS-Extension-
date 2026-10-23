export type DnsProviderId =
  | 'adguard-family'
  | 'cloudflare-family'
  | 'cleanbrowsing-adult'
  | 'adguard-default'
  | 'quad9-secure'
  | 'custom';

export interface DnsProvider {
  id: DnsProviderId;
  name: string;
  tagline: string;
  dohEndpoint: string;
  primaryIp: string;
  secondaryIp: string;
  blocksAds: boolean;
  blocksAdult: boolean;
  enforcesSafeSearch: boolean;
  blocksMalware: boolean;
  avgLatencyMs: number;
  location: string;
}

export interface FilterConfig {
  // Master VPN & DNS Shield
  vpnEnabled: boolean;
  dnsLeakProtection: boolean;
  webrtcIpHide: boolean;
  httpsUpgrade: boolean;

  // Ad & Tracker Blocking
  blockBannerAds: boolean;
  blockVideoAds: boolean;
  blockPopups: boolean;
  blockTrackers: boolean;
  blockMalwarePhishing: boolean;
  stripTrackingParams: boolean;

  // Granular 18+ Content & Media Blocking
  blockAdultDomains: boolean;
  blockAdultImages: boolean;
  blockAdultVideos: boolean;
  blockAdultAudio: boolean;
  strictKeywordScanner: boolean;
  enforceSafeSearch: boolean;
  blurSuspectedMedia: boolean;
}

export type RuleType = 'block' | 'allow';
export type RuleCategory = '18+' | 'ads' | 'tracker' | 'custom';
export type ResourceScope = 'all' | 'domain' | 'image' | 'video' | 'audio' | 'script';

export interface CustomRule {
  id: string;
  pattern: string;
  type: RuleType;
  category: RuleCategory;
  scope: ResourceScope;
  note: string;
  hits: number;
  createdAt: string;
}

export interface DnsQueryLogEntry {
  id: string;
  timestamp: string;
  domain: string;
  resourceType: 'domain' | 'image' | 'video' | 'audio' | 'ad-script' | 'tracker';
  action: 'blocked-18+' | 'blocked-ad' | 'allowed' | 'whitelisted';
  reason: string;
  providerName: string;
  resolvedIp: string;
  latencyMs: number;
}

export interface PinSecurityState {
  enabled: boolean;
  pinCode: string;
  lock18PlusSettings: boolean;
  lockDnsServer: boolean;
  lockWhitelist: boolean;
  unlockedUntil: number | null; // timestamp ms
}

export type NavigationTab =
  | 'overview'
  | 'dns-system'
  | 'adult-media-filter'
  | 'ad-tracker-blocker'
  | 'custom-rules'
  | 'query-log'
  | 'sandbox-tester'
  | 'pin-security'
  | 'extension-export';

export const DNS_PROVIDERS: DnsProvider[] = [
  {
    id: 'adguard-family',
    name: 'AdGuard Family Protection DNS',
    tagline: 'Blocks all web ads, trackers, 18+ adult domains & forces SafeSearch',
    dohEndpoint: 'https://family.adguard-dns.com/dns-query',
    primaryIp: '94.140.14.15',
    secondaryIp: '94.140.15.16',
    blocksAds: true,
    blocksAdult: true,
    enforcesSafeSearch: true,
    blocksMalware: true,
    avgLatencyMs: 18,
    location: 'Global Anycast (Encrypted DoH)',
  },
  {
    id: 'cloudflare-family',
    name: 'Cloudflare 1.1.1.3 Family Shield',
    tagline: 'Ultra-fast 1.1.1.3 DNS system blocking 18+ adult sites & malware',
    dohEndpoint: 'https://family.cloudflare-dns.com/dns-query',
    primaryIp: '1.1.1.3',
    secondaryIp: '1.0.0.3',
    blocksAds: false,
    blocksAdult: true,
    enforcesSafeSearch: true,
    blocksMalware: true,
    avgLatencyMs: 11,
    location: 'Cloudflare Edge (300+ Cities)',
  },
  {
    id: 'cleanbrowsing-adult',
    name: 'CleanBrowsing Adult & Media Filter',
    tagline: 'Strict DNS filtering for 18+ video/image/audio hosts & explicit portals',
    dohEndpoint: 'https://doh.cleanbrowsing.org/doh/adult-filter/',
    primaryIp: '185.228.168.10',
    secondaryIp: '185.228.169.11',
    blocksAds: false,
    blocksAdult: true,
    enforcesSafeSearch: true,
    blocksMalware: true,
    avgLatencyMs: 24,
    location: 'Anycast Security Network',
  },
  {
    id: 'adguard-default',
    name: 'AdGuard Ad-Blocking DNS',
    tagline: 'Blocks banner ads, video ads, pop-ups & analytics trackers',
    dohEndpoint: 'https://dns.adguard-dns.com/dns-query',
    primaryIp: '94.140.14.14',
    secondaryIp: '94.140.15.15',
    blocksAds: true,
    blocksAdult: false,
    enforcesSafeSearch: false,
    blocksMalware: true,
    avgLatencyMs: 19,
    location: 'Global Anycast (Encrypted DoH)',
  },
  {
    id: 'quad9-secure',
    name: 'Quad9 Encrypted Privacy DNS',
    tagline: 'Zero-logging Swiss privacy DNS with threat & spyware blocking',
    dohEndpoint: 'https://dns.quad9.net/dns-query',
    primaryIp: '9.9.9.9',
    secondaryIp: '149.112.112.112',
    blocksAds: false,
    blocksAdult: false,
    enforcesSafeSearch: false,
    blocksMalware: true,
    avgLatencyMs: 22,
    location: 'Zurich Privacy Jurisdiction',
  },
  {
    id: 'custom',
    name: 'Custom DNS-over-HTTPS Server',
    tagline: 'Connect your own NextDNS, ControlD, or private DoH resolver',
    dohEndpoint: 'https://dns.nextdns.io/custom-profile',
    primaryIp: '45.90.28.0',
    secondaryIp: '45.90.30.0',
    blocksAds: true,
    blocksAdult: true,
    enforcesSafeSearch: true,
    blocksMalware: true,
    avgLatencyMs: 26,
    location: 'User Defined Endpoint',
  },
];

export const INITIAL_FILTER_CONFIG: FilterConfig = {
  vpnEnabled: true,
  dnsLeakProtection: true,
  webrtcIpHide: true,
  httpsUpgrade: true,

  blockBannerAds: true,
  blockVideoAds: true,
  blockPopups: true,
  blockTrackers: true,
  blockMalwarePhishing: true,
  stripTrackingParams: true,

  blockAdultDomains: true,
  blockAdultImages: true,
  blockAdultVideos: true,
  blockAdultAudio: true,
  strictKeywordScanner: true,
  enforceSafeSearch: true,
  blurSuspectedMedia: true,
};

export const INITIAL_CUSTOM_RULES: CustomRule[] = [
  {
    id: 'rule-1',
    pattern: '*.doubleclick.net',
    type: 'block',
    category: 'ads',
    scope: 'all',
    note: 'Google Display & Video Ad Network',
    hits: 1420,
    createdAt: '2026-10-20',
  },
  {
    id: 'rule-2',
    pattern: '*.googlesyndication.com',
    type: 'block',
    category: 'ads',
    scope: 'script',
    note: 'Web banner & pop-under ad scripts',
    hits: 984,
    createdAt: '2026-10-20',
  },
  {
    id: 'rule-3',
    pattern: '*adult-video-cdn.example.net/*',
    type: 'block',
    category: '18+',
    scope: 'video',
    note: '18+ video streaming & HLS segments',
    hits: 312,
    createdAt: '2026-10-21',
  },
  {
    id: 'rule-4',
    pattern: '*nsfw-img-host.example.org/*.jpg',
    type: 'block',
    category: '18+',
    scope: 'image',
    note: 'Explicit 18+ image gallery server',
    hits: 645,
    createdAt: '2026-10-21',
  },
  {
    id: 'rule-5',
    pattern: '*explicit-audio-stream.example.com/*',
    type: 'block',
    category: '18+',
    scope: 'audio',
    note: '18+ audio stream & podcast host',
    hits: 89,
    createdAt: '2026-10-22',
  },
  {
    id: 'rule-6',
    pattern: '*.popads.net',
    type: 'block',
    category: 'ads',
    scope: 'all',
    note: 'Intrusive pop-up and tab-under network',
    hits: 530,
    createdAt: '2026-10-22',
  },
  {
    id: 'rule-7',
    pattern: 'educational-anatomy.org',
    type: 'allow',
    category: 'custom',
    scope: 'domain',
    note: 'Whitelisted medical & academic reference site',
    hits: 42,
    createdAt: '2026-10-23',
  },
];

export const INITIAL_QUERY_LOGS: DnsQueryLogEntry[] = [
  {
    id: 'log-101',
    timestamp: '09:04:12.402',
    domain: 'pagead2.googlesyndication.com',
    resourceType: 'ad-script',
    action: 'blocked-ad',
    reason: 'AdGuard DNS + Declarative Rule #2',
    providerName: 'AdGuard Family DNS',
    resolvedIp: '0.0.0.0',
    latencyMs: 2,
  },
  {
    id: 'log-102',
    timestamp: '09:04:10.118',
    domain: 'cdn-nsfw-media.xvideos-cdn-sim.net',
    resourceType: 'video',
    action: 'blocked-18+',
    reason: '18+ Video Stream Shield (Media Resource Filter)',
    providerName: 'AdGuard Family DNS',
    resolvedIp: '0.0.0.0',
    latencyMs: 1,
  },
  {
    id: 'log-103',
    timestamp: '09:04:08.890',
    domain: 'img-explicit-gallery.adult-sim.org',
    resourceType: 'image',
    action: 'blocked-18+',
    reason: '18+ Image Blocker (MIME image/jpeg intercepted)',
    providerName: 'AdGuard Family DNS',
    resolvedIp: '0.0.0.0',
    latencyMs: 1,
  },
  {
    id: 'log-104',
    timestamp: '09:04:05.512',
    domain: 'audio-erotica-stream.nsfw-sim.fm',
    resourceType: 'audio',
    action: 'blocked-18+',
    reason: '18+ Audio Stream Filter (MIME audio/mpeg blocked)',
    providerName: 'AdGuard Family DNS',
    resolvedIp: '0.0.0.0',
    latencyMs: 2,
  },
  {
    id: 'log-105',
    timestamp: '09:04:01.204',
    domain: 'www.google.com',
    resourceType: 'domain',
    action: 'allowed',
    reason: 'SafeSearch CNAME Enforced (forcesafesearch.google.com)',
    providerName: 'AdGuard Family DNS',
    resolvedIp: '216.239.38.120',
    latencyMs: 16,
  },
  {
    id: 'log-106',
    timestamp: '09:03:54.771',
    domain: 'ad.doubleclick.net',
    resourceType: 'ad-script',
    action: 'blocked-ad',
    reason: 'Total Ad Blocker Engine',
    providerName: 'AdGuard Family DNS',
    resolvedIp: '0.0.0.0',
    latencyMs: 1,
  },
  {
    id: 'log-107',
    timestamp: '09:03:49.015',
    domain: 'educational-anatomy.org',
    resourceType: 'domain',
    action: 'whitelisted',
    reason: 'User Custom Whitelist Rule #7',
    providerName: 'AdGuard Family DNS',
    resolvedIp: '104.21.44.19',
    latencyMs: 19,
  },
];
