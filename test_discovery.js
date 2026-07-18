const fs = require('fs');
fetch('http://localhost:3001/api/land/detective/discovery/global/11680')
  .then(res => res.json())
  .then(data => {
    const gosi = data.gosi;
    console.log("gosi count:", gosi?.length);
    if(gosi && gosi.length > 0) {
      console.log("first gosi locations:", gosi[0].locations);
      console.log("first gosi parsedData type:", typeof gosi[0].parsedData);
      console.log("first gosi parsedData keys:", gosi[0].parsedData ? Object.keys(gosi[0].parsedData) : null);
    }
  })
  .catch(console.error);
