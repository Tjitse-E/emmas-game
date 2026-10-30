# Requests from the hub lane (2.4.0)

Changes this lane needs in files it does not own, the targets its histories miss, and seams with other lanes that the integrator should check at the merge. The lane compiles against the step 0 files as they are.

## Targets the histories miss (plan Task 3)

1. **Two history targets are skipped in `tests/hub-history.test.ts`.** The rules match 5.2 and 5.6 word for word (checked again against both sections); the misses come from the model's times, not a rule. Per plan Task 3 the two tests are `it.skip` with the target and the number reached, so the deploy gate (Task 28, check 9) lists them as failed checks and the deploy waits for Tjitse.

   - **Play B never reaches done early** (5.6: "Plays B and C never reach it"). Reached: done early at **26:43**. B's order is the design's (picnic, Corner, nest egg, wish, pond, bead tree, wish, ride, pond, shore egg, pond), but her shore egg ends at 26:43, after ride 2's cutoff at 26:00, so at that refill no learning place can start and done early begins. Bedtime still starts at 30:00, at the end of the last pond visit, so her play is the same apart from `early`.
   - **The pond-lover reaches bedtime before 30:00** (5.6: done early at about 26:30, bedtime at about 29:50). Reached: done early at **27:38**, and her last pond visit starts at 27:53, so the 30:00 cutoff ends it and bedtime starts at **30:00**.
   - Why: 5.7's table for play B leaves out about 1.2 minutes of its own model in the early rows. The picnic ends at 2.0 there, but the welcome (0.3) and the picnic (1.9) already make 2.2, before the walk; the nest egg, the bead tree and the two wishes are each 0.1 to 0.3 short too. With every walk and every 0.2 min gap counted (none before the first place, which follows the welcome at once), B's places end at 2.2, 3.9, 7.3, 8.2, 11.5, 13.6, 14.5, 19.9, 23.3, 26.7 and 30.0.
   - Play C passes (no done early, bedtime at 30:00: ride 1 ends at 29:53), and the pond-lover's, the skips-the-Corner and the slide-only counts all pass.
   - For Tjitse: B's bedtime is at 30:00 either way, and the pond-lover's last visit is cut at 30:00 instead of ending at 29:50. If he accepts the numbers reached, the two targets change and the tests are unskipped. Until he decides they stay skipped: a lane may not change a target or the model.
