const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const targetDir = path.resolve(__dirname, '../../client/public/vehicles');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const generatedScorpioN = 'C:\\Users\\SAGAR\\.gemini\\antigravity-ide\\brain\\d8ce71f0-3043-4076-b6ee-37833451627d\\mahindra_scorpio_n_1791917317137.jpg';

const vehicleSources = [
  {
    name: 'Maruti Suzuki Swift',
    slug: 'maruti-suzuki-swift',
    source: 'Wikimedia Commons',
    url: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/2018_Suzuki_Swift_SZ5_Boosterjet_SHVS_1.0_Front.jpg'
  },
  {
    name: 'Maruti Suzuki Alto K10',
    slug: 'maruti-suzuki-alto-k10',
    source: 'Wikimedia Commons',
    url: 'https://upload.wikimedia.org/wikipedia/commons/e/e2/SuzukiAltok10.jpg'
  },
  {
    name: 'Tata Tiago',
    slug: 'tata-tiago',
    source: 'Wikimedia Commons',
    url: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/2022_Tata_Tiago_XZA%2B_front_20230512.jpg'
  },
  {
    name: 'Hyundai Grand i10 Nios',
    slug: 'hyundai-grand-i10-nios',
    source: 'Wikimedia Commons',
    url: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/2021_Hyundai_Grand_i10_Nios_1.0AT_Standard_red_front_view_in_Brunei.jpg'
  },
  {
    name: 'Maruti Suzuki Dzire',
    slug: 'maruti-suzuki-dzire',
    source: 'Wikimedia Commons',
    url: 'https://upload.wikimedia.org/wikipedia/commons/6/61/Maruti_Suzuki_Dzire_VXi_VVT_-_Subcompact_Car_-_Kolkata_2018-01-17_7574.JPG'
  },
  {
    name: 'Honda Amaze',
    slug: 'honda-amaze',
    source: 'Wikimedia Commons',
    url: 'https://upload.wikimedia.org/wikipedia/commons/0/0b/Honda_Amaze_India_Side_View.jpg'
  },
  {
    name: 'Tata Tigor',
    slug: 'tata-tigor',
    source: 'Wikimedia Commons',
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/TATA_Tigor_at_Shillong_Peak_View.jpg'
  },
  {
    name: 'Tata Nexon',
    slug: 'tata-nexon',
    source: 'Wikimedia Commons',
    url: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/2023_Tata_Nexon_XZA%2B_front_view.jpg'
  },
  {
    name: 'Tata Punch',
    slug: 'tata-punch',
    source: 'Wikimedia Commons',
    url: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/2021_Tata_Punch_Creative_%28India%29_front_view_01.png'
  },
  {
    name: 'Mahindra XUV700',
    slug: 'mahindra-xuv700',
    source: 'Wikimedia Commons',
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/35/2023_Mahindra_XUV700_AX7L_front.jpg'
  },
  {
    name: 'Mahindra Scorpio-N',
    slug: 'mahindra-scorpio-n',
    source: 'AI Generated Studio Photo (White background 3/4 view)',
    localPath: generatedScorpioN
  },
  {
    name: 'Mahindra Thar',
    slug: 'mahindra-thar',
    source: 'Wikimedia Commons',
    url: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Mahindra_Thar_in_dark_red.jpg'
  },
  {
    name: 'Maruti Suzuki Ertiga',
    slug: 'maruti-suzuki-ertiga',
    source: 'Wikimedia Commons',
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/23/2022_Maruti_Suzuki_Ertiga_LXi.jpg'
  },
  {
    name: 'Toyota Innova Crysta',
    slug: 'toyota-innova-crysta',
    source: 'Wikimedia Commons',
    url: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Toyota_Innova_Crysta_2.4_Z_front_right.jpg'
  },
  {
    name: 'Mercedes-Benz E-Class',
    slug: 'mercedes-benz-e-class',
    source: 'Wikimedia Commons',
    url: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/MERCEDES-BENZ_E_CLASS_LWB_%28V213%29_China_%283%29.jpg'
  }
];

