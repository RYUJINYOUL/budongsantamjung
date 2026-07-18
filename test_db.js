const mysql = require('mysql2/promise');
(async () => {
  const pool = mysql.createPool({ host: "127.0.0.1", user: "root", password: "", database: "budongsantamjung" });
  try {
    const [rows] = await pool.execute("SELECT id, title, parsed_data FROM gosi_data WHERE region_code = '11680' AND parse_status='success' LIMIT 2");
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
})();
