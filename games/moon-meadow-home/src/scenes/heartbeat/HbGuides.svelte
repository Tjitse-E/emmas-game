<script lang="ts">
  // The replay button of a heartbeat scene. It replays the running moment's goal, else the scene's own.
  import ReplayButton from '../../ui/ReplayButton.svelte';
  import { goal } from './guides.svelte.ts';
</script>

<ReplayButton onreplay={() => void goal.replay()} />