async function createPlaceholder() {
  const svg = `
  <svg width="800" height="500" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" />
        <stop offset="100%" stop-color="#1e293b" />
      </linearGradient>
      <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#4f46e5" />
        <stop offset="100%" stop-color="#6366f1" />
      </linearGradient>
    </defs>
    <rect width="800" height="500" fill="url(#grad)" />
    <g transform="translate(400, 210)" text-anchor="middle">
      <!-- Car silhouette icon -->
      <path d="M -90 40 C -90 30, -85 20, -75 20 L -60 20 L -40 -15 C -35 -25, -25 -30, -10 -30 L 40 -30 C 55 -30, 65 -25, 70 -15 L 90 20 L 105 20 C 115 20, 120 30, 120 40 L 120 50 C 120 55, 115 60, 110 60 L 95 60 C 95 75, 80 85, 65 85 C 50 85, 40 75, 40 60 L -40 60 C -40 75, -55 85, -70 85 C -85 85, -95 75, -95 60 L -105 60 C -115 60, -120 55, -120 50 Z" fill="none" stroke="url(#glow)" stroke-width="4" stroke-linejoin="round" />
      <circle cx="-67" cy="60" r="16" fill="#334155" stroke="url(#glow)" stroke-width="4" />
      <circle cx="67" cy="60" r="16" fill="#334155" stroke="url(#glow)" stroke-width="4" />
      <!-- Windows -->
      <path d="M -50 15 L -35 -18 C -32 -22, -26 -24, -15 -24 L 0 -24 L 0 15 Z" fill="#334155" opacity="0.6" />
      <path d="M 8 15 L 8 -24 L 35 -24 C 45 -24, 52 -20, 56 -15 L 75 15 Z" fill="#334155" opacity="0.6" />
    </g>
    <text x="400" y="340" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="bold" fill="#f8fafc" text-anchor="middle" letter-spacing="1">VEHICLE IMAGE</text>
    <text x="400" y="375" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="500" fill="#94a3b8" text-anchor="middle">RentFleet India Verified Fleet</text>
  </svg>
  `;

  const dest = path.join(targetDir, 'placeholder.jpg');
  await sharp(Buffer.from(svg))
    .resize(800, 500)
    .jpeg({ quality: 90 })
    .toFile(dest);
  const stat = fs.statSync(dest);
  console.log(`Created placeholder.jpg: ${stat.size} bytes (800x500)`);
}

async function processAll() {
  console.log('--- Processing All Vehicle Images (800x500, < 300KB) ---');
  await createPlaceholder();

  const summaryTable = [];

  for (const item of vehicleSources) {
    const dest = path.join(targetDir, `${item.slug}.jpg`);
    console.log(`Processing ${item.name} -> ${item.slug}.jpg...`);

    try {
      let inputBuffer;
      if (item.localPath) {
        inputBuffer = fs.readFileSync(item.localPath);
      } else {
        const res = await fetch(item.url, {
          headers: { 'User-Agent': 'VehicleRentalSystem/1.0 (contact@rentfleet.com)' }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${item.url}`);
        inputBuffer = Buffer.from(await res.arrayBuffer());
      }

      await sharp(inputBuffer)
        .resize(800, 500, {
          fit: 'cover',
          position: 'centre'
        })
        .jpeg({ quality: 85, mozjpeg: true })
        .toFile(dest);

      const stat = fs.statSync(dest);
      const sizeKB = (stat.size / 1024).toFixed(1);
      console.log(`  ✓ Saved ${item.slug}.jpg: ${sizeKB} KB (800x500)`);

      summaryTable.push({
        vehicle: item.name,
        file: `/vehicles/${item.slug}.jpg`,
        sizeKB: `${sizeKB} KB`,
        source: item.source
      });
    } catch (err) {
      console.error(`  ✗ Error processing ${item.name}:`, err.message);
      // Fallback to placeholder if an item fails
      fs.copyFileSync(path.join(targetDir, 'placeholder.jpg'), dest);
      summaryTable.push({
        vehicle: item.name,
        file: `/vehicles/${item.slug}.jpg`,
        sizeKB: 'Fallback',
        source: 'Placeholder fallback'
      });
    }
  }

  console.log('\n--- Image Processing Complete ---');
  console.table(summaryTable);
  fs.writeFileSync(
    path.join(__dirname, 'image_processing_summary.json'),
    JSON.stringify(summaryTable, null, 2)
  );
}

processAll();
