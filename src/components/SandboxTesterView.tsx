import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ImageOff,
  VideoOff,
  VolumeX,
  Ban,
  Globe,
  Play,
  Volume2,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import { DnsProvider, FilterConfig } from '../types/vpn';

interface SandboxTesterViewProps {
  filters: FilterConfig;
  activeProvider: DnsProvider;
  onToggleFilter: (key: keyof FilterConfig) => void;
  onRecordSimulatedBlock: (
    domain: string,
    resourceType: 'domain' | 'image' | 'video' | 'audio' | 'ad-script',
    action: 'blocked-18+' | 'blocked-ad' | 'allowed',
    reason: string
  ) => void;
}

export const SandboxTesterView: React.FC<SandboxTesterViewProps> = ({
  filters,
  activeProvider,
  onToggleFilter,
  onRecordSimulatedBlock,
}) => {
  const [simulatedUrl, setSimulatedUrl] = useState('https://daily-portal-stream.example.com/feed');
  const [urlTestResult, setUrlTestResult] = useState<{
    url: string;
    status: 'blocked-18+' | 'blocked-ad' | 'allowed';
    explanation: string;
  } | null>(null);

  const isVpnOn = filters.vpnEnabled;
  const adsBlocked = isVpnOn && filters.blockBannerAds;
  const videoAdsBlocked = isVpnOn && filters.blockVideoAds;
  const adultSiteBlocked = isVpnOn && (filters.blockAdultDomains || activeProvider.blocksAdult);
  const adultImgBlocked = isVpnOn && filters.blockAdultImages;
  const adultVidBlocked = isVpnOn && filters.blockAdultVideos;
  const adultAudBlocked = isVpnOn && filters.blockAdultAudio;

  const handleTestCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const lower = simulatedUrl.toLowerCase();
    const isAdultKeyword =
      /pornhub|xvideos|xnxx|onlyfans|adult|nsfw|xxx|18plus|redtube|erotic|nude/.test(lower);
    const isAdKeyword = /doubleclick|googlesyndication|popads|adsterra|taboola|banner-ad/.test(
      lower
    );

    if (isAdultKeyword && adultSiteBlocked) {
      const reason = `Blocked by ${activeProvider.name} + 18+ Domain/Media Filter`;
      setUrlTestResult({
        url: simulatedUrl,
        status: 'blocked-18+',
        explanation: reason,
      });
      onRecordSimulatedBlock(simulatedUrl, 'domain', 'blocked-18+', reason);
    } else if (isAdKeyword && adsBlocked) {
      const reason = 'Blocked by Total Web Ad & Tracker Shield';
      setUrlTestResult({
        url: simulatedUrl,
        status: 'blocked-ad',
        explanation: reason,
      });
      onRecordSimulatedBlock(simulatedUrl, 'ad-script', 'blocked-ad', reason);
    } else {
      const reason = isVpnOn
        ? `Resolved safely via ${activeProvider.name} (${activeProvider.primaryIp})`
        : 'Allowed (VPN Shield is currently paused)';
      setUrlTestResult({
        url: simulatedUrl,
        status: 'allowed',
        explanation: reason,
      });
      onRecordSimulatedBlock(simulatedUrl, 'domain', 'allowed', reason);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Filter Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              Live Webpage Ad & 18+ Media Filter Sandbox
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Test how your Chrome Extension blocks web ads, 18+ websites, 18+ images, 18+ videos, and 18+ audio streams in real time. Toggle any switch below to see the webpage react immediately.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => {
                onRecordSimulatedBlock(
                  'cdn.nsfw-gallery-sim.org/explicit-photo.jpg',
                  'image',
                  adultImgBlocked ? 'blocked-18+' : 'allowed',
                  adultImgBlocked ? '18+ Image Shield' : 'Filter Disabled'
                );
                onRecordSimulatedBlock(
                  'stream.adult-video-sim.net/clip-18plus.mp4',
                  'video',
                  adultVidBlocked ? 'blocked-18+' : 'allowed',
                  adultVidBlocked ? '18+ Video Stream Shield' : 'Filter Disabled'
                );
                onRecordSimulatedBlock(
                  'audio.nsfw-podcast-sim.fm/track-explicit.mp3',
                  'audio',
                  adultAudBlocked ? 'blocked-18+' : 'allowed',
                  adultAudBlocked ? '18+ Audio Stream Shield' : 'Filter Disabled'
                );
              }}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Run Full Page Inspection</span>
            </button>
          </div>
        </div>

        {/* Interactive Quick Toggle Bar for Instant Visual Comparison */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-5">
          {[
            { key: 'blockBannerAds' as keyof FilterConfig, label: 'Web Banner Ads' },
            { key: 'blockAdultDomains' as keyof FilterConfig, label: '18+ Websites' },
            { key: 'blockAdultImages' as keyof FilterConfig, label: '18+ Images' },
            { key: 'blockAdultVideos' as keyof FilterConfig, label: '18+ Videos' },
            { key: 'blockAdultAudio' as keyof FilterConfig, label: '18+ Audio' },
          ].map((item) => {
            const enabled = Boolean(filters[item.key]) && isVpnOn;
            return (
              <button
                key={item.key}
                onClick={() => onToggleFilter(item.key)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  enabled
                    ? 'bg-indigo-500/10 border-indigo-500/40 text-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-semibold truncate">{item.label}</div>
                <div className="text-[11px] mt-1 font-mono">
                  {enabled ? 'BLOCKING ON' : 'ALLOWED (OFF)'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Simulated Browser Window */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {/* Simulated Browser URL Bar */}
        <form
          onSubmit={handleTestCustomUrl}
          className="p-3 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div className="flex items-center gap-2 text-xs text-slate-400 px-2 shrink-0">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span className="font-medium text-slate-300">Browser Simulator</span>
          </div>

          <input
            type="text"
            value={simulatedUrl}
            onChange={(e) => setSimulatedUrl(e.target.value)}
            placeholder="Enter any URL (e.g. https://pornhub.com or https://doubleclick.net)..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
          />

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSimulatedUrl('https://adult-18plus-portal.example.com/gallery')}
              className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 whitespace-nowrap shrink-0"
            >
              Try 18+ URL
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold whitespace-nowrap shrink-0"
            >
              Test URL Filter
            </button>
          </div>
        </form>

        {/* URL Test Result Banner if tested */}
        {urlTestResult && (
          <div
            className={`px-5 py-3 border-b flex items-center justify-between text-xs ${
              urlTestResult.status === 'allowed'
                ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-200'
                : 'bg-rose-950/40 border-rose-800/50 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {urlTestResult.status === 'allowed' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-mono">{urlTestResult.url}</span>
              <span aria-hidden="true">·</span>
              <span>{urlTestResult.explanation}</span>
            </div>
            <span className="font-mono font-semibold uppercase">
              {urlTestResult.status === 'allowed' ? 'ALLOWED' : 'BLOCKED'}
            </span>
          </div>
        )}

        {/* Simulated Webpage Canvas */}
        <div className="p-6 space-y-6 bg-slate-950/60">
          {/* 1. Top Leaderboard Banner Ad Slot */}
          <div className="rounded-xl border border-slate-800 p-4 bg-slate-900">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Test Slot 01 · Top Web Banner Advertisement (`doubleclick.net`)</span>
              <span className="font-mono">
                Status: {adsBlocked ? 'BLOCKED BY EXTENSION' : 'VISIBLE (UNFILTERED)'}
              </span>
            </div>
            {adsBlocked ? (
              <div className="py-6 px-4 rounded-lg bg-slate-950 border border-dashed border-emerald-500/30 flex items-center justify-center gap-2.5 text-xs text-emerald-300">
                <Ban className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Web Banner Ad & Tracking Script Removed by AegisDNS Ad Blocker (0 bytes downloaded)
                </span>
              </div>
            ) : (
              <div className="py-6 px-4 rounded-lg bg-amber-500/10 border border-amber-500/40 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-amber-300">
                    [SPONSORED AD] Win a Free Smartphone Now! Click Here!
                  </div>
                  <div className="text-xs text-amber-200/70 mt-0.5">
                    Third-party tracker cookies active · Ad network script running
                  </div>
                </div>
                <span className="text-xs font-mono text-amber-300 underline">
                  Turn ON Ad Blocker to remove
                </span>
              </div>
            )}
          </div>

          {/* 2. Granular 18+ Media Elements Grid (Image, Video, Audio, Adult Website Card) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 18+ Image Test Card */}
            <div className="rounded-xl border border-slate-800 p-5 bg-slate-900 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                <span>Test Slot 02 · 18+ Explicit Image Element (&lt;img&gt;)</span>
                <span className="font-mono text-slate-300">MIME: image/jpeg</span>
              </div>

              {adultImgBlocked ? (
                <div className="h-44 rounded-lg bg-slate-950 border border-rose-500/30 flex flex-col items-center justify-center p-4 text-center">
                  <ImageOff className="w-8 h-8 text-rose-400 mb-2" />
                  <div className="text-sm font-semibold text-slate-100">
                    18+ Image Blocked by Content Filter
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    DeclarativeNetRequest & DOM Image Inspector blocked `nsfw-gallery-photo.jpg`
                  </p>
                </div>
              ) : (
                <div className="h-44 rounded-lg bg-rose-950/40 border border-rose-500/40 flex flex-col items-center justify-center p-4 text-center">
                  <ImageIcon className="w-8 h-8 text-rose-300 mb-2" />
                  <div className="text-sm font-semibold text-rose-200">
                    [UNFILTERED 18+ IMAGE PLACEHOLDER]
                  </div>
                  <p className="text-xs text-rose-300/80 mt-1">
                    18+ Image Blocker is currently OFF. Enable &ldquo;18+ Images&rdquo; to block.
                  </p>
                </div>
              )}
            </div>

            {/* 18+ Video Stream Test Card */}
            <div className="rounded-xl border border-slate-800 p-5 bg-slate-900 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                <span>Test Slot 03 · 18+ Video Stream (&lt;video&gt; / HLS) &amp; Video Ad</span>
                <span className="font-mono text-slate-300">MIME: video/mp4</span>
              </div>

              {adultVidBlocked ? (
                <div className="h-44 rounded-lg bg-slate-950 border border-rose-500/30 flex flex-col items-center justify-center p-4 text-center">
                  <VideoOff className="w-8 h-8 text-rose-400 mb-2" />
                  <div className="text-sm font-semibold text-slate-100">
                    18+ Video Stream & Pre-Roll Ad Terminated
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Media stream connection aborted before buffering (`adult-video-cdn.net`)
                  </p>
                </div>
              ) : (
                <div className="h-44 rounded-lg bg-rose-950/40 border border-rose-500/40 flex flex-col items-center justify-center p-4 text-center">
                  <Play className="w-8 h-8 text-rose-300 mb-2" />
                  <div className="text-sm font-semibold text-rose-200">
                    [UNFILTERED 18+ VIDEO STREAM + PRE-ROLL AD]
                  </div>
                  <p className="text-xs text-rose-300/80 mt-1">
                    {videoAdsBlocked
                      ? 'Video ads blocked, but 18+ video stream is allowed.'
                      : 'Both video ads and 18+ video streams are currently allowed.'}
                  </p>
                </div>
              )}
            </div>

            {/* 18+ Audio Stream Test Card */}
            <div className="rounded-xl border border-slate-800 p-5 bg-slate-900 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                <span>Test Slot 04 · 18+ Explicit Audio Track (&lt;audio&gt;)</span>
                <span className="font-mono text-slate-300">MIME: audio/mpeg</span>
              </div>

              {adultAudBlocked ? (
                <div className="h-36 rounded-lg bg-slate-950 border border-rose-500/30 flex flex-col items-center justify-center p-4 text-center">
                  <VolumeX className="w-7 h-7 text-rose-400 mb-2" />
                  <div className="text-sm font-semibold text-slate-100">
                    18+ Audio Stream Muted & Removed
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Explicit audio element stripped (`explicit-audio-stream.fm`)
                  </p>
                </div>
              ) : (
                <div className="h-36 rounded-lg bg-rose-950/40 border border-rose-500/40 flex flex-col items-center justify-center p-4 text-center">
                  <Volume2 className="w-7 h-7 text-rose-300 mb-2" />
                  <div className="text-sm font-semibold text-rose-200">
                    [UNFILTERED 18+ AUDIO PLAYER]
                  </div>
                  <p className="text-xs text-rose-300/80 mt-1">
                    18+ Audio Blocker is currently OFF. Enable &ldquo;18+ Audio&rdquo; to block.
                  </p>
                </div>
              )}
            </div>

            {/* 18+ Adult Website Embed / Portal Redirect Test Card */}
            <div className="rounded-xl border border-slate-800 p-5 bg-slate-900 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                <span>Test Slot 05 · 18+ Adult Website Domain & SafeSearch</span>
                <span className="font-mono text-slate-300">DNS Layer</span>
              </div>

              {adultSiteBlocked ? (
                <div className="h-36 rounded-lg bg-slate-950 border border-emerald-500/30 flex flex-col items-center justify-center p-4 text-center">
                  <ShieldCheck className="w-7 h-7 text-emerald-400 mb-2" />
                  <div className="text-sm font-semibold text-slate-100">
                    Adult Domains Blocked at DNS + Browser Layer
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Resolved to `0.0.0.0` via {activeProvider.name} · SafeSearch Enforced
                  </p>
                </div>
              ) : (
                <div className="h-36 rounded-lg bg-amber-950/40 border border-amber-500/40 flex flex-col items-center justify-center p-4 text-center">
                  <ShieldAlert className="w-7 h-7 text-amber-300 mb-2" />
                  <div className="text-sm font-semibold text-amber-200">
                    18+ Adult Domains Currently Accessible
                  </div>
                  <p className="text-xs text-amber-300/80 mt-1">
                    Turn ON 18+ Websites or select AdGuard/Cloudflare Family DNS to block.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
