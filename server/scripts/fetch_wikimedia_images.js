const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const vehicles = [
  { name: 'Maruti Suzuki Swift', query: 'Maruti Suzuki Swift car', slug: 'maruti-suzuki-swift' },
  { name: 'Maruti Suzuki Alto K10', query: 'Maruti Suzuki Alto K10', slug: 'maruti-suzuki-alto-k10' },
  { name: 'Tata Tiago', query: 'Tata Tiago', slug: 'tata-tiago' },
  { name: 'Hyundai Grand i10 Nios', query: 'Hyundai Grand i10 Nios', slug: 'hyundai-grand-i10-nios' },
  { name: 'Maruti Suzuki Dzire', query: 'Maruti Suzuki Dzire', slug: 'maruti-suzuki-dzire' },
  { name: 'Honda Amaze', query: 'Honda Amaze', slug: 'honda-amaze' },
  { name: 'Tata Tigor', query: 'Tata Tigor', slug: 'tata-tigor' },
  { name: 'Tata Nexon', query: 'Tata Nexon', slug: 'tata-nexon' },
  { name: 'Tata Punch', query: 'Tata Punch', slug: 'tata-punch' },
  { name: 'Mahindra XUV700', query: 'Mahindra XUV700', slug: 'mahindra-xuv700' },
  { name: 'Mahindra Scorpio-N', query: 'Mahindra Scorpio-N', slug: 'mahindra-scorpio-n' },
  { name: 'Mahindra Thar', query: 'Mahindra Thar', slug: 'mahindra-thar' },
  { name: 'Maruti Suzuki Ertiga', query: 'Maruti Suzuki Ertiga', slug: 'maruti-suzuki-ertiga' },
  { name: 'Toyota Innova Crysta', query: 'Toyota Innova Crysta', slug: 'toyota-innova-crysta' },
  { name: 'Mercedes-Benz E-Class', query: 'Mercedes-Benz E-Class W213', slug: 'mercedes-benz-e-class' }
];

async function searchCommons(query) {
  const q = encodeURIComponent(query);
  const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=10&gsrsearch=${q}&prop=imageinfo&iiprop=url|size|mime|extmetadata`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'VehicleRentalSystem/1.0 (contact@rentfleet.com)' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.query || !data.query.pages) return [];
    const pages = Object.values(data.query.pages);
    return pages
      .filter(p => p.imageinfo && p.imageinfo[0] && (p.imageinfo[0].mime === 'image/jpeg' || p.imageinfo[0].mime === 'image/png'))
      .map(p => ({
        title: p.title,
        url: p.imageinfo[0].url,
        width: p.imageinfo[0].width,
        height: p.imageinfo[0].height,
        mime: p.imageinfo[0].mime
      }));
  } catch (err) {
    console.error('Error querying commons for', query, err.message);
    return [];
  }
}

async function run() {
  const results = {};
  for (const v of vehicles) {
    console.log(`Searching for: ${v.name} (query: "${v.query}")...`);
    const candidates = await searchCommons(v.query);
    console.log(`  Found ${candidates.length} candidate(s).`);
    candidates.forEach((c, idx) => {
      console.log(`    [${idx+1}] ${c.title} (${c.width}x${c.height})`);
    });
    results[v.slug] = candidates;
  }
  fs.writeFileSync(path.join(__dirname, 'commons_search_results.json'), JSON.stringify(results, null, 2));
  console.log('Search complete. Saved to commons_search_results.json');
}

run();
