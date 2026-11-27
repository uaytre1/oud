---
paths:
  - "index.html"
  - "style.css"
  - "tuner.css"
  - "js/app.js"
  - "js/coach.js"
  - "js/record-oud.js"
---
# Stage UI ("Design D") & Tuning Rules

1. **Stage look only:** Dark wood + warm brass (`style.css`), unified `1.8px` line icons (`js/icons.js`), one obvious next action per screen, all tap targets `>= 44 px`.
2. **6-string vs 5-string non-merge rule:** String 6 MUST stay strictly lower than String 5 (`validS6Index`, `S6.midi < S5.midi`). `#/record-oud` must keep the `5 strings / 6 strings` selector right at the top and never be blocked by `#intro`.
3. **Visual & browser verification before release:** Check screenshots at `375×667` (iPhone SE) and `1024×768` (iPad landscape), plus `tools/lab/feature_test.cjs` (`19/19 PASS`) and `tools/lab/coach_test.cjs` (`35/35 PASS`).
