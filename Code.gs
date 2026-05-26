function doGet(e) {
  // If we just want to get the JSON data
  const songs = getSongData();
  
  // Return JSON for our PWA to fetch
  return ContentService.createTextOutput(JSON.stringify(songs))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSongData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  // Get all data starting from row 2 (assuming row 1 has headers)
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 5).getDisplayValues();
  
  const songs = data.map(row => {
    return {
      category: row[0].trim(),
      gujaratiName: row[1].trim(),
      englishName: row[2].trim(),
      lyrics: row[3].trim(),
      youtubeLink: row[4].trim()
    };
  }).filter(song => song.englishName !== ''); // Filter out empty rows
  
  return songs;
}
