# Browser Proof Notes

This proof set supplements the earlier code-level simulation with real in-browser screenshots from `http://localhost:5173/?farmReview=1`.

## Included screenshots

1. `01-empty-growing-mature-mix.png`
   - baseline screen showing at least one empty plot, visible growing feedback on active plots, and mature plots ready to harvest
2. `02-plant-modal.png`
   - clicking an empty plot opens the seed picker modal
3. `03-planted-growing.png`
   - choosing `Normal` consumes 1 seed and the same top-left plot enters planted/growing state
4. `04-top-left-matured-via-debug.png`
   - for compressed verification time, debug toolbar `⏭️ 立即成熟` was used to advance growing plots to mature state in-app
5. `05-top-left-harvested.png`
   - clicking the same top-left mature plot harvests it back to empty; coin / collection counters increase accordingly

## What this proves

- Empty plot can enter the real planting flow
- Growing state has visible in-app feedback
- Mature state has visible in-app feedback
- Mature plot can be harvested and returns to `empty`
- Harvest updates visible top counters

## Note

`04-top-left-matured-via-debug.png` uses the existing in-app debug toolbar only to compress waiting time for proof capture. Planting and harvesting were executed through real plot clicks in the browser.
