const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const vehicleImageMapping = {
  'Swift ZXi': '/vehicles/maruti-suzuki-swift.jpg',
  'Alto K10 VXi': '/vehicles/maruti-suzuki-alto-k10.jpg',
  'Tiago XZ+': '/vehicles/tata-tiago.jpg',
  'Grand i10 Nios Asta': '/vehicles/hyundai-grand-i10-nios.jpg',
  'Dzire ZXi Plus': '/vehicles/maruti-suzuki-dzire.jpg',
  'Amaze VX CVT': '/vehicles/honda-amaze.jpg',
  'Tigor XZ+ EV': '/vehicles/tata-tigor.jpg',
  'Nexon Fearless+ S': '/vehicles/tata-nexon.jpg',
  'Punch Creative': '/vehicles/tata-punch.jpg',
  'XUV700 AX7 Luxury': '/vehicles/mahindra-xuv700.jpg',
  'Scorpio-N Z8L 4x4': '/vehicles/mahindra-scorpio-n.jpg',
  'Thar LX 4x4 Hard Top': '/vehicles/mahindra-thar.jpg',
  'Ertiga ZXi CNG': '/vehicles/maruti-suzuki-ertiga.jpg',
  'Innova Crysta 2.4 VX': '/vehicles/toyota-innova-crysta.jpg',
  'E-Class Exclusive LWB (Chauffeur Taxi)': '/vehicles/mercedes-benz-e-class.jpg',
};

async function updateVehicleImagesOnly() {
  console.log('🔄 Updating vehicle_images table only (preserving users, bookings, payments)...');
  const vehicles = await prisma.vehicle.findMany({
    include: { images: true }
  });

  let updatedCount = 0;
  for (const v of vehicles) {
    const newImageUrl = vehicleImageMapping[v.model];
    if (!newImageUrl) {
      console.warn(`No mapping found for vehicle model: ${v.model}`);
      continue;
    }

    // Delete existing images for this vehicle to keep exactly one primary image
    await prisma.vehicleImage.deleteMany({
      where: { vehicleId: v.id }
    });

    // Create the updated primary image row
    await prisma.vehicleImage.create({
      data: {
        vehicleId: v.id,
        imageUrl: newImageUrl,
        isPrimary: true,
        caption: `${v.make} ${v.model} Front View`,
      }
    });

    console.log(`✓ Updated [${v.make} ${v.model}] -> ${newImageUrl}`);
    updatedCount++;
  }

  console.log(`\n🎉 Successfully updated ${updatedCount} vehicle image records!`);
  await prisma.$disconnect();
}

updateVehicleImagesOnly().catch(err => {
  console.error('Error updating vehicle images:', err);
  process.exit(1);
});
