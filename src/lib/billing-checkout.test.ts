import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { transpileModule, ScriptTarget } from 'typescript';

// Run the actual checkout handler against an isolated transport, without writing shop data.
const source = readFileSync('src/app/billing/page.tsx', 'utf8');
const start = source.indexOf('  const handleGenerateBill = async');
const code = transpileModule(source.slice(start, source.indexOf('  // AI & OCR Common Logic', start)), { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText;
function setup(fetcher: (url: string, options: any) => Promise<any>) {
  const scope: any = { cart: [{ name: 'Tea', quantity: 2, price: 20 }], customerInfo: { name: ' A Customer ', phone: '9876543210', paymentMethod: 'UPI', status: 'PAID' }, shop: { id: 'test' }, saveInFlight: { current: false }, fetch: fetcher, fetchBills: () => {} };
  for (const key of ['CheckoutError', 'SavingBill', 'SavedBill', 'SelectedBill', 'Cart', 'CustomerInfo', 'ShowCartSheet', 'IsSearching', 'Mode']) scope[`set${key}`] = (value: any) => { scope[key] = value; };
  const save: () => Promise<void> = new Function('scope', `with(scope) { ${code}; return handleGenerateBill; }`)(scope);
  return { scope, save };
}

test('successful checkout sends customer API fields and opens the saved receipt', async () => {
  let payload: any;
  const bill = { id: 'saved', billNumber: 12 };
  const { scope, save } = setup(async (_url, options) => { payload = JSON.parse(options.body); return { ok: true, json: async () => bill }; });
  await save();
  assert.equal(payload.customerName, 'A Customer');
  assert.equal(payload.customerPhone, '9876543210');
  assert.equal(payload.paymentMethod, 'UPI');
  assert.equal(payload.status, 'PAID');
  assert.equal(scope.SelectedBill, bill);
  assert.deepEqual(scope.Cart, []);
  assert.equal(scope.SavingBill, false);
});

test('failed save preserves the cart and customer details', async () => {
  const { scope, save } = setup(async () => ({ ok: false }));
  await save();
  assert.equal(scope.Cart, undefined);
  assert.equal(scope.CustomerInfo, undefined);
  assert.match(scope.CheckoutError, /still here/);
  assert.equal(scope.saveInFlight.current, false);
});

test('network failure preserves the draft and warns about uncertain delivery', async () => {
  const { scope, save } = setup(async () => { throw new TypeError('Failed to fetch'); });
  await save();
  assert.equal(scope.Cart, undefined);
  assert.match(scope.CheckoutError, /Check Bills before retrying/);
});

test('double-clicks cannot submit a second bill while saving', async () => {
  let finish!: (value: any) => void;
  let calls = 0;
  const { save } = setup(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
  const pending = save();
  await save();
  assert.equal(calls, 1);
  finish({ ok: true, json: async () => ({ id: 'saved' }) });
  await pending;
});

test('invalid phone and invalid quantities are blocked before submitting', async () => {
  let calls = 0;
  const { scope, save } = setup(async () => { calls++; return { ok: false }; });
  scope.customerInfo.phone = '123';
  await save();
  assert.match(scope.CheckoutError, /10-digit/);
  scope.customerInfo.phone = '';
  scope.cart[0].quantity = -1;
  await save();
  assert.match(scope.CheckoutError, /quantities/);
  assert.equal(calls, 0);
});
