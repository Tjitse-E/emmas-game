<script lang="ts">
  // A calm night sky for a scene that is not built yet. Test builds name the scene; Emma sees only the moon.
  let { id }: { id: string } = $props();
  const dev = import.meta.env.MODE !== 'production';
</script>

<div class="missing" role="img" aria-label="scene not built">
  <svg viewBox="0 0 100 100" width="160" height="160" aria-hidden="true">
    <circle cx="50" cy="50" r="34" fill="#fffef2" />
    <circle cx="64" cy="42" r="30" fill="#26296b" />
  </svg>
  {#if dev}<p>Scene not built: {id}</p>{/if}
</div>

<style>
  .missing { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; background: #26296b; color: #fff6fb; font-size: 28px; }
</style>
