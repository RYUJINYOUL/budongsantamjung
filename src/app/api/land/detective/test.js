fetch('http://localhost:3000/api/land/detective/discovery/global/11470')
  .then(r => r.json())
  .then(data => {
     const gosi = data.gosi;
     if (gosi && gosi.length > 0) {
        console.log("gosi[0].parsedData type:", typeof gosi[0].parsedData);
        if (typeof gosi[0].parsedData === 'string') {
          console.log("It's a string. Let's parse it.");
          const p = JSON.parse(gosi[0].parsedData);
          console.log("Parsed keys:", Object.keys(p));
        } else if (gosi[0].parsedData) {
          console.log("It's an object. Keys:", Object.keys(gosi[0].parsedData));
        }
        console.log("locations array:", gosi[0].locations);
     } else {
        console.log("gosi is empty");
     }
  })
  .catch(console.error);
