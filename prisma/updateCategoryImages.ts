import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateCategoryImages() {
  try {
    console.log('Updating category images...');

    // Update 3km category
    const cat3km = await prisma.raceCategory.update({
      where: { name: '3km' },
      data: { imageUrl: '/images/categories/3km.png' }
    });
    console.log('✅ Updated 3km:', cat3km.name, '→', cat3km.imageUrl);

    // Update 5km category
    const cat5km = await prisma.raceCategory.update({
      where: { name: '5km' },
      data: { imageUrl: '/images/categories/5km.png' }
    });
    console.log('✅ Updated 5km:', cat5km.name, '→', cat5km.imageUrl);

    // Update 10km category
    const cat10km = await prisma.raceCategory.update({
      where: { name: '10km' },
      data: { imageUrl: '/images/categories/10km.png' }
    });
    console.log('✅ Updated 10km:', cat10km.name, '→', cat10km.imageUrl);

    console.log('\n🎉 Category images updated successfully!');
  } catch (error) {
    console.error('❌ Error updating category images:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateCategoryImages();
