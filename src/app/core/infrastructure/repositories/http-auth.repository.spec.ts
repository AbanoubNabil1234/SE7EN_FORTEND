// @ts-nocheck
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { of } from 'rxjs';

const require = createRequire(import.meta.url);
function load(file, dependencies) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true
  }}).outputText;
  const exports = {};
  runInNewContext(output, { exports, require: (name) => dependencies[name] ?? require(name) });
  return exports;
}

function setup(role = 'CatalogEditor') {
  let cached = null;
  const dto = { id: '1', email: 'editor@example.test', firstName: 'Test', lastName: 'User',
    fullName: 'Test User', role, isActive: true, permissions: ['products.view'] };
  const storage = { getItem: () => cached, setItem: (_, user) => { cached = user; },
    removeItem: () => { cached = null; } };
  const http = { post: () => of({ user: dto, accessToken: 'token', refreshToken: 'refresh',
    refreshTokenExpiresAt: '2030-01-01' }), get: () => of(dto) };
  const { HttpAuthRepository } = load('./http-auth.repository.ts', {
    '@angular/core': { Injectable: () => (type) => type, inject: (type) => type === 'http' ? http : storage },
    '@angular/common/http': { HttpClient: 'http' },
    '../../domain/repositories/auth.repository': { AuthRepository: class {} },
    '../storage/local-storage.service': { LocalStorageService: 'storage' },
    '../http/api-endpoints.constants': { API_ENDPOINTS: {} }
  });
  return { auth: new HttpAuthRepository(), dto };
}

it('preserves custom roles and permissions through login and profile refresh', () => {
  const { auth } = setup();
  let user;
  auth.login({}).subscribe((value) => { user = value; });
  assert.equal(user.role, 'CatalogEditor');
  assert.deepEqual(user.permissions, ['products.view']);
  auth.refreshMe().subscribe((value) => { user = value; });
  assert.equal(user.role, 'CatalogEditor');
  assert.deepEqual(user.permissions, ['products.view']);
  assert.equal(user.refreshToken, 'refresh');
});

it('updates existing user subscriptions when login and logout change the session', () => {
  const { auth } = setup();
  let user;
  auth.getCurrentUser().subscribe((value) => { user = value; });
  assert.equal(user, null);
  auth.login({}).subscribe();
  assert.equal(user?.role, 'CatalogEditor');
  auth.logout().subscribe();
  assert.equal(user, null);
});

for (const [role, allowed] of [['CatalogEditor', true], ['Admin', true], ['Customer', false]]) {
  it(`login ${allowed ? 'accepts' : 'rejects'} ${role}`, () => {
    const { LoginComponent } = load('../../../features/auth/login/login.component.ts', {
      '@angular/core': { Component: () => (type) => type },
      '@angular/common': {}, '@angular/forms': {}, '@angular/router': {},
      '../../../core/domain/pharmacy-brands': { PHARMACY_BRANDS: [] },
      ...Object.fromEntries([
        '../../../core/use-cases/auth/login.use-case', '../../../core/services/notification.service',
        '../../../core/services/locale.service', '../../../core/i18n/i18n.service',
        '../../../shared/pipes/translate.pipe', '../../../core/domain/repositories/auth.repository',
        '../../../core/domain/repositories/dashboard.repository', '../../../core/domain/repositories/catalog-browse.repository'
      ].map((key) => [key, {}]))
    });
    const component = Object.create(LoginComponent.prototype);
    let destination = null;
    let loggedOut = false;
    Object.assign(component, {
      form: { invalid: false, getRawValue: () => ({}) },
      submitting: Object.assign(() => false, { set: () => {} }), error: { set: () => {} },
      loginUseCase: { execute: () => of({ role, permissions: ['products.view'] }) },
      auth: { logout: () => { loggedOut = true; return of(null); } },
      i18n: { t: (key) => key }, notifications: { showSuccess: () => {} },
      router: { navigateByUrl: (url) => { destination = url; } },
      dashboard: { getSnapshot: () => of(null) }, catalog: { listFamilies: () => of(null) }
    });
    component.onSubmit();
    assert.equal(destination !== null, allowed);
    assert.equal(loggedOut, !allowed);
  });
}
