# FoodSwipe Design System

## Overview
Modern, elegant restaurant discovery app with sophisticated aesthetics combining Playfair Display and DM Sans typography with a refined color palette.

## Color Palette

### Primary Colors
- **Background**: `#F61EB` - Deep sophisticated blue
- **Surface**: `#1A2B3C` - Card/surface background
- **Card**: `#1F2933` - Card background

### Accent Colors
- **Gold Highlight**: `#B59B6A` - Warm gold/bronze for CTAs and highlights
- **Slate Accent**: `#2C3E50` - Slate blue-gray for secondary elements

### Text Colors
- **Primary Text**: `#1F2933` - Dark blue-gray (for light backgrounds)
- **Light Text**: `#FFFFFF` - White (for dark backgrounds)
- **Secondary Text**: `#9AA5B1` - Subtle gray
- **Muted Text**: `#CBD2D9` - Very subtle gray

### Status Colors
- **Success**: `#52C41A` - Fresh green
- **Error**: `#F5222D` - Alert red
- **Warning**: `#FAAD14` - Warning amber

### UI Elements
- **Border**: `#323F4B`
- **Shadow**: `rgba(0, 0, 0, 0.15)`
- **Divider**: `#2D3748`

## Typography

### Font Families
1. **Playfair Display** - Elegant serif for headings
   - Regular (400)
   - Bold (700)
   - Black (900)

2. **DM Sans** - Clean sans-serif for body text
   - Regular (400)
   - Medium (500)
   - Bold (700)

### Typography Scale

#### Headings
- **App Title**: Playfair Display Black, 48px
- **Screen Title**: Playfair Display Bold, 28-32px
- **Section Title**: Playfair Display Bold, 24px
- **Card Title**: Playfair Display Black, 36px

#### Body Text
- **Body Large**: DM Sans Regular, 18px
- **Body**: DM Sans Regular, 16px
- **Body Small**: DM Sans Regular, 15px
- **Caption**: DM Sans Regular, 13-14px

#### Interactive Elements
- **Button Text**: DM Sans Bold, 17-18px
- **Tab Labels**: DM Sans Medium, 11px
- **Badge Text**: DM Sans Bold, 12-14px

## Component Styling

### Buttons
- **Primary Button**:
  - Background: Gold (`#B59B6A`)
  - Text: Background color (`#F61EB`)
  - Border Radius: 12px
  - Padding: 18px vertical
  - Shadow: Gold with 0.3 opacity

- **Action Buttons**:
  - Size: 64x64px (56x56px for info)
  - Border Radius: 50% (circular)
  - Icons: Ionicons, 28-32px
  - Shadow: Black with 0.2 opacity

### Cards
- **Restaurant Card**:
  - Border Radius: 20px
  - Border: 1px solid border color
  - Shadow: Black, 0.3 opacity, 16px radius
  - Gradient Overlay: Transparent to `rgba(15, 23, 42, 0.98)`

- **Review Card**:
  - Border Radius: 16px
  - Border: 1px solid border color
  - Background: Card color
  - Shadow: Subtle shadow with 0.1 opacity

### Navigation
- **Tab Bar**:
  - Background: Surface color (`#1A2B3C`)
  - Height: 65px
  - Border Top: 1px, Border color
  - Active Tint: Gold
  - Inactive Tint: Secondary text color
  - Icons: Ionicons, 24px with filled/outline variants

- **Header**:
  - Background: Surface color
  - Border Bottom: 1px, Border color
  - Title: Playfair Display Bold, 20px
  - Tint Color: Light text color

### Badges & Tags
- **Cuisine Tags**:
  - Background: Gold
  - Text: Background color (dark blue)
  - Border Radius: 12px
  - Padding: 14px horizontal, 6px vertical
  - Font: DM Sans Bold, 12px

- **Status Badges**:
  - Border Radius: 10-12px
  - Padding: 12px horizontal, 6px vertical
  - Font: DM Sans Bold, 12-13px
  - Colors: Success (green) or Error (red)

