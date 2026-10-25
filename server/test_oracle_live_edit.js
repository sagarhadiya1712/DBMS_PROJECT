const http = require('http');
const { executeOracle } = require('./db/oracle');

async function testOracleLiveEdit() {
  console.log('Connecting to SSE stream...');
  const req = http.get('http://localhost:5000/api/realtime/stream', (res) => {
    res.on('data', (chunk) => {
      const text = chunk.toString();
      console.log('📡 SSE EVENT:', text.trim().replace(/\n/g, ' '));
      
      if (text.includes('db-change') && text.includes('vehicles')) {
        console.log('🎯 Realtime notification received for Oracle update!');
        // Verify API has the updated data immediately
        setTimeout(() => {
          fetch('http://localhost:5000/api/vehicles')
            .then(r => r.json())
            .then(list => {
              const v = list.find(item => item.vehicle_id === 1);
              console.log('✅ VERIFIED VIA REST API:', {
                vehicle_id: v.vehicle_id,
                name: v.name,
                security_deposit: v.security_deposit
              });
              process.exit(0);
            });
        }, 300);
      }
    });

    // After 1 second, simulate external user editing Oracle SQL Developer & committing
    setTimeout(async () => {
      console.log('⚡ [Simulating SQL Developer Edit]: UPDATE vehicles SET name = \'Swift Prime\', security_deposit = 2800 WHERE vehicle_id = 1; COMMIT;');
      await executeOracle("UPDATE vehicles SET name = 'Swift Prime', security_deposit = 2800 WHERE vehicle_id = 1");
    }, 1200);
  });

  setTimeout(() => {
    console.error('❌ Timeout waiting for realtime event');
    process.exit(1);
  }, 9000);
}

testOracleLiveEdit().catch(e => {
  console.error(e);
  process.exit(1);
});
