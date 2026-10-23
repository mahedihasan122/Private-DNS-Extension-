import React from 'react';
import {
  Shield,
  ShieldOff,
  Lock,
  Globe,
  ImageOff,
  VideoOff,
  VolumeX,
  Ban,
  Download,
  ExternalLink,
  Check,
} from 'lucide-react';
import {
  DNS_PROVIDERS,
  DnsProvider,
  FilterConfig,
  NavigationTab,
  PinSecurityState,
} from '../types/vpn';

interface ExtensionPopupPreviewProps {
  activeProvider: DnsProvider;
  onSelectProvider: (provider: DnsProvider) => void;
  filters: FilterConfig;
  onToggleFilter: (key: keyof FilterConfig) => void;
  stats: {
    adsBlocked: number;
    adultBlocked: number;
    mediaFiltered: number;
    dnsQueries: number;
  };
  pinState: PinSecurityState;
  onNavigate: (tab: NavigationTab) => void;
  onDownloadZip: () => void;
}

export const ExtensionPopupPreview: React.FC<ExtensionPopupPreviewProps> = ({
  activeProvider,
  onSelectProvider,
  filters,
  onToggleFilter,
  stats,
  pinState,
  onNavigate,
  onDownloadZip,
}) => {
  const isProtected = filters.vpnEnabled;

  return (
    <aside className="w-full xl:w-[360px] shrink-0">
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {/* Browser Extension Chrome Frame Header */}
        <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-medium text-slate-200">Chrome Extension Popup</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">v2.4 MV3</span>
          </div>
          <button
            onClick={() => onNavigate('sandbox-tester')}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <span>Test Live</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {/* Popup Main Body */}
        <div className="p-5 space-y-5">
          {/* Top Brand + PIN Lock Indicator */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
                <span>AegisDNS Guard</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                <span>{isProtected ? 'Encrypted DoH Tunnel Active' : 'Protection Paused'}</span>
                <span aria-hidden="true"> · </span>
                <span className="font-mono tabular-nums">{activeProvider.avgLatencyMs}ms</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('pin-security')}
              title={pinState.enabled ? 'PIN Lock Enabled' : 'Configure PIN Lock'}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                pinState.enabled
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{pinState.enabled ? 'PIN Locked' : 'Set PIN'}</span>
            </button>
          </div>

          {/* Master VPN / DNS Shield Power Button */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                  isProtected
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {isProtected ? <Shield className="w-6 h-6" /> : <ShieldOff className="w-6 h-6" />}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">
                  {isProtected ? 'DNS Shield: ON' : 'DNS Shield: OFF'}
                </div>
                <div className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                  IP: {activeProvider.primaryIp}
                </div>
              </div>
            </div>

            <button
              onClick={() => onToggleFilter('vpnEnabled')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                isProtected
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {isProtected ? 'Connected' : 'Turn On'}
            </button>
          </div>

          {/* Quick DNS Server Switcher */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="popup-dns-select"
                className="text-xs font-medium text-slate-400 flex items-center gap-1.5"
              >
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span>DNS System Server (DoH)</span>
              </label>
              <button
                onClick={() => onNavigate('dns-system')}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Configure
              </button>
            </div>
            <select
              id="popup-dns-select"
              value={activeProvider.id}
              onChange={(e) => {
                const found = DNS_PROVIDERS.find((p) => p.id === e.target.value);
                if (found) onSelectProvider(found);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {DNS_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.primaryIp})
                </option>
              ))}
            </select>
          </div>

          {/* Granular Quick Toggles inside Popup */}
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-slate-400 mb-2">
              Real-Time Content & Media Shields
            </div>

            {[
              {
                key: 'blockBannerAds' as keyof FilterConfig,
                label: 'Block All Web & Video Ads',
                sub: 'Banners, pre-rolls, pop-ups',
                icon: Ban,
              },
              {
                key: 'blockAdultDomains' as keyof FilterConfig,
                label: '18+ Website Domain Blocker',
                sub: 'Blocks explicit portals via DNS',
                icon: Shield,
              },
              {
                key: 'blockAdultImages' as keyof FilterConfig,
                label: '18+ Image & Photo Blocker',
                sub: 'Filters explicit IMG & galleries',
                icon: ImageOff,
              },
              {
                key: 'blockAdultVideos' as keyof FilterConfig,
                label: '18+ Video Stream Blocker',
                sub: 'Stops MP4/HLS adult video embeds',
                icon: VideoOff,
              },
              {
                key: 'blockAdultAudio' as keyof FilterConfig,
                label: '18+ Audio Stream Blocker',
                sub: 'Blocks explicit audio & voice tracks',
                icon: VolumeX,
              },
            ].map((item) => {
              const Icon = item.icon;
              const active = Boolean(filters[item.key]) && isProtected;
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-950/70 border border-slate-800/80"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        active ? 'text-indigo-400' : 'text-slate-500'
                      }`}
                    />
                    <div className="truncate">
                      <div className="text-xs font-medium text-slate-200 truncate">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{item.sub}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(filters[item.key])}
                    onClick={() => onToggleFilter(item.key)}
                    className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                      filters[item.key] ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform translate-y-0 ${
                        filters[item.key] ? 'translate-x-4.5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Live Blocked Counters in Popup */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-sm font-bold font-mono tabular-nums text-emerald-400">
                {stats.adsBlocked.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Ads Off</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-sm font-bold font-mono tabular-nums text-rose-400">
                {stats.adultBlocked.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">18+ Sites</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-sm font-bold font-mono tabular-nums text-amber-400">
                {stats.mediaFiltered.toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">18+ Media</div>
            </div>
          </div>

          {/* Export Extension Button */}
          <button
            onClick={onDownloadZip}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Download Extension Package (.zip)</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Synced with your custom filtering settings</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
