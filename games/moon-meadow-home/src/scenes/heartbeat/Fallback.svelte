<script lang="ts">
  // Simple SVG pictures for heartbeat art ids that have no picture yet (soft fills, warm outline, a highlight).
  let { id, size = 120, tint = '' }: { id: string; size?: number; tint?: string } = $props();

  const kind = $derived(
    id.startsWith('egg-') ? 'egg'
      : id.startsWith('station-') || id === 'building-bath-pond' ? 'station'
        : id.includes('bell') ? (id.includes('gold') ? 'bell-gold' : 'bell')
          : id.includes('door') ? 'door'
            : id.includes('tent') ? 'tent'
              : id.includes('lantern') ? 'lantern'
                : id.includes('basket') ? 'basket'
                  : id.includes('moonflower') ? 'moonflower'
                    : id.includes('nest') ? 'nest'
                      : id.includes('blanket') ? 'blanket'
                        : id.includes('tree') ? 'tree'
                          : id.includes('heart') ? 'heart'
                            : id.includes('treat') ? 'treat'
                              : id.includes('brush') ? 'brush'
                                : id.includes('flower-box') ? 'flower-box'
                                  : id.includes('paint') ? 'paint'
                                    : id === 'sky-unicorn' ? 'sky-unicorn'
                                      : 'round',
  );
  const EGG: Record<string, string> = {
    'egg-moon': '#e6dcff', 'egg-nestling': '#fff1d6', 'egg-pebble': '#dfe3ea', 'egg-cosy': '#ffe2cf', 'egg-berry': '#ffd0e8',
    'egg-snow': '#eef8ff', 'egg-golden': '#ffd86b', 'egg-speckled': '#f5ecd9',
  };
</script>

<svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true">
  {#if kind === 'egg'}
    <path d="M100 10 C160 10 190 100 190 140 C190 180 150 196 100 196 C50 196 10 180 10 140 C10 100 40 10 100 10 Z" fill={tint || EGG[id] || '#e6dcff'} stroke="#9a7bc4" stroke-width="6" />
    <ellipse cx="70" cy="70" rx="16" ry="28" fill="#fff" opacity="0.5" />
  {:else if kind === 'nest'}
    <ellipse cx="100" cy="140" rx="92" ry="44" fill="#d9a066" stroke="#a46a33" stroke-width="6" />
    <path d="M20 130 Q100 170 180 130" fill="none" stroke="#a46a33" stroke-width="5" />
  {:else if kind === 'blanket'}
    <path d="M10 70 Q100 30 190 70 L190 170 Q100 196 10 170 Z" fill="#ffc4e1" stroke="#e0559c" stroke-width="6" />
    {#each [[50, 100], [100, 120], [150, 100], [75, 150], [125, 150]] as [x, y] (x * 1000 + y)}<circle cx={x} cy={y} r="8" fill="#fff" opacity="0.7" />{/each}
  {:else if kind === 'bell' || kind === 'bell-gold'}
    <path d="M100 14 C140 30 152 66 152 104 L152 140 L170 162 L30 162 L48 140 L48 104 C48 66 60 30 100 14 Z" fill={kind === 'bell-gold' ? '#ffd25e' : tint || '#ffd0e8'} stroke={kind === 'bell-gold' ? '#c98a14' : '#e0559c'} stroke-width="6" />
    <circle cx="100" cy="176" r="14" fill="#ffd25e" stroke="#c98a14" stroke-width="5" />
  {:else if kind === 'door'}
    <rect x="30" y="20" width="140" height="170" rx="60" fill="#c98f5a" stroke="#8a5a2e" stroke-width="6" />
    <circle cx="140" cy="110" r="8" fill="#ffd25e" />
  {:else if kind === 'tent'}
    <path d="M100 20 L190 180 L10 180 Z" fill="#c8e4ff" stroke="#4f93d6" stroke-width="6" /><path d="M100 80 L130 180 L70 180 Z" fill="#7aa7d6" />
  {:else if kind === 'lantern'}
    <rect x="60" y="40" width="80" height="120" rx="24" fill="#ffe68a" stroke="#c98a14" stroke-width="6" /><circle cx="100" cy="100" r="26" fill="#fff6c8" />
  {:else if kind === 'basket'}
    <path d="M20 90 L180 90 L160 180 L40 180 Z" fill="#e8b878" stroke="#a46a33" stroke-width="6" /><path d="M40 90 Q100 10 160 90" fill="none" stroke="#a46a33" stroke-width="8" />
  {:else if kind === 'station'}
    <rect x="20" y="30" width="160" height="150" rx="36" fill="#dcffe8" stroke="#3fae7a" stroke-width="6" />
  {:else if kind === 'moonflower'}
    {#each [0, 72, 144, 216, 288] as a (a)}<ellipse cx="100" cy="60" rx="22" ry="40" fill={tint || '#f5d9ff'} stroke="#c46bff" stroke-width="4" transform="rotate({a} 100 100)" />{/each}
    <circle cx="100" cy="100" r="18" fill="#ffd25e" />
  {:else if kind === 'tree'}
    <rect x="88" y="110" width="24" height="80" rx="8" fill="#a46a33" /><circle cx="100" cy="80" r="70" fill="#9fe0b0" stroke="#3fae7a" stroke-width="6" />
  {:else if kind === 'heart'}
    <path d="M100 176 C40 130 14 100 14 66 C14 40 34 20 60 20 C78 20 92 30 100 46 C108 30 122 20 140 20 C166 20 186 40 186 66 C186 100 160 130 100 176 Z" fill="#ff8fc7" stroke="#e0559c" stroke-width="6" />
  {:else if kind === 'treat'}
    <circle cx="100" cy="100" r="70" fill="#ffb86b" stroke="#c9772a" stroke-width="6" /><circle cx="80" cy="80" r="10" fill="#7a4a1a" /><circle cx="120" cy="110" r="10" fill="#7a4a1a" />
  {:else if kind === 'brush'}
    <rect x="40" y="70" width="120" height="60" rx="20" fill="#c98f5a" stroke="#8a5a2e" stroke-width="6" />
    {#each [55, 75, 95, 115, 135] as x (x)}<rect x={x} y="130" width="10" height="40" rx="4" fill="#fff3c4" />{/each}
  {:else if kind === 'flower-box'}
    <rect x="20" y="120" width="160" height="60" rx="12" fill="#c98f5a" stroke="#8a5a2e" stroke-width="6" />
    {#each [50, 100, 150] as x (x)}<circle cx={x} cy="100" r="22" fill={tint || '#ff8fc7'} /><circle cx={x} cy="100" r="8" fill="#ffd25e" />{/each}
  {:else if kind === 'paint'}
    <path d="M40 70 L160 70 L150 180 L50 180 Z" fill="#e6e6ef" stroke="#8a8aa0" stroke-width="6" />
    <ellipse cx="100" cy="70" rx="60" ry="16" fill={tint || '#9d7bff'} stroke="#8a8aa0" stroke-width="5" />
  {:else if kind === 'sky-unicorn'}
    {#each [[60, 120], [90, 80], [130, 70], [150, 110], [110, 140], [70, 160], [140, 160], [120, 40], [80, 50], [100, 110]] as [x, y] (x * 1000 + y)}<circle cx={x} cy={y} r="9" fill="#fff6c8" />{/each}
    <path d="M60 120 L90 80 L130 70 L150 110 L110 140 Z M90 80 L80 50 M130 70 L120 40" fill="none" stroke="#fff6c880" stroke-width="3" />
  {:else}
    <circle cx="100" cy="100" r="80" fill={tint || '#efe6ff'} stroke="#9a7bc4" stroke-width="6" />
  {/if}
</svg>
