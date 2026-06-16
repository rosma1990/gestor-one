---
name: Importaciones CRESGO
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3f493e'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6f7a6d'
  outline-variant: '#bfcabb'
  surface-tint: '#046d2d'
  primary: '#006327'
  on-primary: '#ffffff'
  primary-container: '#207d3a'
  on-primary-container: '#c3ffc5'
  inverse-primary: '#80da8c'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fd'
  on-secondary-container: '#57657b'
  tertiary: '#92334c'
  on-tertiary: '#ffffff'
  tertiary-container: '#b14b64'
  on-tertiary-container: '#ffecee'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9bf7a5'
  primary-fixed-dim: '#80da8c'
  on-primary-fixed: '#002108'
  on-primary-fixed-variant: '#00531f'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#ffd9de'
  tertiary-fixed-dim: '#ffb1bf'
  on-tertiary-fixed: '#3f0016'
  on-tertiary-fixed-variant: '#80253f'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  h1:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-base:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  data-tabular:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-padding: 2rem
  gutter: 1.5rem
  section-gap: 2rem
  component-padding-x: 1rem
  component-padding-y: 0.5rem
---

## Brand & Style

The design system is engineered to project **reliability, security, and institutional efficiency**. As a payroll management application for Importaciones CRESGO, the interface prioritizes clarity and high-density data handling without sacrificing visual breathing room.

The aesthetic follows a **Corporate Modern** approach. It utilizes a predominantly flat UI architecture to minimize cognitive load, punctuated by subtle depth cues that guide the user's focus toward actionable items and critical financial data. The brand presence is anchored by the corporate green, signifying growth and stability, while the neutral palette ensures that the primary focus remains on the accuracy of the payroll information.

## Colors

The palette is rooted in the **Corporate Green (#207D3A)** derived from the Importaciones CRESGO logo. This color is reserved for primary actions, success states, and brand-heavy elements like the sidebar active state or primary buttons.

- **Backgrounds:** The interface uses a clean, pure white (#FFFFFF) background to maximize contrast for data readability. Subtle light grey (#F8FAFC) is used for container backgrounds to distinguish sections.
- **Neutrals:** A "Slate" grey scale is used for typography and UI borders, providing a professional, cool-toned foundation that feels more modern than pure black.
- **Accents:** Status indicators use high-legibility shades. Active/Open states leverage the brand green, while Inactive/Closed states utilize a medium grey.

## Typography

The design system utilizes **Inter** for all interface levels. Inter's tall x-height and excellent legibility make it ideal for the high-density tables and forms required for payroll management.

- **Data Tables:** Use `data-tabular` for all numerical values. This ensures columns of numbers (like salaries and deductions) align vertically, allowing for easy visual scanning.
- **Hierarchy:** Headlines use tighter letter spacing and heavier weights to provide clear section breaks. 
- **Labels:** Small, uppercase labels with increased tracking are used for form field headers and table headers to distinguish them from user-entered data.

## Layout & Spacing

The design system employs a **12-column fluid grid** for main content areas, allowing the dashboard to scale across different monitor sizes. 

- **Density:** We utilize a "Comfortable" density for general navigation but transition to "Compact" density within data tables and side-panels. 
- **Margins:** Desktop views maintain a 32px (2rem) outer margin. Gutters are fixed at 24px (1.5rem) to ensure clear separation between cards and widgets.
- **Mobile:** On smaller screens, columns collapse into a single-stack layout with reduced side margins (1rem) to maximize the available horizontal space for numerical data.

## Elevation & Depth

To maintain the professional "Corporate" feel, the design system avoids heavy shadows or excessive layering. 

- **Subtle Layering:** We use a "Level 0" background for the page and "Level 1" cards for content. Level 1 cards use a very subtle, diffused shadow (0px 1px 3px rgba(0,0,0,0.1)) and a 1px border (#E2E8F0).
- **Interactive States:** Buttons and clickable cards employ a slightly deeper shadow on hover to provide tactile feedback without looking "game-like."
- **Overlays:** Modals and dropdowns use a "Level 2" elevation with a more pronounced backdrop blur (4px) to focus the user's attention on the task at hand (e.g., editing a specific employee's record).

## Shapes

The design system uses a **Soft (1)** rounding strategy. This 4px (0.25rem) base radius provides a precise, modern look that feels approachable but maintains the "serious" nature of a payroll application.

- **Small Components:** Checkboxes and small badges use the base 4px radius.
- **Large Components:** Cards and main containers use `rounded-lg` (8px) to soften the overall interface architecture.
- **Inputs:** Form fields utilize the standard 4px radius to match the precision of the typography.

## Components

The design system follows the **shadcn/ui** pattern library with specific modifications for Importaciones CRESGO:

### Data Tables
- **Currency:** All financial values must be prefixed with **"Q"** (Quetzal). Currency columns are always right-aligned to facilitate total sum scanning.
- **Status Badges:**
  - **Active / Open:** Brand Green background (10% opacity) with Brand Green text.
  - **Inactive / Closed:** Slate-200 background with Slate-600 text.
- **Striping:** Subtle zebra-striping is applied to rows for readability in long lists.

### Forms & Inputs
- **Validation:** Errors use a 1px red border and a 12px helper text underneath.
- **Focus States:** Inputs use a 2px Brand Green ring when focused to highlight the active task.

### Buttons
- **Primary:** Solid Brand Green with white text.
- **Secondary:** White background with 1px Slate-200 border and Slate-700 text.
- **Destructive:** Solid red background for irreversible actions (e.g., deleting a payroll period).

### Cards
- Used for dashboard metrics (e.g., "Total Payroll this Month"). Cards should include a top-border accent in Brand Green to reinforce the corporate identity.