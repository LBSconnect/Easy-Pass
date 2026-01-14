# Easy Pass - Design Guidelines

## Design Approach

**Selected System**: Material Design 3 (Material You principles)  
**Rationale**: Educational platforms require clarity, accessibility, and established interaction patterns. Material Design provides robust component libraries, excellent form handling, and proven patterns for data-heavy applications—perfect for exam interfaces and admin dashboards.

## Typography System

**Primary Font**: Inter (via Google Fonts)  
**Secondary Font**: Roboto for numerical data and technical content

**Hierarchy**:
- Hero Headlines: text-5xl md:text-6xl, font-bold
- Section Headers: text-3xl md:text-4xl, font-semibold
- Subsection Titles: text-xl md:text-2xl, font-medium
- Body Text: text-base md:text-lg, font-normal, leading-relaxed
- Question Text: text-lg, font-medium (enhanced readability for exam content)
- UI Labels: text-sm, font-medium, uppercase tracking-wide
- Legal/Fine Print: text-xs

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20
- Micro spacing: p-2, gap-2 (tight groupings)
- Standard spacing: p-4, p-6, gap-4 (cards, forms)
- Section spacing: py-12, py-16, py-20 (desktop sections)
- Large spacing: py-8 md:py-12 lg:py-20 (hero, major sections)

**Container Strategy**:
- Max-width: max-w-7xl for general content
- Exam interface: max-w-4xl (optimal reading width)
- Admin tables: max-w-full with horizontal scroll on mobile

## Marketing Landing Page Structure

**Hero Section** (h-screen with centered content):
- Split layout: Left side with headline "Pass Your Texas Licensing Exam" + subheadline + dual CTA buttons (Start Free Trial / View Pricing)
- Right side: Large hero image showing diverse students studying on tablets/laptops
- Trust badge strip below hero: "10,000+ Successful Test Takers" + "Available in English & Spanish"

**Exam Categories Section** (py-20):
- 2x2 grid (grid-cols-1 md:grid-cols-2) of exam category cards
- Each card: Icon + exam name + brief description + "Practice Now" link

**Features Section** (py-20):
- 3-column grid (grid-cols-1 md:grid-cols-3) 
- Features: "Bilingual Support" + "Instant Results" + "Mobile Friendly" + "Timed Practice" + "Progress Tracking" + "Affordable Plans"
- Each with icon, title, 2-line description

**Pricing Section** (py-20):
- 2-column comparison cards (Weekly vs Monthly plans)
- Prominent pricing, feature lists, CTA buttons
- "Cancel anytime" messaging

**Social Proof Section** (py-16):
- 3-column testimonial grid with user photos, quotes, exam passed indicator
- Star ratings and credibility markers

**Footer** (py-12):
- Multi-column: Company info + Quick Links + Exam Categories + Language toggle + Contact
- Bottom bar: Legal links, social icons, copyright

## Application Interface Components

**Navigation Bar**:
- Sticky top navigation with logo left, main nav center, language toggle + profile right
- Mobile: Hamburger menu with slide-out drawer
- Height: h-16, shadow-md elevation

**Dashboard Layout**:
- Sidebar navigation (w-64 on desktop, hidden mobile with toggle)
- Main content area with breadcrumbs, page title, action buttons
- Card-based information architecture

**Exam Interface**:
- Clean, distraction-free layout with max-w-4xl
- Question card: Elevated card with generous padding (p-8)
- Progress indicator at top (question X of Y)
- Answer options: Large, clearly separated radio buttons with p-4 clickable areas
- Bottom navigation: Previous/Next/Review buttons with clear visual hierarchy
- Timer displayed prominently top-right

**Question Cards**:
- Elevation-2 shadow, rounded-lg corners
- Question number badge top-left
- Large, readable question text (text-lg)
- Answer options with hover states, selected state clearly distinguished
- Spacing between options: gap-3

**Forms (Login/Registration/Profile)**:
- Single column, max-w-md centered
- Floating labels for inputs
- Clear validation states (success/error)
- Input height: h-12, rounded-md
- Submit buttons: Full width, h-12, prominent elevation

**Admin Panel Components**:
- Data tables with sticky headers, zebra striping
- Filters and search at top with clear button hierarchy
- Action buttons (Edit/Delete) with icon + text
- Bulk action controls in table header
- Analytics cards: 4-column grid for key metrics (total users, active subscriptions, revenue, pass rate)

**Subscription Management**:
- Plan comparison cards with clear visual distinction
- Payment form with Stripe elements styling
- Subscription status badge in profile header
- Cancellation flow with confirmation modal

**Icons**: Material Icons via CDN
- Use consistently throughout application
- Size: 20px for inline, 24px for standalone, 48px for feature sections

**Buttons**:
- Primary CTA: h-12, px-8, rounded-md, font-medium
- Secondary: h-10, px-6, outlined variant
- Text buttons: No background, underline on hover
- Icon buttons: w-10 h-10, rounded-full

**Elevation System**:
- Cards: shadow-sm (default), shadow-md (hover)
- Modals: shadow-2xl
- Dropdowns: shadow-lg
- Navigation: shadow-md

## Images

**Hero Image**: Professional photograph of diverse students studying together with laptops/tablets in modern environment, optimistic and focused expressions. Placement: Right 50% of hero section on desktop, full-width background on mobile with content overlay.

**Category Icons**: Use Material Icons for Real Estate (home), Property & Casualty (shield), Life Insurance (favorite), General Lines (description) - 48px size in colored circles.

**Testimonial Photos**: Authentic headshots of satisfied users (placeholder for real testimonials), circular cropping, 80px diameter.

## Responsive Breakpoints

- Mobile: base (< 768px) - single column, stacked navigation
- Tablet: md (768px+) - 2-column grids, visible navigation
- Desktop: lg (1024px+) - full multi-column layouts, sidebar visible

## Accessibility

- Minimum touch targets: 44px height
- Color contrast ratios: WCAG AA compliant (will be verified when colors added)
- Focus indicators on all interactive elements (ring-2 ring-offset-2)
- ARIA labels for icon-only buttons
- Semantic HTML throughout
- Form labels always visible or clearly indicated

**Critical Note**: All text content must support both English and Spanish with i18next integration. Ensure adequate spacing for text expansion in Spanish translations (typically 20-30% longer).