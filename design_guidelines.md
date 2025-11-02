# Design Guidelines: Crypto-to-Naira Swap Platform

## Design Approach

**Selected Approach**: Reference-Based with Design System Foundation

**Primary References**:
- relay.link: Clean, minimal swap interface with clear visual hierarchy
- Uniswap: Token selection and transaction flow patterns
- Coinbase: Trust-building through professional simplicity

**Key Design Principles**:
1. **Clarity Over Complexity**: Every element serves a clear purpose in the swap flow
2. **Trust Through Minimalism**: Clean, professional interface builds confidence in financial transactions
3. **Progressive Disclosure**: Show information as needed in the swap journey
4. **Mobile-First Financial UX**: Optimized for quick swaps on any device

## Typography System

**Font Families**: 
- Primary: Inter (via Google Fonts) - excellent for financial interfaces
- Monospace: JetBrains Mono - for amounts, addresses, and transaction IDs

**Type Scale**:
- Page Title: text-3xl md:text-4xl, font-semibold
- Section Headers: text-xl md:text-2xl, font-semibold
- Card Titles: text-lg, font-medium
- Body Text: text-base, font-normal
- Labels: text-sm, font-medium
- Helper Text: text-xs, font-normal
- Numerical Values: text-2xl md:text-3xl, font-semibold (monospace for crypto amounts)
- Conversion Rates: text-sm, font-medium

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, and 8 consistently
- Micro spacing (gaps, padding between related items): p-2, gap-2
- Component spacing (card padding, form fields): p-4, p-6, gap-4
- Section spacing (between major sections): p-8, py-8, gap-8
- Page margins: px-4 md:px-6

**Container Strategy**:
- Main container: max-w-md mx-auto (centered, narrow focus for swap flow)
- Full viewport height: min-h-screen with flex layout
- Card containers: w-full with appropriate padding

**Grid System**:
- Single column for main swap flow (no distractions)
- Two-column grid for transaction history/details (grid-cols-1 md:grid-cols-2)

## Component Library

### Core Swap Interface

**Main Swap Card**:
- Centered card with rounded-2xl corners
- Generous padding (p-6 md:p-8)
- Subtle shadow for depth
- Contains entire swap flow in stepped progression

**Step Indicators**:
- Horizontal stepper showing: Select Blockchain → Enter Amount → Bank Details → Confirm
- Active step highlighted with filled indicator
- Completed steps with checkmark
- Text labels: text-sm, font-medium

**Blockchain Selector**:
- Large, tappable buttons in grid layout (grid-cols-2 gap-4)
- Each button shows blockchain icon + name
- Selected state with border emphasis
- Icons: 24x24px from cryptocurrency icon libraries

**Token Selection Dropdown**:
- Clean select interface with token icon + symbol + name
- Hoverable/tappable with smooth transition
- Shows current balance if wallet connected
- Dropdown items: py-2, px-4 spacing

**Amount Input Field**:
- Large, prominent input: text-3xl, monospace font
- Label above: "You Send" with text-sm
- Max button aligned right: text-xs, font-semibold
- Real-time conversion display below in card format

**Conversion Rate Card**:
- Compact info card showing exchange rate
- Format: "1 USDT = ₦X,XXX.XX"
- Includes last updated timestamp
- Refresh rate indicator icon

**Bank Account Input Section**:
- Bank selection dropdown (Nigerian banks)
- Account number input: text-lg, monospace
- Account name verification display (when available)
- Helper text for validation

**Summary Card**:
- Breakdown layout with label-value pairs
- "You Send": Bold crypto amount
- "You Receive": Bold Naira amount with ₦ symbol
- Fee breakdown: text-sm with breakdown icon
- Receiving account: Last 4 digits shown
- Total spacing: gap-4 between rows

**Action Buttons**:
- Primary CTA: Full-width, py-4, text-base, font-semibold
- Rounded-xl corners
- States: Default, Hover (subtle scale), Disabled (reduced opacity)
- Secondary actions: Outlined style, same dimensions

### Navigation & Header

**Top Navigation Bar**:
- Minimal header with logo on left
- Wallet connection button on right
- Height: h-16
- Fixed position with backdrop blur
- Horizontal padding: px-6

**Wallet Connect Button**:
- Shows abbreviated address when connected
- Identicon or blockchain icon
- Dropdown menu for disconnect/switch network

### Transaction Status

**Status Cards**:
- Color-coded status indicators (without specifying colors)
- Icon + Status text + Timestamp
- Progress bar for processing states
- Transaction ID (monospace, truncated with copy button)

**Transaction History List**:
- Card-based list items
- Each showing: Amount, Date, Status, Quick action
- Sorted by most recent
- Infinite scroll or pagination

### Forms & Inputs

**Input Field Standards**:
- Border with rounded-lg
- Focus state with enhanced border
- Label: text-sm, font-medium, mb-2
- Placeholder: text-base with reduced opacity
- Helper text: text-xs, mt-2
- Error state with validation message

**Dropdown/Select Menus**:
- Consistent height: h-12
- Chevron icon indicating expandability
- Smooth expansion animation
- List items with hover states

### Footer

**Minimal Footer**:
- Links: Support, Terms, Privacy
- Social media icons
- Copyright text: text-xs
- Padding: py-8

## Interaction Patterns

**Transitions**:
- Default transition duration: 150ms
- Smooth easing for all state changes
- No elaborate animations - focus on responsiveness

**Loading States**:
- Skeleton screens for data loading
- Spinner for button actions
- Progress indicators for multi-step processes

**Feedback Mechanisms**:
- Toast notifications for actions (top-right positioning)
- Inline validation messages
- Success checkmarks for completed steps

## Responsive Behavior

**Mobile (< 768px)**:
- Full-width cards with edge-to-edge on small screens
- Stacked blockchain selector (single column)
- Larger touch targets (min 44px)
- Bottom-sheet style modals

**Desktop (≥ 768px)**:
- Centered layout with max-width constraint
- Side-by-side comparison views where appropriate
- Hover states more prominent
- Keyboard navigation support

## Images

**Hero Section**: NOT INCLUDED
This is a utility app focused on immediate functionality. The interface opens directly to the swap card without a traditional hero section.

**Icons & Graphics**:
- Blockchain network icons (32x32px in selectors, 24x24px in dropdowns)
- Cryptocurrency token icons (24x24px)
- Bank logos (if available, 40x40px)
- Status icons (16x16px)
- All icons from established libraries (Cryptocurrency Icons, Heroicons for UI)

**Trust Indicators**:
- Security badge/icon in footer
- Verified checkmark for account validation
- Small partner logos if applicable (grayscale, 80px width)

## Accessibility Standards

- WCAG 2.1 AA compliance
- Keyboard navigation throughout
- ARIA labels for all interactive elements
- Focus indicators on all focusable elements
- Screen reader optimized labels for amounts and status
- Minimum touch target size: 44x44px
- Semantic HTML structure

## Critical UX Considerations

1. **Error Prevention**: Clear validation before swap execution
2. **Confirmation Flow**: Explicit review step before finalizing
3. **Rate Locking**: Show rate expiration timer
4. **Account Verification**: Instant feedback on bank account validation
5. **Transaction Transparency**: Clear fee breakdown before confirmation
6. **Network Status**: Connection status always visible
7. **Balance Display**: Show available balance throughout flow