## Icons

### Icon Library
Using **@expo/vector-icons** with the following sets:
- **Ionicons**: Primary icon set
- **MaterialCommunityIcons**: For specific UI elements
- **Feather**: For profile and utility icons

### Icon Usage
- **Tab Navigation**:
  - Discover: `restaurant` / `restaurant-outline`
  - Feed: `image-multiple` / `image-multiple-outline`
  - Matches: `heart` / `heart-outline`
  - Chat: `chatbubbles` / `chatbubbles-outline`
  - Profile: `user` (Feather)

- **Actions**:
  - Settings: `options-outline`
  - Close/Pass: `close`
  - Info: `information`
  - Like: `heart`

## Spacing System

### Padding Scale
- **xs**: 4px
- **sm**: 8px
- **md**: 12px
- **lg**: 16px
- **xl**: 20px
- **2xl**: 24px
- **3xl**: 32px

### Common Spacing Patterns
- Card padding: 20-24px
- Button padding: 14-18px vertical, 24-32px horizontal
- Section spacing: 12px between sections
- Element gaps: 8-12px within groups

## Shadows & Elevation

### Shadow Levels
1. **Subtle** (elevation 2-3):
   - `shadowColor: '#000'`
   - `shadowOffset: { width: 0, height: 2 }`
   - `shadowOpacity: 0.1`
   - `shadowRadius: 4-6`

2. **Medium** (elevation 4-6):
   - `shadowOffset: { width: 0, height: 4 }`
   - `shadowOpacity: 0.2-0.3`
   - `shadowRadius: 8`

3. **High** (elevation 10-12):
   - `shadowOffset: { width: 0, height: 8 }`
   - `shadowOpacity: 0.3`
   - `shadowRadius: 12-16`

### Accent Shadows
For gold elements use:
- `shadowColor: Colors.gold`
- `shadowOpacity: 0.3`

## Border Radius Scale

- **Small**: 10-12px (badges, small buttons)
- **Medium**: 16px (cards, inputs)
- **Large**: 20-24px (large cards)
- **Circular**: 50% (action buttons)

## Best Practices

### Do's
✓ Use Playfair Display for all headings and titles
✓ Use DM Sans for all body text and UI elements
✓ Use gold (`#B59B6A`) for primary actions and highlights
✓ Maintain consistent spacing with the spacing system
✓ Use filled icon variants for active states
✓ Apply subtle shadows for depth

### Don'ts
✗ Don't mix multiple accent colors
✗ Don't use emojis in production UI (use icons instead)
✗ Don't use system default fonts
✗ Don't exceed 3 levels of visual hierarchy
✗ Don't use pure black or pure white backgrounds

## Accessibility

- Minimum touch target size: 44x44px
- Color contrast ratio: Minimum 4.5:1 for normal text
- Text size: Minimum 14px for body text
- Interactive elements have clear visual feedback
- All icons have descriptive alt text equivalents

## Implementation Notes

### Font Loading
Fonts are loaded in `App.tsx` using `@expo-google-fonts` hooks:
```typescript
useFonts({
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_900Black,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
});
```

### Color Usage
Colors are centralized in `src/constants/colors.ts` and accessed via:
```typescript
import { Colors } from '../../constants/colors';
```

### Icon Usage
```typescript
import { Ionicons } from '@expo/vector-icons';

<Ionicons name="heart" size={24} color={Colors.gold} />
```

## File Structure
```
src/
├── constants/
│   └── colors.ts          # Central color definitions
├── components/
│   └── swipe/
│       └── RestaurantCard.tsx
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   └── SignUpScreen.tsx
│   ├── main/
│   │   ├── SwipeScreen.tsx
│   │   └── RestaurantDetailsScreen.tsx
│   └── social/
│       └── SocialFeedScreen.tsx
└── navigation/
    └── AppNavigator.tsx
```

---

**Design System Version**: 2.0
**Last Updated**: January 2026
**Maintained by**: FoodSwipe Team
