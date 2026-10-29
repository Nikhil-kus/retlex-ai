import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import * as React from 'react';
import { createSourceFile, isFunctionDeclaration, JsxEmit, ScriptKind, ScriptTarget, transpileModule } from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';
import BillingBillSection from '../components/BillingBillSection';
import { generateWhatsAppMessage } from './whatsapp-utils';

// Exercise the real form events and save handlers, without writing test bills
// to the shop's database or opening WhatsApp.
for (const page of ['billing', 'customer']) {
  const path = page === 'billing' ? 'src/components/pages/BillingWorkspace.tsx' : `src/app/${page}/page.tsx`;
  const source = readFileSync(path, 'utf8');
  const file = createSourceFile(path, source, ScriptTarget.Latest, true, ScriptKind.TSX);
  const sheet = file.statements.find(node => isFunctionDeclaration(node) && node.name?.text === 'CartBottomSheet');
  assert.ok(sheet);
  const compile = (code: string) => transpileModule(code, {
    compilerOptions: { target: ScriptTarget.ES2022, jsx: JsxEmit.React },
  }).outputText;
  const start = source.indexOf('  const handleGenerateBill = async');
  const end = source.indexOf('  // AI & OCR Common Logic', start);
  assert.ok(start >= 0 && end > start);
  const saveCode = compile(source.slice(start, end));
  const sheetCode = compile(sheet.getText(file));

  function setup() {
    let posts = 0;
    let saved: any;
    let failure = false;
    let resolveSave: ((value: { ok: boolean }) => void) | undefined;
    let collapsed = false;
    const whatsapp: { phone: string; message: string }[] = [];
    const scope: any = {
      cart: [{ productId: 'tea', name: 'Tea', quantity: 1, price: 20, unit: 'pc' }],
      customerInfo: { name: '', phone: '', status: 'PAID', paymentMethod: 'CASH' },
      savingBill: false,
      shop: { id: 'local-test', name: 'Local test shop' },
      setSavingBill: (value: boolean) => { scope.savingBill = value; },
      setCart: (value: any[]) => { scope.cart = value; },
      setCustomerInfo: (value: any) => { scope.customerInfo = value; },
      setMode: () => {},
      calculateItemTotal: (item: any) => item.price * item.quantity,
      generateWhatsAppMessage,
      openWhatsAppChat: (phone: string, message: string) => { whatsapp.push({ phone, message }); },
      fetchBills: () => {},
      alert: () => {},
      console: { error: () => {} },
      fetch: async (_url: string, options: { body: string }) => {
        posts++;
        saved = { id: 'saved', createdAt: new Date().toISOString(), ...JSON.parse(options.body) };
        return new Promise<{ ok: boolean }>(resolve => { resolveSave = resolve; });
      },
    };
    const handleGenerateBill = new Function('scope', `with (scope) { ${saveCode}; return handleGenerateBill; }`)(scope);
    const Icon = () => null;
    const CartBottomSheet = new Function('scope', `with (scope) { ${sheetCode}; return CartBottomSheet; }`)({
      React,
      useState: (value: unknown) => [value, () => {}],
      useRef: (value: unknown) => ({ current: value }),
      useEffect: () => {},
      useHindi: () => ({ pName: (name: string) => name }),
      ShoppingCart: Icon, X: Icon, Package: Icon, CheckCircle: Icon,
    });
    function find(type: string, match: (props: any) => boolean): any {
      const tree = CartBottomSheet({
        ...scope, totalAmount: 20, handleGenerateBill, expanded: true,
        onCollapse: () => { collapsed = true; },
      });
      const visit = (node: any): any => {
        if (!node) return undefined;
        if (Array.isArray(node)) return node.map(visit).find(Boolean);
        if (node.type === type && match(node.props)) return node.props;
        return visit(node.props?.children);
      };
      const result = visit(tree);
      assert.ok(result, `Could not find ${type}`);
      return result;
    }
    return {
      scope,
      enter: (field: 'name' | 'phone', value: string) => {
        return find('input', props => field === 'name' ? props.type === 'text' : props.type === 'tel')
          .onChange({ target: { value } });
      },
      submit: () => find('button', props => String(props.children).includes('Generate Bill')).onClick(),
      finish: () => { assert.ok(resolveSave); resolveSave({ ok: !failure }); },
      fail: () => { failure = true; },
      get posts() { return posts; },
      get saved() { return saved; },
      get collapsed() { return collapsed; },
      get whatsapp() { return whatsapp; },
      get fieldOrder() {
        return React.Children.toArray(find('div', props => props.className === 'flex flex-col gap-2').children)
          .map((child: any) => child.props.type);
      },
    };
  }

  test(`${page}: name comes first and the tenth phone digit opens WhatsApp and saves the named bill`, async () => {
      const flow = setup();
      assert.deepEqual(flow.fieldOrder, ['text', 'tel']);
      flow.enter('name', '  Anita Sharma  ');
      flow.enter('phone', '987654321');
      assert.equal(flow.posts, 0, 'A partial number must not submit the bill');
      assert.equal(flow.whatsapp.length, 0);
      assert.equal(flow.scope.cart.length, 1);
      const saving = flow.enter('phone', '9876543210');
      assert.equal(flow.posts, 1);
      assert.equal(flow.whatsapp.length, 1, 'WhatsApp must open synchronously when the number is completed');
      assert.equal(flow.whatsapp[0].phone, '9876543210');
      assert.ok(flow.whatsapp[0].message.includes('Tea (1 pc)'));
      assert.ok(flow.whatsapp[0].message.includes('Total Amount: ₹20.00'));
      assert.equal(flow.saved.customerName, 'Anita Sharma');
      assert.equal(flow.saved.customerPhone, '9876543210');
      assert.equal(flow.scope.customerInfo.name, '  Anita Sharma  ', 'Keep details while saving');
      assert.equal(flow.scope.savingBill, true);
      flow.finish();
      await saving;
      assert.equal(flow.scope.savingBill, false);
      assert.equal(flow.scope.cart.length, 0);
      assert.equal(flow.collapsed, true);
      const markup = renderToStaticMarkup(React.createElement(BillingBillSection, {
        bills: [{ ...flow.saved, totalAmount: 20 }], kind: 'pending', limit: 5,
        expanded: false, loading: false, onToggle() {}, onSelect() {},
      }));
      assert.ok(markup.includes('title="Anita Sharma"'));
  });

  test(`${page}: name is optional and unnamed automatic bills display their time`, async () => {
    const flow = setup();
    const saving = flow.enter('phone', '9876543210');
    assert.equal(flow.saved.customerName, null);
    assert.equal(flow.whatsapp.length, 1);
    flow.finish();
    await saving;
    const markup = renderToStaticMarkup(React.createElement(BillingBillSection, {
      bills: [{ ...flow.saved, totalAmount: 20 }], kind: 'pending', limit: 5,
      expanded: false, loading: false, onToggle() {}, onSelect() {},
    }));
    assert.match(markup, /title="\d{1,2}:\d{2} [AP]M"/);
  });

  test(`${page}: Generate Bill still works with a name and no phone`, async () => {
    const flow = setup();
    flow.enter('name', 'Anita Sharma');
    const saving = flow.submit();
    assert.equal(flow.saved.customerName, 'Anita Sharma');
    assert.equal(flow.whatsapp.length, 0);
    flow.finish();
    await saving;
    assert.equal(flow.collapsed, true);
  });

  test(`${page}: phone events while saving do not open WhatsApp or save twice`, async () => {
    const flow = setup();
    flow.enter('name', 'Anita Sharma');
    const saving = flow.enter('phone', '9876543210');
    flow.enter('phone', '9876543210');
    assert.equal(flow.posts, 1);
    assert.equal(flow.whatsapp.length, 1);
    flow.finish();
    await saving;
  });

  test(`${page}: a failed save keeps the entered name and bill open`, async () => {
    const flow = setup();
    flow.enter('name', 'Anita Sharma');
    flow.fail();
    const saving = flow.enter('phone', '9876543210');
    flow.finish();
    await saving;
    assert.equal(flow.scope.customerInfo.name, 'Anita Sharma');
    assert.equal(flow.scope.cart.length, 1);
    assert.equal(flow.scope.savingBill, false);
    assert.equal(flow.collapsed, false);
  });
}
