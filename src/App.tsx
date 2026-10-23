import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Globe,
  ImageOff,
  VideoOff,
  VolumeX,
  Ban,
  ListFilter,
  Activity,
  Lock,
  Download,
  Search,
  Plus,
  Trash2,
  Copy,
  Check,
  Play,
  Terminal,
  Sliders,
  EyeOff,
  FileCode,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import {
  CustomRule,
  DNS_PROVIDERS,
  DnsProvider,
  DnsQueryLogEntry,
  FilterConfig,
  INITIAL_CUSTOM_RULES,
  INITIAL_FILTER_CONFIG,
  INITIAL_QUERY_LOGS,
  NavigationTab,
  PinSecurityState,
  ResourceScope,
  RuleCategory,
  RuleType,
} from './types/vpn';
import { ExtensionPopupPreview } from './components/ExtensionPopupPreview';
import { PinGuardModal } from './components/PinGuardModal';
import { SandboxTesterView } from './components/SandboxTesterView';
import {
  createExtensionZipBlob,
  generateExtensionFiles,
} from './utils/extensionBuilder';

const STORAGE_KEY = 'aegis_dns_guard_state_v1';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');

  // Core state with localStorage persistence
  const [selectedProviderId, setSelectedProviderId] = useState<string>('adguard-family');
  const [customDohUrl, setCustomDohUrl] = useState<string>(
    'https://family.adguard-dns.com/dns-query'
  );
  const [customPrimaryIp, setCustomPrimaryIp] = useState<string>('94.140.14.15');

  const [filters, setFilters] = useState<FilterConfig>(INITIAL_FILTER_CONFIG);
  const [customRules, setCustomRules] = useState<CustomRule[]>(INITIAL_CUSTOM_RULES);
  const [queryLogs, setQueryLogs] = useState<DnsQueryLogEntry[]>(INITIAL_QUERY_LOGS);

  const [pinState, setPinState] = useState<PinSecurityState>({
    enabled: false,
    pinCode: '1234',
    lock18PlusSettings: true,
    lockDnsServer: true,
    lockWhitelist: true,
    unlockedUntil: null,
  });

  const [stats, setStats] = useState({
    adsBlocked: 3428,
    adultBlocked: 419,
    mediaFiltered: 1046,
    dnsQueries: 18940,
  });

  // Load saved state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedProviderId) setSelectedProviderId(parsed.selectedProviderId);
        if (parsed.customDohUrl) setCustomDohUrl(parsed.customDohUrl);
        if (parsed.customPrimaryIp) setCustomPrimaryIp(parsed.customPrimaryIp);
        if (parsed.filters) setFilters(parsed.filters);
        if (parsed.customRules) setCustomRules(parsed.customRules);
        if (parsed.pinState) setPinState(parsed.pinState);
        if (parsed.stats) setStats(parsed.stats);
      }
    } catch (_) {
      // Ignore storage parse errors
    }
  }, []);

  // Save state changes
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          selectedProviderId,
          customDohUrl,
          customPrimaryIp,
          filters,
          customRules,
          pinState,
          stats,
        })
      );
    } catch (_) {
      // Ignore storage quota errors
    }
  }, [
    selectedProviderId,
    customDohUrl,
    customPrimaryIp,
    filters,
    customRules,
    pinState,
    stats,
  ]);

  // Active DNS Provider object
  const activeProvider: DnsProvider = useMemo(() => {
    const base =
      DNS_PROVIDERS.find((p) => p.id === selectedProviderId) || DNS_PROVIDERS[0];
    if (base.id === 'custom') {
      return {
        ...base,
        dohEndpoint: customDohUrl,
        primaryIp: customPrimaryIp,
      };
    }
    return base;
  }, [selectedProviderId, customDohUrl, customPrimaryIp]);

  // PIN Guard Modal State
  const [pinModal, setPinModal] = useState<{
    isOpen: boolean;
    description: string;
    onVerified: () => void;
  }>({
    isOpen: false,
    description: '',
    onVerified: () => {},
  });

  // Helper to guard sensitive actions with PIN when enabled
  const executeWithPinCheck = (
    requiresPin: boolean,
    description: string,
    action: () => void
  ) => {
    if (!pinState.enabled || !requiresPin) {
      action();
      return;
    }
    setPinModal({
      isOpen: true,
      description,
      onVerified: () => {
        setPinModal((prev) => ({ ...prev, isOpen: false }));
        action();
      },
    });
  };

  // Toggle any filter with PIN check if disabling protection
  const handleToggleFilter = (key: keyof FilterConfig) => {
    const currentValue = filters[key];
    const isTurningOff = currentValue === true;

    const isSensitiveFilter = [
      'vpnEnabled',
      'blockAdultDomains',
      'blockAdultImages',
      'blockAdultVideos',
      'blockAdultAudio',
      'strictKeywordScanner',
      'enforceSafeSearch',
    ].includes(key);

    executeWithPinCheck(
      isTurningOff && isSensitiveFilter && pinState.lock18PlusSettings,
      `Disabling "${key}" protection filter`,
      () => {
        setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
      }
    );
  };

  // Switch DNS Provider with PIN check if leaving a Family/Adult-blocking DNS
  const handleSelectProvider = (provider: DnsProvider) => {
    const isDowngradingAdultBlock =
      activeProvider.blocksAdult && !provider.blocksAdult;
    executeWithPinCheck(
      isDowngradingAdultBlock && pinState.lockDnsServer,
      `Switching DNS server from ${activeProvider.name} to ${provider.name}`,
      () => {
        setSelectedProviderId(provider.id);
      }
    );
  };

  // Live DoH Resolver Tester State
  const [dohTestDomain, setDohTestDomain] = useState<string>('doubleclick.net');
  const [dohTestLoading, setDohTestLoading] = useState<boolean>(false);
  const [dohTestOutput, setDohTestOutput] = useState<{
    domain: string;
    verdict: 'blocked-18+' | 'blocked-ad' | 'allowed' | 'whitelisted';
    reason: string;
    records: string[];
    latencyMs: number;
    providerUsed: string;
  } | null>(null);

  const runLiveDohLookup = async (e?: React.FormEvent, overrideDomain?: string) => {
    if (e) e.preventDefault();
    const target = (overrideDomain ?? dohTestDomain).trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (!target) return;
    if (overrideDomain) setDohTestDomain(target);

    setDohTestLoading(true);
    const start = performance.now();

    // Check custom whitelist first
    const whitelisted = customRules.find(
      (r) => r.type === 'allow' && target.includes(r.pattern.replace(/\*/g, ''))
    );
    const customBlocked = customRules.find(
      (r) => r.type === 'block' && target.includes(r.pattern.replace(/\*/g, ''))
    );

    const isAdultDomain =
      /pornhub|xvideos|xnxx|xhamster|onlyfans|redtube|youporn|brazzers|chaturbate|adult|nsfw|xxx|18plus|erotic/.test(
        target
      );
    const isAdDomain =
      /doubleclick|googlesyndication|googleadservices|popads|adsterra|taboola|outbrain|adnxs|criteo|analytics/.test(
        target
      );

    let records: string[] = [];
    try {
      const response = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(target)}&type=A`,
        {
          headers: { accept: 'application/dns-json' },
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.Answer)) {
          records = data.Answer.map((ans: { data: string; TTL: number }) => `${ans.data} (TTL ${ans.TTL}s)`);
        }
      }
    } catch (_) {
      records = ['104.21.55.12 (Simulated Edge Resolution)'];
    }

    const elapsed = Math.max(2, Math.round(performance.now() - start));

    let verdict: 'blocked-18+' | 'blocked-ad' | 'allowed' | 'whitelisted' = 'allowed';
    let reason = `Resolved cleanly via ${activeProvider.name}`;

    if (whitelisted) {
      verdict = 'whitelisted';
      reason = `Allowed by Custom Whitelist Rule (${whitelisted.pattern})`;
    } else if (
      filters.vpnEnabled &&
      (filters.blockAdultDomains || activeProvider.blocksAdult) &&
      (isAdultDomain || (customBlocked && customBlocked.category === '18+'))
    ) {
      verdict = 'blocked-18+';
      reason = `Sinkholed (0.0.0.0) by ${activeProvider.name} + 18+ Domain/Media Filter`;
      records = ['0.0.0.0 (Blocked by AegisDNS 18+ Shield)'];
    } else if (
      filters.vpnEnabled &&
      (filters.blockBannerAds || filters.blockTrackers || activeProvider.blocksAds) &&
      (isAdDomain || (customBlocked && customBlocked.category !== '18+'))
    ) {
      verdict = 'blocked-ad';
      reason = `Blocked by Total Ad & Tracker Blocker (${activeProvider.name})`;
      records = ['0.0.0.0 (Null-routed Ad/Tracker Host)'];
    } else if (records.length === 0) {
      records = ['No A records returned (NXDOMAIN or sinkholed)'];
    }

    setDohTestOutput({
      domain: target,
      verdict,
      reason,
      records,
      latencyMs: elapsed,
      providerUsed: `${activeProvider.name} (${activeProvider.primaryIp})`,
    });

    // Append to live query log
    const nowStr = new Date().toTimeString().split(' ')[0] + '.' + String(Date.now() % 1000).padStart(3, '0');
    const newEntry: DnsQueryLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: nowStr,
      domain: target,
      resourceType: isAdultDomain ? 'video' : isAdDomain ? 'ad-script' : 'domain',
      action: verdict,
      reason,
      providerName: activeProvider.name,
      resolvedIp: verdict.startsWith('blocked') ? '0.0.0.0' : records[0]?.split(' ')[0] || activeProvider.primaryIp,
      latencyMs: elapsed,
    };
    setQueryLogs((prev) => [newEntry, ...prev.slice(0, 49)]);
    setStats((prev) => ({
      adsBlocked: prev.adsBlocked + (verdict === 'blocked-ad' ? 1 : 0),
      adultBlocked: prev.adultBlocked + (verdict === 'blocked-18+' ? 1 : 0),
      mediaFiltered: prev.mediaFiltered + (verdict === 'blocked-18+' ? 1 : 0),
      dnsQueries: prev.dnsQueries + 1,
    }));

    setDohTestLoading(false);
  };

  // Custom Rule Form State
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleType, setNewRuleType] = useState<RuleType>('block');
  const [newRuleCategory, setNewRuleCategory] = useState<RuleCategory>('18+');
  const [newRuleScope, setNewRuleScope] = useState<ResourceScope>('all');
  const [newRuleNote, setNewRuleNote] = useState('');
  const [ruleFilterTab, setRuleFilterTab] = useState<'all' | 'block' | 'allow'>('all');

  const handleAddCustomRule = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newRulePattern.trim();
    if (!cleaned) return;

    executeWithPinCheck(
      newRuleType === 'allow' && pinState.lockWhitelist,
      `Adding "${cleaned}" to Whitelist`,
      () => {
        const created: CustomRule = {
          id: `rule-${Date.now()}`,
          pattern: cleaned,
          type: newRuleType,
          category: newRuleCategory,
          scope: newRuleScope,
          note: newRuleNote.trim() || `${newRuleCategory.toUpperCase()} ${newRuleScope} rule`,
          hits: 0,
          createdAt: new Date().toISOString().split('T')[0],
        };
        setCustomRules((prev) => [created, ...prev]);
        setNewRulePattern('');
        setNewRuleNote('');
      }
    );
  };

  const handleDeleteCustomRule = (rule: CustomRule) => {
    executeWithPinCheck(
      rule.type === 'block' && pinState.lock18PlusSettings,
      `Deleting blocklist rule "${rule.pattern}"`,
      () => {
        setCustomRules((prev) => prev.filter((r) => r.id !== rule.id));
      }
    );
  };

  // Query Log Filtering State
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState<
    'all' | 'blocked-18+' | 'blocked-ad' | 'allowed'
  >('all');

  const filteredLogs = useMemo(() => {
    return queryLogs.filter((item) => {
      const matchesAction =
        logActionFilter === 'all' ||
        (logActionFilter === 'allowed'
          ? item.action === 'allowed' || item.action === 'whitelisted'
          : item.action === logActionFilter);
      const matchesSearch =
        !logSearch.trim() ||
        item.domain.toLowerCase().includes(logSearch.toLowerCase()) ||
        item.reason.toLowerCase().includes(logSearch.toLowerCase()) ||
        item.resourceType.toLowerCase().includes(logSearch.toLowerCase());
      return matchesAction && matchesSearch;
    });
  }, [queryLogs, logSearch, logActionFilter]);

  // PIN Configuration Form State
  const [newPinInput, setNewPinInput] = useState('');
  const [pinSavedMessage, setPinSavedMessage] = useState('');

  // Extension Export Files & ZIP download
  const generatedFiles = useMemo(
    () => generateExtensionFiles(activeProvider, filters, customRules, pinState),
    [activeProvider, filters, customRules, pinState]
  );
  const [selectedExportFile, setSelectedExportFile] = useState<string>('manifest.json');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [zipDownloadToast, setZipDownloadToast] = useState<boolean>(false);

  const handleDownloadExtensionZip = () => {
    const blob = createExtensionZipBlob(generatedFiles);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aegis-dns-guard-extension.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setZipDownloadToast(true);
    setTimeout(() => setZipDownloadToast(false), 4000);
  };

  const handleCopyCode = (filename: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(filename);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  // Record simulated blocks from Sandbox Tester
  const handleRecordSimulatedBlock = (
    domain: string,
    resourceType: 'domain' | 'image' | 'video' | 'audio' | 'ad-script',
    action: 'blocked-18+' | 'blocked-ad' | 'allowed',
    reason: string
  ) => {
    const nowStr =
      new Date().toTimeString().split(' ')[0] +
      '.' +
      String(Date.now() % 1000).padStart(3, '0');
    const entry: DnsQueryLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowStr,
      domain,
      resourceType,
      action,
      reason,
      providerName: activeProvider.name,
      resolvedIp: action === 'allowed' ? activeProvider.primaryIp : '0.0.0.0',
      latencyMs: action === 'allowed' ? activeProvider.avgLatencyMs : 1,
    };
    setQueryLogs((prev) => [entry, ...prev.slice(0, 49)]);
    setStats((prev) => ({
      adsBlocked: prev.adsBlocked + (action === 'blocked-ad' ? 1 : 0),
      adultBlocked:
        prev.adultBlocked + (action === 'blocked-18+' && resourceType === 'domain' ? 1 : 0),
      mediaFiltered:
        prev.mediaFiltered +
        (action === 'blocked-18+' && resourceType !== 'domain' ? 1 : 0),
      dnsQueries: prev.dnsQueries + 1,
    }));
  };

  const navItems: {
    id: NavigationTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'overview', label: 'Control Dashboard', icon: Shield },
    { id: 'dns-system', label: 'DNS System Server', icon: Globe },
    { id: 'adult-media-filter', label: '18+ & Media Blocker', icon: EyeOff },
    { id: 'ad-tracker-blocker', label: 'Web Ad & Tracker Off', icon: Ban },
    { id: 'custom-rules', label: 'Blocklist & Whitelist', icon: ListFilter },
    { id: 'query-log', label: 'Live DNS Query Log', icon: Activity },
    { id: 'sandbox-tester', label: 'Live Webpage Sandbox', icon: Play },
    { id: 'pin-security', label: 'PIN Lock Guard', icon: Lock },
    { id: 'extension-export', label: 'Chrome Extension (.zip)', icon: FileCode },
  ];

  const currentTabTitle =
    navItems.find((item) => item.id === activeTab)?.label || 'Control Dashboard';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Compliant 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-950 border-b border-slate-800 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark / contextual breadcrumb */}
        <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
          <span>AegisDNS Guard</span>
          <span className="text-slate-600 font-normal">/</span>
          <span className="text-slate-300 font-medium">{currentTabTitle}</span>
        </div>

        {/* Zone 2: 4-5 concise single-line text navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('overview')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'overview' ? 'text-slate-100 underline underline-offset-4' : ''
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('dns-system')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'dns-system' ? 'text-slate-100 underline underline-offset-4' : ''
            }`}
          >
            DNS Server
          </button>
          <button
            onClick={() => setActiveTab('adult-media-filter')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'adult-media-filter'
                ? 'text-slate-100 underline underline-offset-4'
                : ''
            }`}
          >
            18+ Media Shield
          </button>
          <button
            onClick={() => setActiveTab('ad-tracker-blocker')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'ad-tracker-blocker'
                ? 'text-slate-100 underline underline-offset-4'
                : ''
            }`}
          >
            Ad Blocker
          </button>
          <button
            onClick={() => setActiveTab('sandbox-tester')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'sandbox-tester'
                ? 'text-slate-100 underline underline-offset-4'
                : ''
            }`}
          >
            Live Testbed
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleDownloadExtensionZip}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Extension (.zip)</span>
          </button>
        </div>
      </header>

      {/* Optional Download Toast Notification */}
      {zipDownloadToast && (
        <div className="bg-emerald-950/90 border-b border-emerald-700/60 px-6 py-2.5 text-xs text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>aegis-dns-guard-extension.zip</strong> downloaded! Extract the folder and load it in{' '}
              <code className="font-mono text-emerald-300">chrome://extensions</code> (Developer Mode &rarr; Load unpacked).
            </span>
          </div>
          <button
            onClick={() => setActiveTab('extension-export')}
            className="text-xs font-semibold text-emerald-300 underline whitespace-nowrap shrink-0"
          >
            View Setup Guide (English & বাংলা)
          </button>
        </div>
      )}

      {/* Main Workspace Layout: Sidebar + Main Viewport + Live Extension Popup Simulator */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto flex flex-col lg:flex-row">
        {/* Left Navigation Sidebar (260px on desktop) */}
        <aside className="w-full lg:w-[250px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950 p-4">
          <div className="text-xs font-medium text-slate-400 px-3 mb-2">
            Extension Control Modules
          </div>
          <div className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-indigo-400' : 'text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active DNS Summary in Sidebar Footer */}
          <div className="hidden lg:block mt-8 pt-6 border-t border-slate-800/80 px-3 space-y-3">
            <div>
              <div className="text-[11px] text-slate-400">Active DNS System</div>
              <div className="text-xs font-semibold text-slate-200 mt-0.5">
                {activeProvider.name}
              </div>
              <div className="text-xs font-mono tabular-nums text-indigo-400 mt-0.5">
                {activeProvider.primaryIp} · {activeProvider.avgLatencyMs}ms
              </div>
            </div>

            <div className="text-[11px] text-slate-400 leading-relaxed">
              <span>18+ Filter: {filters.blockAdultDomains ? 'Strict' : 'Off'}</span>
              <span aria-hidden="true"> · </span>
              <span>Ad Block: {filters.blockBannerAds ? 'Total' : 'Off'}</span>
              <span aria-hidden="true"> · </span>
              <span>PIN: {pinState.enabled ? 'Locked' : 'Open'}</span>
            </div>
          </div>
        </aside>

        {/* Center Main Content Area + Right Docked Extension Popup Preview */}
        <main className="flex-1 p-6 lg:p-8 flex flex-col xl:flex-row gap-8 items-start min-w-0">
          {/* Active Module Content */}
          <div className="flex-1 w-full min-w-0 space-y-6">
            {/* TAB 1: OVERVIEW DASHBOARD */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Hero Control Banner */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span>DNS-over-HTTPS Privacy VPN</span>
                        <span aria-hidden="true">·</span>
                        <span>Total Web Ad Blocker</span>
                        <span aria-hidden="true">·</span>
                        <span>18+ Image, Audio, Video & Site Filter</span>
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
                        {filters.vpnEnabled
                          ? 'Your Internet Privacy, Ad Blocker & 18+ Media Shield Are Active'
                          : 'DNS Protection Is Currently Paused'}
                      </h1>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        Routing DNS lookups through{' '}
                        <strong className="text-slate-200">{activeProvider.name}</strong> (
                        <code className="font-mono text-indigo-300">
                          {activeProvider.primaryIp}
                        </code>
                        ). Customize your 18+ image, video, audio, and ad-blocking rules below, test them live, and download your ready-to-install Chrome Extension.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
                      <button
                        onClick={() => handleToggleFilter('vpnEnabled')}
                        className={`px-5 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                          filters.vpnEnabled
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        {filters.vpnEnabled
                          ? 'DNS Shield Connected (Turn Off)'
                          : 'Enable DNS Protection Now'}
                      </button>
                      <button
                        onClick={() => setActiveTab('extension-export')}
                        className="px-5 py-2.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors whitespace-nowrap shrink-0"
                      >
                        Install Guide & Extension Code
                      </button>
                    </div>
                  </div>

                  {/* 4-Column Telemetry Strip (Tabular Numerals) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
                    <div>
                      <div className="text-xs text-slate-400">Web & Video Ads Blocked</div>
                      <div className="text-2xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
                        {stats.adsBlocked.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Banners · Pop-ups · Trackers
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">18+ Websites Blocked</div>
                      <div className="text-2xl font-bold font-mono tabular-nums text-rose-400 mt-1">
                        {stats.adultBlocked.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        DNS Sinkhole · SafeSearch ON
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">18+ Images, Video & Audio</div>
                      <div className="text-2xl font-bold font-mono tabular-nums text-amber-400 mt-1">
                        {stats.mediaFiltered.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        IMG · MP4/HLS · MP3 Filtered
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Encrypted DoH Queries</div>
                      <div className="text-2xl font-bold font-mono tabular-nums text-indigo-400 mt-1">
                        {stats.dnsQueries.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Avg Latency: {activeProvider.avgLatencyMs}ms
                      </div>
                    </div>
                  </div>
                </div>

                {/* One-Click Protection Profiles */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-100">
                        01. One-Click Protection Presets
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Apply a pre-configured DNS + Ad + 18+ Media filtering profile immediately
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={() => {
                        setSelectedProviderId('adguard-family');
                        setFilters({
                          ...INITIAL_FILTER_CONFIG,
                          vpnEnabled: true,
                          blockBannerAds: true,
                          blockVideoAds: true,
                          blockPopups: true,
                          blockTrackers: true,
                          blockAdultDomains: true,
                          blockAdultImages: true,
                          blockAdultVideos: true,
                          blockAdultAudio: true,
                          enforceSafeSearch: true,
                        });
                      }}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/60 text-left transition-colors"
                    >
                      <div className="text-sm font-bold text-slate-100">
                        Total Shield (Ads + Strict 18+ Media)
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Activates AdGuard Family DNS, blocks all web/video ads, and blocks 18+ websites, images, videos, and audio.
                      </p>
                      <div className="text-xs text-indigo-400 font-medium mt-3">
                        Apply Maximum Profile &rarr;
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedProviderId('cloudflare-family');
                        setFilters((prev) => ({
                          ...prev,
                          vpnEnabled: true,
                          blockAdultDomains: true,
                          blockAdultImages: true,
                          blockAdultVideos: true,
                          blockAdultAudio: true,
                          enforceSafeSearch: true,
                        }));
                      }}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/60 text-left transition-colors"
                    >
                      <div className="text-sm font-bold text-slate-100">
                        Cloudflare 1.1.1.3 Ultra-Fast 18+ Guard
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Uses Cloudflare 1.1.1.3 Family DNS (11ms latency) with full 18+ image, video, audio, and adult portal blocking.
                      </p>
                      <div className="text-xs text-indigo-400 font-medium mt-3">
                        Apply 1.1.1.3 Family Profile &rarr;
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('sandbox-tester');
                      }}
                      className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/60 text-left transition-colors"
                    >
                      <div className="text-sm font-bold text-slate-100">
                        Test Filters in Live Webpage Sandbox
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Open the interactive browser testbed to see banner ads and 18+ images, videos, and audio blocked before your eyes.
                      </p>
                      <div className="text-xs text-emerald-400 font-medium mt-3">
                        Launch Live Sandbox &rarr;
                      </div>
                    </button>
                  </div>
                </div>

                {/* Granular 18+ & Ad Matrix Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 18+ Content & Media Control Box */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-slate-100">
                          02. 18+ Website, Image, Video & Audio Control
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Block explicit websites and media files across all tabs
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('adult-media-filter')}
                        className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                      >
                        Full Settings
                      </button>
                    </div>

                    <div className="divide-y divide-slate-800">
                      {[
                        {
                          key: 'blockAdultDomains' as keyof FilterConfig,
                          title: 'Block 18+ Adult Websites (DNS + URL)',
                          desc: 'Blocks explicit websites & redirects to safe block page',
                        },
                        {
                          key: 'blockAdultImages' as keyof FilterConfig,
                          title: 'Block 18+ Images & Photo Galleries',
                          desc: 'Intercepts explicit JPEG/PNG/WebP images & blurs NSFW tags',
                        },
                        {
                          key: 'blockAdultVideos' as keyof FilterConfig,
                          title: 'Block 18+ Videos & Streaming Embeds',
                          desc: 'Terminates MP4/WebM/HLS adult video streams',
                        },
                        {
                          key: 'blockAdultAudio' as keyof FilterConfig,
                          title: 'Block 18+ Audio & Voice Streams',
                          desc: 'Blocks explicit MP3/AAC audio tracks & embeds',
                        },
                      ].map((item) => (
                        <div
                          key={item.key}
                          className="py-3 flex items-center justify-between gap-4"
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-200">
                              {item.title}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={Boolean(filters[item.key])}
                            onClick={() => handleToggleFilter(item.key)}
                            className={`w-10 h-5.5 rounded-full transition-colors relative shrink-0 ${
                              filters[item.key] ? 'bg-indigo-600' : 'bg-slate-700'
                            }`}
                          >
                            <span
                              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                                filters[item.key] ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Web Ads & Privacy Control Box */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-slate-100">
                          03. Web Ad Blocker & Privacy VPN Control
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Eliminate intrusive advertisements and hidden web trackers
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('ad-tracker-blocker')}
                        className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                      >
                        Full Settings
                      </button>
                    </div>

                    <div className="divide-y divide-slate-800">
                      {[
                        {
                          key: 'blockBannerAds' as keyof FilterConfig,
                          title: 'Block All Web Banner & Display Ads',
                          desc: 'Removes Google Ads, Taboola, Outbrain & floating banners',
                        },
                        {
                          key: 'blockVideoAds' as keyof FilterConfig,
                          title: 'Block Video Pre-Roll & Mid-Roll Ads',
                          desc: 'Skips and blocks video ad scripts on streaming portals',
                        },
                        {
                          key: 'blockPopups' as keyof FilterConfig,
                          title: 'Block Pop-Ups & Tab-Under Redirects',
                          desc: 'Stops forced new-tab ad redirects and pop-unders',
                        },
                        {
                          key: 'webrtcIpHide' as keyof FilterConfig,
                          title: 'WebRTC IP Leak & DNS Privacy Shield',
                          desc: 'Prevents websites from discovering your local network IP',
                        },
                      ].map((item) => (
                        <div
                          key={item.key}
                          className="py-3 flex items-center justify-between gap-4"
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-200">
                              {item.title}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={Boolean(filters[item.key])}
                            onClick={() => handleToggleFilter(item.key)}
                            className={`w-10 h-5.5 rounded-full transition-colors relative shrink-0 ${
                              filters[item.key] ? 'bg-emerald-600' : 'bg-slate-700'
                            }`}
                          >
                            <span
                              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                                filters[item.key] ? 'translate-x-5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DNS SYSTEM SERVER & LIVE DOH RESOLVER */}
            {activeTab === 'dns-system' && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h2 className="text-xl font-bold text-slate-100">
                    DNS System Server Configuration (DNS-over-HTTPS)
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Select the encrypted DNS server that powers your Chrome Extension. Family & Adult-Filtering DNS servers automatically block 18+ domains and ads at the network resolution layer.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                    {DNS_PROVIDERS.map((provider) => {
                      const isSelected = activeProvider.id === provider.id;
                      return (
                        <div
                          key={provider.id}
                          onClick={() => handleSelectProvider(provider)}
                          className={`p-5 rounded-xl border cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-indigo-600/10 border-indigo-500 text-slate-100'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-bold text-slate-100">
                                {provider.name}
                              </div>
                              <div className="text-xs text-slate-400 mt-1">
                                {provider.tagline}
                              </div>
                            </div>
                            <span className="font-mono tabular-nums text-xs text-emerald-400 shrink-0">
                              {provider.avgLatencyMs}ms
                            </span>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1 text-xs font-mono text-slate-400">
                            <div>Primary IP: {provider.primaryIp}</div>
                            <div className="truncate">DoH: {provider.dohEndpoint}</div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                            <span>
                              18+ Block: {provider.blocksAdult ? 'Yes' : 'Via Extension Rules'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Ad Block: {provider.blocksAds ? 'DNS + Extension' : 'Via Extension'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              SafeSearch: {provider.enforcesSafeSearch ? 'Enforced' : 'Optional'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Custom DoH Endpoint Inputs when 'custom' is selected */}
                  {selectedProviderId === 'custom' && (
                    <div className="mt-6 p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                      <h3 className="text-sm font-bold text-slate-100">
                        Custom DNS-over-HTTPS Server Endpoint
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1.5">
                            DoH HTTPS Query URL
                          </label>
                          <input
                            type="url"
                            value={customDohUrl}
                            onChange={(e) => setCustomDohUrl(e.target.value)}
                            placeholder="https://dns.nextdns.io/your-id"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1.5">
                            Primary DNS IPv4 Address
                          </label>
                          <input
                            type="text"
                            value={customPrimaryIp}
                            onChange={(e) => setCustomPrimaryIp(e.target.value)}
                            placeholder="94.140.14.15"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Live DNS-over-HTTPS Domain Resolver & Filter Tester */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">
                      Live DNS Resolution & Content Filter Diagnostic
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Test any domain against your active DNS server and extension blocklists to inspect real-time DNS records and blocking verdicts.
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => runLiveDohLookup(e)}
                    className="flex flex-col sm:flex-row gap-3"
                  >
                    <input
                      type="text"
                      value={dohTestDomain}
                      onChange={(e) => setDohTestDomain(e.target.value)}
                      placeholder="Enter a domain (e.g. doubleclick.net, pornhub.com, google.com)..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={dohTestLoading}
                      className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                    >
                      <Terminal className="w-4 h-4" />
                      <span>{dohTestLoading ? 'Querying DoH...' : 'Run DNS Lookup'}</span>
                    </button>
                  </form>

                  {/* Quick Sample Domains to Test */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-400">Quick Test Domains:</span>
                    {[
                      { label: 'Ad Server (doubleclick.net)', domain: 'doubleclick.net' },
                      { label: '18+ Portal (pornhub.com)', domain: 'pornhub.com' },
                      { label: '18+ Video Host (xvideos.com)', domain: 'xvideos.com' },
                      { label: 'Safe Site (wikipedia.org)', domain: 'wikipedia.org' },
                    ].map((sample) => (
                      <button
                        key={sample.domain}
                        type="button"
                        onClick={() => runLiveDohLookup(undefined, sample.domain)}
                        className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-mono text-[11px] transition-colors"
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>

                  {dohTestOutput && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                        <div className="text-slate-200 font-semibold">
                          Query: {dohTestOutput.domain}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 tabular-nums">
                            Latency: {dohTestOutput.latencyMs}ms
                          </span>
                          <span
                            className={`font-bold uppercase ${
                              dohTestOutput.verdict === 'allowed' ||
                              dohTestOutput.verdict === 'whitelisted'
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            [{dohTestOutput.verdict.toUpperCase()}]
                          </span>
                        </div>
                      </div>
                      <div className="text-slate-300">
                        <span className="text-slate-500">Server: </span>
                        {dohTestOutput.providerUsed}
                      </div>
                      <div className="text-slate-300">
                        <span className="text-slate-500">Policy Verdict: </span>
                        {dohTestOutput.reason}
                      </div>
                      <div>
                        <div className="text-slate-500 mb-1">DNS Answer / Route:</div>
                        {dohTestOutput.records.map((rec, idx) => (
                          <div key={idx} className="text-indigo-300">
                            &rarr; {rec}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: GRANULAR 18+ MEDIA & ADULT CONTENT BLOCKER */}
            {activeTab === 'adult-media-filter' && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                    <div>
                      <h2 className="text-xl font-bold text-slate-100">
                        18+ Website, Image, Video & Audio Content Blocker
                      </h2>
                      <p className="text-sm text-slate-400 mt-1">
                        Customize how AegisDNS Guard blocks explicit 18+ websites and filters out 18+ images, videos, and audio streams on any webpage.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('sandbox-tester')}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                    >
                      Test 18+ Filters in Sandbox
                    </button>
                  </div>

                  <div className="divide-y divide-slate-800 mt-2">
                    {[
                      {
                        key: 'blockAdultDomains' as keyof FilterConfig,
                        icon: Shield,
                        title: '18+ Website Domain Blocker (DNS + DeclarativeNetRequest)',
                        desc: 'Blocks access to all known 18+ adult websites, tube portals, and explicit forums at both the DNS and browser network layers.',
                        tech: 'Redirects main_frame & sub_frame requests to AegisDNS Blocked Interstitial Page',
                      },
                      {
                        key: 'blockAdultImages' as keyof FilterConfig,
                        icon: ImageOff,
                        title: '18+ Image & Photo Gallery Filter (<img>, <picture>, WebP/JPEG)',
                        desc: 'Stops explicit 18+ images from downloading and automatically blurs/replaces suspicious image elements on mixed-content websites.',
                        tech: 'Filters resourceTypes: ["image", "imageset"] + DOM MutationObserver alt/src inspection',
                      },
                      {
                        key: 'blockAdultVideos' as keyof FilterConfig,
                        icon: VideoOff,
                        title: '18+ Video Stream & Embed Blocker (<video>, MP4, HLS/m3u8)',
                        desc: 'Blocks 18+ video players, streaming segments, and embedded explicit video iframes before playback can start.',
                        tech: 'Filters resourceTypes: ["media", "xmlhttprequest"] + HTMLVideoElement stream terminator',
                      },
                      {
                        key: 'blockAdultAudio' as keyof FilterConfig,
                        icon: VolumeX,
                        title: '18+ Audio & Explicit Voice Track Blocker (<audio>, MP3/AAC)',
                        desc: 'Mutes and removes explicit 18+ audio streams, podcasts, and sound players embedded in web pages.',
                        tech: 'Intercepts audio MIME streams & strips restricted <audio> DOM nodes',
                      },
                      {
                        key: 'enforceSafeSearch' as keyof FilterConfig,
                        icon: Search,
                        title: 'Force Strict SafeSearch on Google, Bing, YouTube & DuckDuckGo',
                        desc: 'Automatically appends strict SafeSearch parameters to search queries so explicit 18+ images and videos never appear in search results.',
                        tech: 'Enforces safe=active & DNS CNAME SafeSearch routing',
                      },
                      {
                        key: 'strictKeywordScanner' as keyof FilterConfig,
                        icon: Sliders,
                        title: 'Real-Time Page Keyword & Metadata Scanner',
                        desc: 'Scans page URLs, titles, and media captions for explicit 18+ keywords and blocks restricted containers automatically.',
                        tech: 'Zero-latency client-side regex inspection in content-filter.js',
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isEnabled = Boolean(filters[item.key]);
                      return (
                        <div
                          key={item.key}
                          className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3.5">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                isEnabled
                                  ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                                  : 'bg-slate-950 text-slate-500 border border-slate-800'
                              }`}
                            >
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm font-bold text-slate-100">
                                {item.title}
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                                {item.desc}
                              </p>
                              <div className="text-[11px] font-mono text-slate-500">
                                Mechanism: {item.tech}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            <span className="text-xs font-mono text-slate-400">
                              {isEnabled ? 'ACTIVE' : 'OFF'}
                            </span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isEnabled}
                              onClick={() => handleToggleFilter(item.key)}
                              className={`w-11 h-6 rounded-full transition-colors relative ${
                                isEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                              }`}
                            >
                              <span
                                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                                  isEnabled ? 'translate-x-5.5' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: TOTAL WEB AD & TRACKER BLOCKER */}
            {activeTab === 'ad-tracker-blocker' && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <div className="pb-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-slate-100">
                      Total Web Ad Blocker & Internet Privacy Controls
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      Turn off all web-related advertisements, pop-ups, video commercials, and hidden tracking scripts across every website you visit.
                    </p>
                  </div>

                  <div className="divide-y divide-slate-800 mt-2">
                    {[
                      {
                        key: 'blockBannerAds' as keyof FilterConfig,
                        title: 'Block All Web Banner, Display & Native Ads',
                        desc: 'Blocks Google AdSense, DoubleClick, Taboola, Outbrain, and sponsored sidebar/header banners.',
                      },
                      {
                        key: 'blockVideoAds' as keyof FilterConfig,
                        title: 'Block Video Pre-Roll, Mid-Roll & Overlay Ads',
                        desc: 'Blocks video advertisement requests and auto-hides ad containers on streaming sites.',
                      },
                      {
                        key: 'blockPopups' as keyof FilterConfig,
                        title: 'Block Intrusive Pop-Up & Pop-Under Windows',
                        desc: 'Prevents ad networks (PopAds, PropellerAds, Adsterra) from opening unwanted background tabs.',
                      },
                      {
                        key: 'blockTrackers' as keyof FilterConfig,
                        title: 'Block Third-Party Analytics & Behavioral Trackers',
                        desc: 'Stops cross-site tracking pixels, fingerprinting scripts, and session recorders.',
                      },
                      {
                        key: 'stripTrackingParams' as keyof FilterConfig,
                        title: 'Strip Tracking Parameters from URLs (utm_*, fbclid, gclid)',
                        desc: 'Automatically cleans clicked links to protect your browsing privacy.',
                      },
                      {
                        key: 'dnsLeakProtection' as keyof FilterConfig,
                        title: 'DNS Leak & ISP Snooping Protection',
                        desc: 'Ensures your ISP cannot monitor or throttle the websites you access.',
                      },
                      {
                        key: 'webrtcIpHide' as keyof FilterConfig,
                        title: 'WebRTC Local IP Address Masking',
                        desc: 'Disables non-proxied UDP via Chrome Privacy API so sites cannot leak your local IP.',
                      },
                    ].map((item) => {
                      const isEnabled = Boolean(filters[item.key]);
                      return (
                        <div
                          key={item.key}
                          className="py-4 flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-slate-100">
                              {item.title}
                            </div>
                            <p className="text-xs text-slate-400 max-w-2xl">{item.desc}</p>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isEnabled}
                            onClick={() => handleToggleFilter(item.key)}
                            className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                              isEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                            }`}
                          >
                            <span
                              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                                isEnabled ? 'translate-x-5.5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: CUSTOM BLOCKLIST & WHITELIST MANAGER */}
            {activeTab === 'custom-rules' && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-100">
                      Custom Blocklist & Whitelist Rules
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      Add specific websites, domain wildcards, or media resource patterns (`image`, `video`, `audio`, `script`) to block or allow. Every rule is compiled directly into your Chrome Extension&apos;s `rules.json`.
                    </p>
                  </div>

                  {/* Add New Rule Form */}
                  <form
                    onSubmit={handleAddCustomRule}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4"
                  >
                    <div className="text-xs font-semibold text-slate-200">
                      Add Custom Filtering Rule
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Domain or URL Pattern
                        </label>
                        <input
                          type="text"
                          value={newRulePattern}
                          onChange={(e) => setNewRulePattern(e.target.value)}
                          placeholder="e.g. *.example-adult.com/* or *banner-ads.net*"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Action Type
                        </label>
                        <select
                          value={newRuleType}
                          onChange={(e) => setNewRuleType(e.target.value as RuleType)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="block">Block (Deny Access)</option>
                          <option value="allow">Whitelist (Allow Access)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Target Resource Scope
                        </label>
                        <select
                          value={newRuleScope}
                          onChange={(e) => setNewRuleScope(e.target.value as ResourceScope)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="all">All Traffic (Domain + Media)</option>
                          <option value="domain">Website Page Only</option>
                          <option value="image">Images Only (IMG/JPEG/WebP)</option>
                          <option value="video">Video Streams Only (MP4/HLS)</option>
                          <option value="audio">Audio Streams Only (MP3/AAC)</option>
                          <option value="script">Ad Scripts Only (JS)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="flex-1 flex items-center gap-3">
                        <select
                          value={newRuleCategory}
                          onChange={(e) => setNewRuleCategory(e.target.value as RuleCategory)}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="18+">Category: 18+ Content</option>
                          <option value="ads">Category: Web Ads</option>
                          <option value="tracker">Category: Tracker</option>
                          <option value="custom">Category: Custom</option>
                        </select>
                        <input
                          type="text"
                          value={newRuleNote}
                          onChange={(e) => setNewRuleNote(e.target.value)}
                          placeholder="Optional note (e.g. Block 18+ video host)"
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Rule to Extension</span>
                      </button>
                    </div>
                  </form>

                  {/* Interactive Filter Bar */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                      {(['all', 'block', 'allow'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setRuleFilterTab(tab)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                            ruleFilterTab === tab
                              ? 'bg-slate-800 text-slate-100'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {tab === 'all'
                            ? `All Rules (${customRules.length})`
                            : tab === 'block'
                            ? `Blocklist (${customRules.filter((r) => r.type === 'block').length})`
                            : `Whitelist (${customRules.filter((r) => r.type === 'allow').length})`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* High-Density Rules Table */}
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950 text-[11px] font-medium text-slate-400">
                          <th className="py-2.5 px-4">Pattern</th>
                          <th className="py-2.5 px-4">Policy · Scope</th>
                          <th className="py-2.5 px-4">Description</th>
                          <th className="py-2.5 px-4 text-right">Hits</th>
                          <th className="py-2.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs">
                        {customRules
                          .filter((r) => ruleFilterTab === 'all' || r.type === ruleFilterTab)
                          .map((rule) => (
                            <tr
                              key={rule.id}
                              className="hover:bg-slate-950/60 transition-colors"
                            >
                              <td className="py-3 px-4 font-mono text-slate-100">
                                {rule.pattern}
                              </td>
                              <td className="py-3 px-4 text-slate-300">
                                <span
                                  className={
                                    rule.type === 'block'
                                      ? 'text-rose-400 font-semibold'
                                      : 'text-emerald-400 font-semibold'
                                  }
                                >
                                  {rule.type.toUpperCase()}
                                </span>
                                <span aria-hidden="true"> · </span>
                                <span>{rule.category}</span>
                                <span aria-hidden="true"> · </span>
                                <span className="font-mono text-slate-400">{rule.scope}</span>
                              </td>
                              <td className="py-3 px-4 text-slate-400">{rule.note}</td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                                {rule.hits.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleDeleteCustomRule(rule)}
                                  className="text-slate-400 hover:text-rose-400 p-1 rounded transition-colors"
                                  title="Delete Rule"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: LIVE DNS QUERY LOG */}
            {activeTab === 'query-log' && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-100">
                        Live DNS Query & Media Interception Log
                      </h2>
                      <p className="text-sm text-slate-400 mt-1">
                        Inspect real-time DNS lookups, blocked 18+ images/videos/audio, and null-routed ad scripts.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          handleRecordSimulatedBlock(
                            'ad-banner.googlesyndication.com/pagead.js',
                            'ad-script',
                            filters.blockBannerAds ? 'blocked-ad' : 'allowed',
                            'AdGuard DNS + Declarative Rule'
                          );
                          handleRecordSimulatedBlock(
                            'cdn-explicit.adult-video-host.net/stream.m3u8',
                            'video',
                            filters.blockAdultVideos ? 'blocked-18+' : 'allowed',
                            '18+ Video Stream Blocker'
                          );
                        }}
                        className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Simulate Traffic Burst</span>
                      </button>
                    </div>
                  </div>

                  {/* Search & Filter Controls */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                      <input
                        type="text"
                        value={logSearch}
                        onChange={(e) => setLogSearch(e.target.value)}
                        placeholder="Search by domain, resource type (image, video, audio), or reason..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                      {(
                        [
                          { id: 'all', label: 'All Queries' },
                          { id: 'blocked-18+', label: '18+ Blocked' },
                          { id: 'blocked-ad', label: 'Ads Blocked' },
                          { id: 'allowed', label: 'Allowed' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setLogActionFilter(tab.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                            logActionFilter === tab.id
                              ? 'bg-slate-800 text-slate-100'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* High-Density Log Table */}
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950 text-[11px] font-medium text-slate-400">
                          <th className="py-2.5 px-4">Time</th>
                          <th className="py-2.5 px-4">Domain / Resource</th>
                          <th className="py-2.5 px-4">Type · Status</th>
                          <th className="py-2.5 px-4">Filter Rule / Reason</th>
                          <th className="py-2.5 px-4 text-right">Resolved IP · Latency</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs">
                        {filteredLogs.map((log) => (
                          <tr
                            key={log.id}
                            className="hover:bg-slate-950/60 transition-colors"
                          >
                            <td className="py-2.5 px-4 font-mono tabular-nums text-slate-400 whitespace-nowrap">
                              {log.timestamp}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-100 max-w-xs truncate">
                              {log.domain}
                            </td>
                            <td className="py-2.5 px-4 whitespace-nowrap">
                              <span className="font-mono text-slate-300">
                                {log.resourceType}
                              </span>
                              <span aria-hidden="true"> · </span>
                              <span
                                className={`font-semibold ${
                                  log.action === 'blocked-18+'
                                    ? 'text-rose-400'
                                    : log.action === 'blocked-ad'
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {log.action.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-400">{log.reason}</td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-300 whitespace-nowrap">
                              <span>{log.resolvedIp}</span>
                              <span aria-hidden="true"> · </span>
                              <span className="text-slate-400">{log.latencyMs}ms</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 7: LIVE WEBPAGE SANDBOX TESTER */}
            {activeTab === 'sandbox-tester' && (
              <SandboxTesterView
                filters={filters}
                activeProvider={activeProvider}
                onToggleFilter={handleToggleFilter}
                onRecordSimulatedBlock={handleRecordSimulatedBlock}
              />
            )}

            {/* TAB 8: PIN SECURITY GUARD */}
            {activeTab === 'pin-security' && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                  <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-800">
                    <div>
                      <h2 className="text-xl font-bold text-slate-100">
                        Parental & Self-Control PIN Lock Guard
                      </h2>
                      <p className="text-sm text-slate-400 mt-1">
                        Prevent anyone (or impulsive moments) from turning off 18+ image/video/audio filters or changing the Family DNS server without entering your secret PIN.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (pinState.enabled) {
                          executeWithPinCheck(
                            true,
                            'Disabling PIN Lock Guard',
                            () => setPinState((prev) => ({ ...prev, enabled: false }))
                          );
                        } else {
                          setPinState((prev) => ({ ...prev, enabled: true }));
                        }
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                        pinState.enabled
                          ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {pinState.enabled ? 'PIN Lock is ACTIVE (Turn Off)' : 'Enable PIN Lock'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Set / Change PIN Form */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (newPinInput.trim().length < 4) return;
                        executeWithPinCheck(
                          pinState.enabled,
                          'Changing Security PIN Code',
                          () => {
                            setPinState((prev) => ({
                              ...prev,
                              pinCode: newPinInput.trim(),
                              enabled: true,
                            }));
                            setNewPinInput('');
                            setPinSavedMessage('New PIN saved and PIN Lock enabled!');
                            setTimeout(() => setPinSavedMessage(''), 3000);
                          }
                        );
                      }}
                      className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4"
                    >
                      <h3 className="text-sm font-bold text-slate-100">
                        Configure 4-to-8 Digit Security PIN
                      </h3>
                      <p className="text-xs text-slate-400">
                        Current Default/Active PIN:{' '}
                        <span className="font-mono text-slate-300">
                          {pinState.enabled ? '•••• (Protected)' : pinState.pinCode}
                        </span>
                      </p>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1.5">
                          New Security PIN
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={8}
                          value={newPinInput}
                          onChange={(e) => setNewPinInput(e.target.value)}
                          placeholder="Enter 4+ digit PIN (e.g. 2580)"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      {pinSavedMessage && (
                        <div className="text-xs text-emerald-400">{pinSavedMessage}</div>
                      )}
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
                      >
                        Save & Activate PIN
                      </button>
                    </form>

                    {/* Protected Actions Checklist */}
                    <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                      <h3 className="text-sm font-bold text-slate-100">
                        Protected Actions Requiring PIN
                      </h3>
                      <div className="space-y-3">
                        {[
                          {
                            key: 'lock18PlusSettings' as const,
                            label: 'Require PIN to turn off 18+ Image, Video, Audio or Domain blockers',
                          },
                          {
                            key: 'lockDnsServer' as const,
                            label: 'Require PIN to switch away from a Family / Adult-Blocking DNS Server',
                          },
                          {
                            key: 'lockWhitelist' as const,
                            label: 'Require PIN before adding domains to the Whitelist',
                          },
                        ].map((item) => (
                          <label
                            key={item.key}
                            className="flex items-start gap-3 text-xs text-slate-300 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={pinState[item.key]}
                              onChange={() =>
                                setPinState((prev) => ({
                                  ...prev,
                                  [item.key]: !prev[item.key],
                                }))
                              }
                              className="mt-0.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 9: CHROME EXTENSION EXPORT & BENGALI/ENGLISH SETUP GUIDE */}
            {activeTab === 'extension-export' && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
                    <div>
                      <h2 className="text-xl font-bold text-slate-100">
                        Ready-to-Install Chrome Extension Package (Manifest V3)
                      </h2>
                      <p className="text-sm text-slate-400 mt-1">
                        Your custom DNS server ({activeProvider.name}), ad-blocking rules, and 18+ image/video/audio filters are compiled into this Chrome Extension package.
                      </p>
                    </div>
                    <button
                      onClick={handleDownloadExtensionZip}
                      className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Chrome Extension (.zip)</span>
                    </button>
                  </div>

                  {/* Step-by-Step Bilingual Installation Guide (English & বাংলা) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                        <HelpCircle className="w-4 h-4 text-indigo-400" />
                        <span>How to Install in Chrome (English)</span>
                      </div>
                      <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                        <li>
                          Click <strong>Download Chrome Extension (.zip)</strong> above and extract/unzip it into a folder.
                        </li>
                        <li>
                          Open Google Chrome and go to{' '}
                          <code className="font-mono text-indigo-300">chrome://extensions</code>.
                        </li>
                        <li>
                          Enable <strong>Developer mode</strong> in the top-right corner.
                        </li>
                        <li>
                          Click <strong>Load unpacked</strong> (top-left) and select the unzipped folder.
                        </li>
                        <li>
                          For browser-wide Encrypted DNS, open{' '}
                          <code className="font-mono text-indigo-300">
                            chrome://settings/security
                          </code>{' '}
                          &rarr; <strong>Use secure DNS</strong> &rarr; paste:{' '}
                          <code className="font-mono text-emerald-300">
                            {activeProvider.dohEndpoint}
                          </code>
                        </li>
                      </ol>
                    </div>

                    <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                        <HelpCircle className="w-4 h-4 text-emerald-400" />
                        <span>কীভাবে Chrome-এ ইন্সটল করবেন (বাংলা গাইড)</span>
                      </div>
                      <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                        <li>
                          উপরের <strong>Download Chrome Extension (.zip)</strong> বাটনে ক্লিক করে জিপ ফাইলটি ডাউনলোড ও <strong>Unzip / Extract</strong> করুন।
                        </li>
                        <li>
                          Chrome ব্রাউজারের অ্যাড্রেস বারে{' '}
                          <code className="font-mono text-indigo-300">chrome://extensions</code>{' '}
                          লিখে Enter চাপুন।
                        </li>
                        <li>
                          উপরের ডান কোণায় <strong>Developer mode</strong> সুইচটি <strong>ON</strong> করুন।
                        </li>
                        <li>
                          বাম পাশের <strong>Load unpacked</strong> বাটনে ক্লিক করে আপনার Extract করা ফোল্ডারটি সিলেক্ট করুন।
                        </li>
                        <li>
                          DNS সার্ভার সেট করতে{' '}
                          <code className="font-mono text-indigo-300">
                            chrome://settings/security
                          </code>{' '}
                          এ গিয়ে <strong>Use secure DNS</strong> এ কাস্টম লিংক হিসেবে দিন:{' '}
                          <code className="font-mono text-emerald-300">
                            {activeProvider.dohEndpoint}
                          </code>
                        </li>
                      </ol>
                    </div>
                  </div>

                  {/* Interactive Generated Source Code Inspector */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                        {generatedFiles.map((file) => (
                          <button
                            key={file.filename}
                            onClick={() => setSelectedExportFile(file.filename)}
                            className={`px-3 py-1.5 text-xs font-mono rounded-md transition-colors whitespace-nowrap shrink-0 ${
                              selectedExportFile === file.filename
                                ? 'bg-indigo-600 text-white font-semibold'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {file.filename}
                          </button>
                        ))}
                      </div>

                      {(() => {
                        const activeFile =
                          generatedFiles.find((f) => f.filename === selectedExportFile) ||
                          generatedFiles[0];
                        return (
                          <button
                            onClick={() =>
                              handleCopyCode(activeFile.filename, activeFile.content)
                            }
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                          >
                            {copiedFile === activeFile.filename ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy {activeFile.filename}</span>
                              </>
                            )}
                          </button>
                        );
                      })()}
                    </div>

                    {(() => {
                      const activeFile =
                        generatedFiles.find((f) => f.filename === selectedExportFile) ||
                        generatedFiles[0];
                      return (
                        <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                          <div className="px-4 py-2 border-b border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                            <span>{activeFile.description}</span>
                            <span className="font-mono">{activeFile.filename}</span>
                          </div>
                          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[420px] leading-relaxed">
                            <code>{activeFile.content}</code>
                          </pre>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Docked Live Chrome Extension Popup Simulator */}
          <ExtensionPopupPreview
            activeProvider={activeProvider}
            onSelectProvider={handleSelectProvider}
            filters={filters}
            onToggleFilter={handleToggleFilter}
            stats={stats}
            pinState={pinState}
            onNavigate={setActiveTab}
            onDownloadZip={handleDownloadExtensionZip}
          />
        </main>
      </div>

      {/* PIN Verification Modal */}
      <PinGuardModal
        isOpen={pinModal.isOpen}
        actionDescription={pinModal.description}
        expectedPin={pinState.pinCode}
        onSuccess={pinModal.onVerified}
        onCancel={() => setPinModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
