
/**
 * ระบบ Backend สำหรับจัดการข้อมูลโรงเรียนหนองบัวแดงวิทยา (Improved Version)
 * แก้ไขปัญหา Data Type Mismatch และเพิ่มประสิทธิภาพการทำงาน
 */

function doGet() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) return createJsonResponse({ error: "ไม่พบ Spreadsheet" });
    
    checkAndInitSheets(ss);
    
    const data = {
      teachers: getSheetData(ss, 'Teachers'),
      students: getSheetData(ss, 'Students'),
      clubs: getSheetData(ss, 'Clubs'),
      announcements: getSheetData(ss, 'Announcements'),
      settings: getSettings(ss)
    };
    
    return createJsonResponse(data);
  } catch (e) {
    return createJsonResponse({ error: e.toString() });
  }
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const data = payload.data;
    
    if (action === 'syncAll') {
      updateSheet(ss, 'Teachers', data.teachers);
      updateSheet(ss, 'Students', data.students);
      updateSheet(ss, 'Clubs', data.clubs);
      updateSheet(ss, 'Announcements', data.announcements);
      
      // บันทึกการตั้งค่า
      const settingsSheet = ss.getSheetByName('Settings');
      settingsSheet.clear();
      const headers = ['isSystemOpen', 'registrationRules'];
      const rules = Array.isArray(data.registrationRules) ? data.registrationRules.join('|') : "";
      settingsSheet.appendRow(headers);
      settingsSheet.appendRow([data.isSystemOpen, rules]);
    }
    
    return createJsonResponse({ status: 'success' });
  } catch (e) {
    return createJsonResponse({ status: 'error', message: e.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return [];
  
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data = [];
  
  // รายชื่อฟิลด์ที่ต้องการบังคับให้เป็น String เสมอเพื่อป้องกันปัญหาใน Frontend
  const stringFields = ['id', 'room', 'seatNumber', 'level', 'clubId', 'advisorId', 'coAdvisorId'];

  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      let val = rows[i][j];
      let header = headers[j];

      // จัดการค่า Boolean
      if (val === "true" || val === true) val = true;
      else if (val === "false" || val === false) val = false;
      // บังคับประเภทข้อมูลตามความเหมาะสม
      else if (stringFields.includes(header) && val !== null && val !== undefined) {
        val = String(val); // บังคับเป็น String สำหรับ ID และห้อง
      }
      
      obj[header] = (val === undefined || val === "") ? null : val;
    }
    data.push(obj);
  }
  return data;
}

function getSettings(ss) {
  const sheet = ss.getSheetByName('Settings');
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { isSystemOpen: true, registrationRules: [] };
  
  const headers = rows[0];
  const values = rows[1];
  const settings = {};
  
  for (let i = 0; i < headers.length; i++) {
    settings[headers[i]] = values[i];
  }
  
  // จัดรูปแบบระเบียบการจาก String กลับเป็น Array
  if (settings.registrationRules && typeof settings.registrationRules === 'string') {
    settings.registrationRules = settings.registrationRules.split('|').filter(r => r.trim() !== "");
  } else if (!Array.isArray(settings.registrationRules)) {
    settings.registrationRules = [];
  }
  
  // จัดการค่า Boolean ของ isSystemOpen
  if (settings.isSystemOpen === "false") settings.isSystemOpen = false;
  if (settings.isSystemOpen === "true") settings.isSystemOpen = true;

  return settings;
}

function updateSheet(ss, sheetName, dataArray) {
  const sheet = ss.getSheetByName(sheetName);
  sheet.clear(); // ล้างข้อมูลเดิมทั้งหมดรวมถึง Header
  
  const headers = getHeadersConfig()[sheetName];
  if (!headers) return;

  const rowsToPlace = [headers]; // ใส่ Header ก่อนในแถวแรก
  
  if (dataArray && dataArray.length > 0) {
    dataArray.forEach(obj => {
      const row = headers.map(h => {
        let val = obj[h];
        return (val === undefined || val === null) ? "" : val;
      });
      rowsToPlace.push(row);
    });
  }
  
  // เขียนข้อมูลทั้งหมดรวดเดียว (เร็วกว่า appendRow ใน loop มาก)
  sheet.getRange(1, 1, rowsToPlace.length, headers.length).setValues(rowsToPlace);
}

function checkAndInitSheets(ss) {
  const configs = getHeadersConfig();
  Object.keys(configs).forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(configs[name]);
    }
  });
}

function getHeadersConfig() {
  return {
    'Teachers': ['id', 'name', 'department'],
    'Students': ['id', 'name', 'level', 'room', 'seatNumber', 'clubId', 'grade', 'note'],
    'Clubs': ['id', 'name', 'type', 'description', 'levelTarget', 'capacity', 'location', 'phone', 'advisorId', 'coAdvisorId'],
    'Announcements': ['id', 'title', 'content', 'date', 'isPinned', 'isHidden'],
    'Settings': ['isSystemOpen', 'registrationRules']
  };
}
