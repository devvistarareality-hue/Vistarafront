# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Nexora app — rules for everyone working in this repo

## Styling: no inline styles
- Never add `style={{ … }}` or `style={[ … { … } ]}` in JSX. A pre-commit hook
  (`scripts/check-inline-styles.js`, enabled by `npm install`) rejects them.
- Use the shared styles:
  - `src/styles/common.js` — screen, header, iconBtn, card, tile, input, chip,
    btn + btnPrimary/btnSuccess/btnDanger/btnSecondary, sectionLabel, sheet, …
  - `src/components/ui` — Button, Card, Badge, MetricTile, ListRow, Segmented, StatCard, FadeInUp.
  - Screen-specific styles: a `StyleSheet.create()` at the bottom of the screen file.
- Colours only from `COLORS` in `src/constants/theme.js` (light + dark themes);
  never hard-code a hex. Tint with `withAlpha()`, not `color + 'HH'`.
- Combine rather than inline: `style={[common.card, styles.myCard]}`.
- Existing inline styles are legacy: when you touch one of those lines, move it out.
- A genuinely dynamic value may stay inline if the line ends with `// inline-ok: <reason>`.

## Other conventions
- Logo: `images.logo` (switches with the theme). Loader: `components/AppLoader`.
- `Alert.alert` already renders the themed dialog (`components/AppDialog`).
- Every app change must match the website (vistaraweb).
