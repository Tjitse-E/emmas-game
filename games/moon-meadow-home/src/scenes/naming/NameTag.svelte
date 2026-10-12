<script lang="ts">
  // A name tag: the name with a crowned capital, the royal ordinal crown with its numeral, and a moon sparkle
  // when Elizabeth cannot say the name yet.
  let { name, ordinal = 1, sparkle = false, hidden = false, size = 44 }:
    { name: string; ordinal?: number; sparkle?: boolean; hidden?: boolean; size?: number } = $props();
</script>

{#if !hidden}
  <span class="tag" class:sparkle style:--fs="{size}px" role="img" aria-label="name tag {name}">
    <span class="cap"><svg viewBox="0 0 40 24" aria-hidden="true"><path d="M2 22 L6 6 L14 14 L20 2 L26 14 L34 6 L38 22 Z" fill="#ffd25e" stroke="#c98a14" stroke-width="2" /></svg>{name.charAt(0)}</span>{name.slice(1)}
    {#if ordinal > 1}<span class="ord"><svg viewBox="0 0 40 24" aria-hidden="true"><path d="M2 22 L6 6 L14 14 L20 2 L26 14 L34 6 L38 22 Z" fill="#ffd25e" stroke="#c98a14" stroke-width="2" /></svg>{ordinal}</span>{/if}
  </span>
{/if}

<style>
  .tag { display: inline-flex; align-items: flex-end; gap: 1px; padding: 14px 20px 8px; background: #fff; border: 4px solid #c9b8ff; border-radius: 22px;
    font: 700 var(--fs) / 1 'Andika', sans-serif; color: #3b2a4a; position: relative; white-space: nowrap; }
  .cap { position: relative; }
  .cap svg { position: absolute; top: calc(var(--fs) * -0.42); left: -2px; width: calc(100% + 4px); }
  .ord { margin-left: 10px; font-size: calc(var(--fs) * 0.6); position: relative; padding-top: 10px; }
  .ord svg { position: absolute; top: -6px; left: -3px; width: calc(var(--fs) * 0.6); }
  .sparkle::after { content: ''; position: absolute; inset: -8px; border-radius: 26px; border: 3px dashed #c9b8ff;
    animation: tw calc(1600ms * var(--speed, 1)) infinite; pointer-events: none; }
  @keyframes tw { 50% { opacity: 0.3; } }
</style>
