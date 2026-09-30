import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import '@angular/compiler';
import * as core from '@angular/core';
import * as forms from '@angular/forms';
import * as common from '@angular/common';
import * as rxjs from 'rxjs';

const source = readFileSync(new URL('./billboards.component.ts', import.meta.url), 'utf8');
const modules = new Map<string, object>([
  ['@angular/core', core], ['@angular/forms', forms], ['@angular/common', common], ['rxjs', rxjs]
]);
const tokens: Record<string, any> = {};
for (const [path, name] of [
  ['../../core/domain/repositories/billboard.repository', 'BillboardRepository'],
  ['../../core/i18n/i18n.service', 'I18nService'],
  ['../../core/services/locale.service', 'LocaleService'],
  ['../../core/services/notification.service', 'NotificationService'],
  ['../../shared/pipes/translate.pipe', 'TranslatePipe'],
  ['../../core/services/permission.service', 'PermissionService']
]) {
  tokens[name] = class {};
  modules.set(path, { [name]: tokens[name] });
}
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true }
}).outputText;
const exports: any = {};
new Function('require', 'exports', output)((name: string) => {
  assert.ok(modules.has(name), name);
  return modules.get(name);
}, exports);

function fixture() {
  const writes: any[] = [];
  const errors: string[] = [];
  const repository = {
    create: (payload: any) => { writes.push(payload); return rxjs.of(payload); },
    update: (id: string, payload: any) => { writes.push({ id, ...payload }); return rxjs.of(payload); },
    listAdmin: () => rxjs.of([]),
    uploadImage: () => rxjs.of('/uploads/new.png')
  };
  const injector = core.createEnvironmentInjector([
    { provide: forms.FormBuilder, useValue: new forms.FormBuilder() },
    { provide: tokens.BillboardRepository, useValue: repository },
    { provide: tokens.I18nService, useValue: { t: (key: string) => key } },
    { provide: tokens.LocaleService, useValue: { locale: core.signal('ar'), isRtl: () => true } },
    { provide: tokens.PermissionService, useValue: { hasPermission: () => true } },
    { provide: tokens.NotificationService, useValue: {
      showError: (message: string) => errors.push(message), showSuccess: () => {}
    } }
  ], core.Injector.NULL as any);
  const component = core.runInInjectionContext(injector, () => new exports.BillboardsComponent());
  return { component, writes, errors, injector };
}

const item = {
  id: 'ad-1', title: '', subtitle: '', startDate: '2026-10-01', durationDays: 7,
  endDate: '2026-10-07', status: 'inactive', isActive: false, isExpired: false,
  imageUrl: '/uploads/existing.png', imageLabelAr: '', imageLabelEn: '',
  displayOrder: 3, percentage: null, fixedDiscount: null, linkUrl: null
};

test('blank text is accepted while date and duration remain required', () => {
  const { component, injector } = fixture();
  component.openModal();
  component.form.patchValue({ startDate: '2026-10-01' });
  assert.equal(component.form.valid, true);
  component.form.patchValue({ startDate: '' });
  assert.equal(component.form.valid, false);
  component.form.patchValue({ startDate: '2026-10-01', durationDays: null });
  assert.equal(component.form.valid, false);
  injector.destroy();
});

test('saving requires an image and editing preserves the existing image and activation', () => {
  const { component, writes, errors, injector } = fixture();
  component.openModal();
  component.form.patchValue({ startDate: '2026-10-01' });
  component.save();
  assert.equal(writes.length, 0);
  assert.ok(errors.includes('billboards.imageRequired'));
  component.editItem(item);
  component.save();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].imageUrl, item.imageUrl);
  assert.equal(writes[0].isActive, false);
  assert.equal(writes[0].title, '');
  assert.equal(writes[0].displayOrder, 3);
  injector.destroy();
});

test('activation persists the full existing ad without changing dates', () => {
  const { component, writes, injector } = fixture();
  component.toggleActive(item);
  assert.equal(writes[0].isActive, true);
  assert.equal(writes[0].startDate, item.startDate);
  assert.equal(writes[0].displayOrder, item.displayOrder);
  component.toggleActive({ ...item, isActive: true });
  assert.equal(writes[1].isActive, false);
  injector.destroy();
});

test('activating an expired ad opens editing instead of silently renewing dates', () => {
  const { component, writes, errors, injector } = fixture();
  component.toggleActive({ ...item, isExpired: true });
  assert.equal(writes.length, 0);
  assert.equal(component.modalOpen(), true);
  assert.equal(component.form.controls.isActive.value, true);
  assert.ok(errors.includes('billboards.activationNeedsDates'));
  injector.destroy();
});
