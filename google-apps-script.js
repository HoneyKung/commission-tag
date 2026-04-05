/* ========================================
   MOFYCH - Google Apps Script
   ========================================
   
   📋 วิธีตั้งค่า:
   1. ไปที่ https://script.google.com/
   2. สร้าง Project ใหม่
   3. Copy code ด้านล่างทั้งหมดไปวาง
   4. สร้าง Google Sheets ใหม่ แล้ว copy URL ของ Sheet มาใส่ในตัวแปร SHEET_URL
   5. กด Deploy > New Deployment > Web App
   6. ตั้ง Execute as: Me, Who has access: Anyone
   7. Copy URL ของ Web App ไปใส่ในไฟล์ script.js (ตัวแปร APPS_SCRIPT_URL)
   
   ======================================== */

// ===== ตั้งค่าตรงนี้ =====
const SHEET_URL = 'YOUR_GOOGLE_SHEETS_URL_HERE';
const SHEET_NAME = 'ฝากแทค';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.openByUrl(SHEET_URL).getSheetByName(SHEET_NAME);

    if (!sheet) {
      // สร้าง Sheet ใหม่ถ้ายังไม่มี
      const ss = SpreadsheetApp.openByUrl(SHEET_URL);
      ss.insertSheet(SHEET_NAME);
      const newSheet = ss.getSheetByName(SHEET_NAME);
      newSheet.appendRow(['ID', 'ชื่อ', 'Email', 'LINE ID', 'สินค้า', 'หมายเหตุ', 'สถานะ', 'คิว', 'วันที่']);
    }

    if (data.action === 'register') {
      // ลงชื่อฝากแทค
      sheet.appendRow([
        data.id,
        data.name,
        data.email,
        data.lineId || '',
        data.productName,
        data.note || '',
        'active',
        'รอคิว',
        new Date().toLocaleString('th-TH')
      ]);

      // ส่ง Email ยืนยัน
      sendConfirmEmail(data.email, data.name, data.productName);

      return ContentService.createTextOutput(
        JSON.stringify({ success: true, message: 'ลงชื่อสำเร็จ' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'broadcast') {
      // ส่ง Email แจ้งเตือนทุกคน
      const emails = getActiveEmails();
      emails.forEach(item => {
        sendBroadcastEmail(item.email, item.name, item.products);
      });

      return ContentService.createTextOutput(
        JSON.stringify({ success: true, count: emails.length })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'getRegistrations') {
      // ดึงรายชื่อทั้งหมด
      const allData = sheet.getDataRange().getValues();
      const headers = allData[0];
      const rows = allData.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]);
        return obj;
      });

      return ContentService.createTextOutput(
        JSON.stringify({ success: true, data: rows })
      ).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: error.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: 'MOFYCH API is running' })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ===== Email Functions =====

function sendConfirmEmail(email, name, productName) {
  const subject = '✦ MOFYCH — ยืนยันการฝากแทคสำเร็จ';
  const htmlBody = `
    <div style="font-family: 'Kanit', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #1e4d7b; font-size: 28px; letter-spacing: 2px;">MOFYCH</h1>
      </div>
      <div style="background: #f0f7fe; border-radius: 12px; padding: 24px; text-align: center;">
        <p style="font-size: 18px; color: #1e4d7b; font-weight: 600;">✦ ฝากแทคสำเร็จ!</p>
        <p style="color: #6b7280;">สวัสดีค่ะ คุณ ${name}</p>
        <p style="color: #6b7280;">คุณได้ฝากแทคสินค้า: <strong style="color: #2563a0;">${productName}</strong></p>
        <hr style="border: none; border-top: 1px solid #e2e5ea; margin: 16px 0;">
        <p style="color: #9199a5; font-size: 14px;">เราจะส่ง Email แจ้งเตือนเมื่อเปิดรอบใหม่</p>
        <p style="color: #9199a5; font-size: 13px;">หากไม่ต้องการรับแจ้งเตือน กรุณาตอบกลับ Email นี้</p>
      </div>
      <p style="text-align: center; color: #c4c9d2; font-size: 12px; margin-top: 24px;">
        © 2026 MOFYCH. All rights reserved.
      </p>
    </div>
  `;

  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlBody
  });
}

function sendBroadcastEmail(email, name, products) {
  const subject = '✦ MOFYCH เปิดรับ Commission รอบใหม่แล้ว!';
  const productList = products.map(p => `• ${p}`).join('<br>');
  const htmlBody = `
    <div style="font-family: 'Kanit', sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #1e4d7b; font-size: 28px; letter-spacing: 2px;">MOFYCH</h1>
      </div>
      <div style="background: #f0f7fe; border-radius: 12px; padding: 24px;">
        <p style="font-size: 20px; color: #1e4d7b; font-weight: 600; text-align: center;">
          ✦ เปิดรับรอบใหม่แล้ว!
        </p>
        <p style="color: #6b7280;">สวัสดีค่ะ คุณ ${name}</p>
        <p style="color: #6b7280;">สินค้าที่คุณฝากแทค:</p>
        <div style="background: white; border-radius: 8px; padding: 16px; margin: 12px 0; color: #2563a0; font-weight: 500;">
          ${productList}
        </div>
        <p style="color: #6b7280;">กรุณาติดต่อเราเพื่อยืนยันการสั่งทำนะคะ ✦</p>
        <hr style="border: none; border-top: 1px solid #e2e5ea; margin: 16px 0;">
        <p style="color: #9199a5; font-size: 13px;">หากไม่ต้องการรับแจ้งเตือน กรุณาตอบกลับ Email นี้</p>
      </div>
      <p style="text-align: center; color: #c4c9d2; font-size: 12px; margin-top: 24px;">
        © 2026 MOFYCH. All rights reserved.
      </p>
    </div>
  `;

  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: htmlBody
  });
}

function getActiveEmails() {
  const sheet = SpreadsheetApp.openByUrl(SHEET_URL).getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const emailMap = {};

  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const email = data[i][2]; // Email column
    const name = data[i][1];  // Name column
    const product = data[i][4]; // Product column
    const status = data[i][6]; // Status column

    if (status === 'active') {
      if (!emailMap[email]) {
        emailMap[email] = { email, name, products: [] };
      }
      emailMap[email].products.push(product);
    }
  }

  return Object.values(emailMap);
}
