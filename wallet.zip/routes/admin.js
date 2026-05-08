const router      = require('express').Router();
const User        = require('../models/User');
const Transaction = require('../models/Transaction');
const { adminAuth } = require('../middleware/auth');
const tg          = require('../helpers/telegram');

router.use(adminAuth);

// Stats
router.get('/stats', async (req, res) => {
  const [users, txns, bal] = await Promise.all([
    User.countDocuments(),
    Transaction.countDocuments({ status:'success' }),
    User.aggregate([{ $group:{ _id:null, total:{ $sum:'$balance' } } }])
  ]);
  const api_vol = await Transaction.aggregate([
    { $match:{ type:'api', status:'success' } },
    { $group:{ _id:null, total:{ $sum:'$amount' } } }
  ]);
  res.json({ status:'success', users, transactions:txns,
    total_balance: bal[0]?.total||0, api_volume: api_vol[0]?.total||0 });
});

// All users
router.get('/users', async (req, res) => {
  const users = await User.find().select('-password -login_pin').sort({ created_at:-1 });
  res.json({ status:'success', users });
});

// Add balance
router.post('/add-balance', async (req, res) => {
  const { mobile, amount } = req.body;
  const amt  = parseFloat(amount);
  const user = await User.findOneAndUpdate({ mobile }, { $inc:{ balance: amt } }, { new:true });
  if(!user) return res.status(404).json({ status:'error', message:'User not found' });
  await Transaction.create({ receiver_id:user._id, amount:amt, type:'admin_add', status:'success', remark:'Admin credit' });
  res.json({ status:'success', new_balance: user.balance });
});

// Deduct balance
router.post('/deduct-balance', async (req, res) => {
  const { mobile, amount } = req.body;
  const amt  = parseFloat(amount);
  const user = await User.findOne({ mobile });
  if(!user) return res.status(404).json({ status:'error', message:'User not found' });
  if(user.balance < amt) return res.status(400).json({ status:'error', message:'Insufficient balance' });
  await User.findByIdAndUpdate(user._id, { $inc:{ balance:-amt } });
  await Transaction.create({ sender_id:user._id, amount:amt, type:'admin_deduct', status:'success', remark:'Admin debit' });
  res.json({ status:'success' });
});

// Ban/Unban user
router.post('/ban/:id', async (req, res) => {
  const { type, until } = req.body; // type: 0/1/2
  const update = { is_banned: parseInt(type)||0, ban_until: until||null };
  await User.findByIdAndUpdate(req.params.id, update);
  res.json({ status:'success' });
});

// All transactions
router.get('/transactions', async (req, res) => {
  const txns = await Transaction.find().sort({ tx_time:-1 }).limit(200)
    .populate('sender_id','name mobile').populate('receiver_id','name mobile');
  res.json({ status:'success', transactions:txns });
});

// Approve withdraw
router.post('/approve-withdraw/:txn_id', async (req, res) => {
  await Transaction.findOneAndUpdate({ tx_id: req.params.txn_id }, { status:'success' });
  res.json({ status:'success' });
});

// Reject withdraw — refund balance
router.post('/reject-withdraw/:txn_id', async (req, res) => {
  const txn = await Transaction.findOne({ tx_id: req.params.txn_id, type:'withdraw', status:'pending' });
  if(!txn) return res.status(404).json({ status:'error', message:'Not found' });
  await User.findByIdAndUpdate(txn.sender_id, { $inc:{ balance: txn.amount } });
  await Transaction.findByIdAndUpdate(txn._id, { status:'rejected' });
  res.json({ status:'success' });
});

// Pending withdrawals
router.get('/withdrawals', async (req, res) => {
  const list = await Transaction.find({ type:'withdraw', status:'pending' }).sort({ tx_time:-1 })
    .populate('sender_id','name mobile');
  res.json({ status:'success', withdrawals:list });
});

// API transactions (same as all_api.php)
router.get('/api-transactions', async (req, res) => {
  const txns = await Transaction.find({ type:'api' }).sort({ tx_time:-1 }).limit(200)
    .populate('sender_id','name mobile tg_id balance')
    .populate('receiver_id','name mobile tg_id balance');
  res.json({ status:'success', transactions:txns });
});

// Manual notify single txn (like notify_txn button in all_api.php)
router.post('/notify-txn/:id', async (req, res) => {
  const txn = await Transaction.findById(req.params.id)
    .populate('sender_id','name mobile tg_id balance')
    .populate('receiver_id','name mobile tg_id balance');
  if(!txn) return res.status(404).json({ status:'error', message:'Not found' });

  const dt    = tg.fmtDate(txn.tx_time);
  const label = tg.txnLabel(txn._id, txn.amount);
  const sD    = txn.sender_id   ? `${txn.sender_id.name}\nNumber: ${txn.sender_id.mobile}`   : 'Unknown';
  const rD    = txn.receiver_id ? `${txn.receiver_id.name}\nNumber: ${txn.receiver_id.mobile}` : 'Unknown';

  if(txn.sender_id?.tg_id)   tg.sendAlert(txn.sender_id.tg_id,   tg.debitMsg(txn.amount, rD, label, dt, txn.sender_id.balance));
  if(txn.receiver_id?.tg_id) tg.sendAlert(txn.receiver_id.tg_id, tg.creditMsg(txn.amount, sD, label, dt, txn.receiver_id.balance));
  if(process.env.ADMIN_TG_ID) tg.sendAlert(process.env.ADMIN_TG_ID, tg.adminApiMsg(txn.amount, sD, rD, label, dt));

  res.json({ status:'success', notified: ['sender','receiver','admin'] });
});

module.exports = router;
