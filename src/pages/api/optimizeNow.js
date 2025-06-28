export default async function handler(req, res) {
  const { accountId } = req.body;
  await optimizeSingleAccount(accountId);
  res.status(200).json({ success: true });
}