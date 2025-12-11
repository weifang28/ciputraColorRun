# Category Images Setup Guide

## Overview
Category images have been added to the race registration system. Each kilometer option (3km, 5km, 10km) can now have an associated image that will be displayed in the registration form.

## Directory Structure
Images should be placed in:
```
public/images/categories/
```

## Recommended Image Specifications
- **Format**: PNG, JPG, or WebP
- **Dimensions**: 400x300px or similar 4:3 aspect ratio
- **File size**: < 500KB for optimal loading
- **Naming convention**: Use clear names like `3km.png`, `5km.png`, `10km.png`

## Example File Structure
```
public/
  images/
    categories/
      3km.png      ← Image for 3km race
      5km.png      ← Image for 5km race
      10km.png     ← Image for 10km race
```

## How to Add Images to Database

### Option 1: Using Prisma Studio (Recommended)
1. Run Prisma Studio:
   ```powershell
   npx prisma studio
   ```

2. Navigate to the `RaceCategory` table

3. Click on the category you want to update (e.g., "3km")

4. In the `imageUrl` field, enter the path to your image:
   ```
   /images/categories/3km.png
   ```

5. Click "Save" to apply changes

6. Repeat for other categories (5km, 10km, etc.)

### Option 2: Using SQL Query
Connect to your PostgreSQL database and run:

```sql
-- Update 3km category
UPDATE "RaceCategory" 
SET "imageUrl" = '/images/categories/3km.png' 
WHERE name = '3km';

-- Update 5km category
UPDATE "RaceCategory" 
SET "imageUrl" = '/images/categories/5km.png' 
WHERE name = '5km';

-- Update 10km category
UPDATE "RaceCategory" 
SET "imageUrl" = '/images/categories/10km.png' 
WHERE name = '10km';
```

### Option 3: Using Prisma Client Script
Create a script file (e.g., `updateCategoryImages.ts`):

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateCategoryImages() {
  // Update 3km
  await prisma.raceCategory.update({
    where: { name: '3km' },
    data: { imageUrl: '/images/categories/3km.png' }
  });

  // Update 5km
  await prisma.raceCategory.update({
    where: { name: '5km' },
    data: { imageUrl: '/images/categories/5km.png' }
  });

  // Update 10km
  await prisma.raceCategory.update({
    where: { name: '10km' },
    data: { imageUrl: '/images/categories/10km.png' }
  });

  console.log('Category images updated successfully!');
}

updateCategoryImages()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run the script:
```powershell
npx tsx updateCategoryImages.ts
```

## Image Design Tips

### What to Include in Category Images:
1. **Distance indicator**: Clear "3KM", "5KM", or "10KM" text
2. **Visual theme**: Running/athletic imagery
3. **Color coding**: 
   - 3km: Blue/Light colors (beginner-friendly)
   - 5km: Green/Medium colors (intermediate)
   - 10km: Red/Bold colors (advanced)
4. **Brand consistency**: Use your event colors and logo

### Design Tools:
- **Canva**: Free templates for event graphics
- **Figma**: Professional design tool
- **Adobe Photoshop/Illustrator**: Advanced editing

## How It Appears in the UI

The images will be displayed as clickable cards in the registration form:

- **Individual Registration**: 3 cards showing all available distances
- **Community Registration**: 3 cards showing all available distances
- **Family Registration**: Only shows 3km option (with image if available)

Each card shows:
- The category image (if imageUrl is set)
- Category name (e.g., "3km")
- Price information
- A "✓ Selected" badge when active

## Testing

After adding images:

1. Navigate to the registration page
2. Check all three registration types (Individual, Community, Family)
3. Verify images load correctly
4. Ensure selection interaction works properly
5. Test on mobile devices for responsive design

## Troubleshooting

### Images not showing?
1. Check file path is correct in database
2. Verify images exist in `public/images/categories/`
3. Check file extensions match (case-sensitive on some systems)
4. Clear browser cache and refresh

### Images too large?
1. Compress images using tools like TinyPNG
2. Resize to recommended dimensions (400x300px)
3. Convert to WebP format for better compression

## Schema Changes Made

The following changes were made to support category images:

1. **Database Schema** ([schema.prisma](prisma/schema.prisma#L33)):
   - Added `imageUrl String?` field to `RaceCategory` model

2. **TypeScript Interface** ([registration/page.tsx](src/app/registration/page.tsx#L10)):
   - Added `imageUrl?: string` to `Category` interface

3. **API Route** ([api/categories/route.ts](src/app/api/categories/route.ts)):
   - Added `imageUrl: true` to the select query

4. **UI Components** ([registration/page.tsx](src/app/registration/page.tsx)):
   - Updated Individual, Community, and Family registration sections
   - Changed from dropdown selects to visual card-based selection
   - Added image display with responsive design

## Next Steps

1. **Design or source images** for each kilometer option
2. **Place images** in `public/images/categories/`
3. **Update database** with image paths using one of the methods above
4. **Test** the registration form to ensure images display correctly
5. **(Optional)** Add fallback images or placeholder graphics

---

Need help? Check the registration page implementation in [src/app/registration/page.tsx](src/app/registration/page.tsx) for the complete UI code.
