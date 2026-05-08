const axios = require('axios');

const IST = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

function fmtDate(d) {
  const dt = d || IST();
  return dt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata',
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true });
}

async function sendAlert(tg_id, message) {
  if(!tg_id || !process.env.BOT_TOKEN) return;
  try {
    await axios.post(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
      chat_id: tg_id, text: message, parse_mode: 'Markdown'
    }, { timeout: 8000 });
  } catch(e) { /* silent */ }
}

// Exact same format as PHP all_api.php
function debitMsg(amount, toDisplay, txnLabel, date, balance) {
  return `🔴 DEBIT ALERT BY UNIO 🔴\n\n━━━━━━━━━━━━━━\n🔴   UNIO WALLET ✅ 😘 🔴\n━━━━━━━━━━━━━━\n\n💰 Amount : ₹${amount}\n👤 To : ${toDisplay}\n🆔 Txn ID : ${txnLabel}\n📋 Type : API TRANSFER\n📅 Date : ${date}\n\n━━━━━━━━━━━━━━\n🪙 Total Balance : ₹${balance}\n━━━━━━━━━━━━━━\n\n❌ Amount Debited through UNIO Wallet 🔴`;
}

function creditMsg(amount, fromDisplay, txnLabel, date, balance) {
  return `🟢 CREDIT SUCCESSFUL BY UNIO 🟢\n\n━━━━━━━━━━━━━━\n🟢   UNIO WALLET ✅ 😘 🟢\n━━━━━━━━━━━━━━\n\n💰 Amount : ₹${amount}\n👤 From : ${fromDisplay}\n🆔 Txn ID : ${txnLabel}\n📋 Type : API TRANSFER\n📅 Date : ${date}\n\n━━━━━━━━━━━━━━\n🪙 Total Balance : ₹${balance}\n━━━━━━━━━━━━━━\n\n✅ Transaction Completed through UNIO Wallet 🟢`;
}

function transferDebitMsg(amount, toMobile, txnLabel, date, balance) {
  return `💸 *DEBIT ALERT*\n\n━━━━━━━━━━━━━━\n✅ Status: Success\n💰 Amount: ₹${amount}\n📱 Sent to: \`${toMobile}\`\n🔖 TX: \`${txnLabel}\`\n📅 Date: ${date}\n━━━━━━━━━━━━━━\n🪙 Balance: ₹${balance}`;
}

function transferCreditMsg(amount, fromMobile, txnLabel, date, balance) {
  return `💰 *CREDIT ALERT*\n\n━━━━━━━━━━━━━━\n✅ Status: Success\n💰 Amount: ₹${amount}\n👤 From: \`${fromMobile}\`\n🔖 TX: \`${txnLabel}\`\n📅 Date: ${date}\n━━━━━━━━━━━━━━\n🪙 Balance: ₹${balance}`;
}

function withdrawMsg(mobile, amount, upi) {
  return `📥 *NEW WITHDRAW REQUEST*\n\n━━━━━━━━━━━━━━\n👤 *User:* \`${mobile}\`\n💰 *Amount:* ₹${amount}\n💳 *UPI ID:* \`${upi}\`\n⏳ *Status:* Pending\n\n_UNIO Payout System_`;
}

function adminApiMsg(amount, fromDisplay, toDisplay, txnLabel, date) {
  return `📡 NEW API TXN — UNIO ADMIN\n\n━━━━━━━━━━━━━━\n🔷   UNIO WALLET ADMIN 🔷\n━━━━━━━━━━━━━━\n\n💰 Amount : ₹${amount}\n📤 From : ${fromDisplay}\n📥 To : ${toDisplay}\n🆔 Txn ID : ${txnLabel}\n📋 Type : API TRANSFER\n📅 Date : ${date}\n\n━━━━━━━━━━━━━━\n✅ Transaction Logged Successfully`;
}

function txnLabel(id, amount) {
  const crypto = require('crypto');
  return 'UNIO' + crypto.createHash('md5').update(String(id) + String(amount)).digest('hex').slice(0,10).toUpperCase();
}

module.exports = { sendAlert, fmtDate, IST, debitMsg, creditMsg, transferDebitMsg, transferCreditMsg, withdrawMsg, adminApiMsg, txnLabel };
