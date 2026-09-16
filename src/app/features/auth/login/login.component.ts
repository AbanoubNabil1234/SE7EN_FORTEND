import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { LoginUseCase } from '../../../core/use-cases/auth/login.use-case';
import { NotificationService } from '../../../core/services/notification.service';
import { LocaleService } from '../../../core/services/locale.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { AuthRepository } from '../../../core/domain/repositories/auth.repository';
import { DashboardRepository } from '../../../core/domain/repositories/dashboard.repository';
import { CatalogBrowseRepository } from '../../../core/domain/repositories/catalog-browse.repository';

interface PharmacySource {
  code: string;
  nameEn: string;
  nameAr: string;
  logo: string;
  angle: number;
}

type AuthView = 'login' | 'forgot' | 'verify' | 'reset';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipe],
  template: `
    <div
      class="login-shell"
      [class.is-ar]="localeService.isRtl()"
      [class.is-en]="!localeService.isRtl()"
    >
      <aside class="stage" [attr.dir]="localeService.isRtl() ? 'rtl' : 'ltr'">
        <div class="stage-grid"></div>
        <div class="stage-aurora stage-aurora--a"></div>
        <div class="stage-aurora stage-aurora--b"></div>
        <div class="stage-vignette"></div>

        <header class="stage-top">
          <div class="brand-lockup">
            <img src="assets/logo.png" alt="se7en" class="brand-lockup__mark" />
            <div>
              <div class="brand-lockup__word">se<span>7</span>en</div>
              <div class="brand-lockup__tag">{{ 'login.brandTag' | t }}</div>
            </div>
          </div>
          <div class="stage-top__actions">
            <div class="live-pill">
              <span class="live-pill__dot"></span>
              {{ 'login.livePill' | t }}
            </div>
          </div>
        </header>

        <div class="stage-hero">
          <p class="eyebrow">{{ 'login.eyebrow' | t }}</p>
          <h1>
            {{ 'login.titleLine1' | t }}<br />
            <em>{{ 'login.titleLine2' | t }}</em>
          </h1>
          <p class="lede">{{ 'login.lede' | t }}</p>

          <div class="orbit" [attr.aria-label]="'login.orbitLabel' | t">
            <svg class="orbit__wires" viewBox="0 0 420 420" aria-hidden="true">
              <defs>
                <linearGradient id="wireGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#e5be96" stop-opacity="0.2" />
                  <stop offset="50%" stop-color="#c27938" stop-opacity="0.9" />
                  <stop offset="100%" stop-color="#e5be96" stop-opacity="0.2" />
                </linearGradient>
                <filter id="glowSoft">
                  <feGaussianBlur stdDeviation="2.2" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <circle cx="210" cy="210" [attr.r]="orbitRadius" class="orbit__ring orbit__ring--outer" />
              <circle cx="210" cy="210" [attr.r]="orbitRadius * 0.65" class="orbit__ring orbit__ring--inner" />

              @for (p of pharmacies; track p.code) {
                <line
                  x1="210"
                  y1="210"
                  [attr.x2]="hubX(p.angle)"
                  [attr.y2]="hubY(p.angle)"
                  class="orbit__spoke"
                  filter="url(#glowSoft)"
                />
              }

              @for (p of pharmacies; track p.code; let i = $index) {
                <line
                  [attr.x1]="hubX(p.angle)"
                  [attr.y1]="hubY(p.angle)"
                  [attr.x2]="hubX(pharmacies[(i + 1) % pharmacies.length].angle)"
                  [attr.y2]="hubY(pharmacies[(i + 1) % pharmacies.length].angle)"
                  class="orbit__chord"
                />
              }

              <circle cx="210" cy="210" [attr.r]="orbitRadius" class="orbit__pulse" />
            </svg>

            <div class="orbit__hub">
              <img src="assets/logo.png" alt="se7en" />
              <span>se7en</span>
            </div>

            @for (p of pharmacies; track p.code; let i = $index) {
              <div
                class="orbit__node"
                [style.--angle]="p.angle + 'deg'"
                [style.--radius.px]="orbitRadius"
                [style.animation-delay]="(i * 90) + 'ms'"
                [title]="pharmacyName(p)"
              >
                <div class="orbit__disk">
                  <img [src]="p.logo" [alt]="pharmacyName(p)" />
                </div>
                <span>{{ pharmacyName(p) }}</span>
              </div>
            }
          </div>
        </div>

        <footer class="stage-foot">
          <span>© {{ year }} se7en</span>
          <span class="stage-foot__sep"></span>
          <span>{{ 'login.footMesh' | t }}</span>
        </footer>
      </aside>

      <main class="auth" [attr.dir]="localeService.isRtl() ? 'rtl' : 'ltr'">
        <div class="auth__glow"></div>

        <div class="lang-switch" role="group" [attr.aria-label]="'common.language' | t">
          <button
            type="button"
            class="lang-switch__btn"
            [class.is-active]="localeService.locale() === 'ar'"
            (click)="localeService.setLocale('ar')"
          >
            عربي
          </button>
          <button
            type="button"
            class="lang-switch__btn"
            [class.is-active]="localeService.locale() === 'en'"
            (click)="localeService.setLocale('en')"
          >
            EN
          </button>
        </div>

        <div class="auth__mobile-brand lg-hidden">
          <img src="assets/logo.png" alt="se7en" />
          <div>
            <strong>se<span>7</span>en</strong>
            <small>{{ 'login.brandTag' | t }}</small>
          </div>
        </div>

        <section class="auth__panel">
          @switch (view()) {
            @case ('login') {
              <div class="auth__intro">
                <h2>{{ 'login.welcome' | t }}</h2>
                <p>{{ 'login.welcomeHint' | t }}</p>
              </div>

              <form class="auth__form" [formGroup]="form" (ngSubmit)="onSubmit()">
                <label class="field">
                  <span>{{ 'login.email' | t }}</span>
                  <input
                    type="email"
                    autocomplete="username"
                    formControlName="email"
                    [placeholder]="'login.emailPlaceholder' | t"
                  />
                </label>

                <label class="field">
                  <span>{{ 'login.password' | t }}</span>
                  <div class="field__password">
                    <input
                      [type]="showPassword() ? 'text' : 'password'"
                      autocomplete="current-password"
                      formControlName="password"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      class="field__toggle field__toggle--icon"
                      (click)="showPassword.set(!showPassword())"
                      [attr.aria-label]="(showPassword() ? 'login.hidePassword' : 'login.showPassword') | t"
                    >
                      <i class="pi" [class.pi-eye]="!showPassword()" [class.pi-eye-slash]="showPassword()"></i>
                    </button>
                  </div>
                </label>

                <div class="auth__row">
                  <button type="button" class="auth__link-btn" (click)="openForgot()">
                    {{ 'login.forgotLink' | t }}
                  </button>
                </div>

                @if (error()) {
                  <div class="auth__error">{{ error() }}</div>
                }

                <button
                  type="submit"
                  class="auth__submit"
                  [class.is-rtl]="localeService.isRtl()"
                  [disabled]="form.invalid || submitting()"
                >
                  @if (submitting()) {
                    <span class="auth__spinner"></span>
                  }
                  {{ 'login.submit' | t }}
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </form>
            }

            @case ('forgot') {
              <div class="auth__intro">
                <h2>{{ 'login.forgotTitle' | t }}</h2>
                <p>{{ 'login.forgotHint' | t }}</p>
              </div>

              <form class="auth__form" [formGroup]="forgotForm" (ngSubmit)="onForgotSubmit()">
                <label class="field">
                  <span>{{ 'login.email' | t }}</span>
                  <input
                    type="email"
                    autocomplete="email"
                    formControlName="email"
                    [placeholder]="'login.emailPlaceholder' | t"
                  />
                </label>

                @if (error()) {
                  <div class="auth__error">{{ error() }}</div>
                }

                <button
                  type="submit"
                  class="auth__submit"
                  [disabled]="forgotForm.invalid || submitting()"
                >
                  @if (submitting()) {
                    <span class="auth__spinner"></span>
                  }
                  {{ 'login.forgotSubmit' | t }}
                </button>

                <button type="button" class="auth__ghost" (click)="backToLogin()">
                  {{ 'login.backToLogin' | t }}
                </button>
              </form>
            }

            @case ('verify') {
              <div class="auth__intro">
                <h2>{{ 'login.verifyTitle' | t }}</h2>
                <p>{{ 'login.verifyHint' | t }}</p>
              </div>

              <form class="auth__form" [formGroup]="verifyForm" (ngSubmit)="onVerifySubmit()">
                <label class="field">
                  <span>{{ 'login.verifyCode' | t }}</span>
                  <input
                    type="text"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    maxlength="6"
                    formControlName="code"
                    class="field__otp"
                    placeholder="••••••"
                  />
                </label>

                @if (error()) {
                  <div class="auth__error">{{ error() }}</div>
                }

                <button
                  type="submit"
                  class="auth__submit"
                  [disabled]="verifyForm.invalid || submitting()"
                >
                  @if (submitting()) {
                    <span class="auth__spinner"></span>
                  }
                  {{ 'login.verifySubmit' | t }}
                </button>

                <div class="auth__row auth__row--between">
                  <button type="button" class="auth__link-btn" (click)="resendCode()" [disabled]="submitting()">
                    {{ 'login.resendCode' | t }}
                  </button>
                  <button type="button" class="auth__ghost auth__ghost--inline" (click)="backToLogin()">
                    {{ 'login.backToLogin' | t }}
                  </button>
                </div>
              </form>
            }

            @case ('reset') {
              <div class="auth__intro">
                <h2>{{ 'login.resetTitle' | t }}</h2>
                <p>{{ 'login.resetHint' | t }}</p>
              </div>

              <form class="auth__form" [formGroup]="resetForm" (ngSubmit)="onResetSubmit()">
                <label class="field">
                  <span>{{ 'login.newPassword' | t }}</span>
                  <div class="field__password">
                    <input
                      [type]="showPassword() ? 'text' : 'password'"
                      autocomplete="new-password"
                      formControlName="password"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      class="field__toggle field__toggle--icon"
                      (click)="showPassword.set(!showPassword())"
                      [attr.aria-label]="(showPassword() ? 'login.hidePassword' : 'login.showPassword') | t"
                    >
                      <i class="pi" [class.pi-eye]="!showPassword()" [class.pi-eye-slash]="showPassword()"></i>
                    </button>
                  </div>
                </label>

                <label class="field">
                  <span>{{ 'login.confirmPassword' | t }}</span>
                  <div class="field__password">
                    <input
                      [type]="showConfirmPassword() ? 'text' : 'password'"
                      autocomplete="new-password"
                      formControlName="confirmPassword"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      class="field__toggle field__toggle--icon"
                      (click)="showConfirmPassword.set(!showConfirmPassword())"
                      [attr.aria-label]="(showConfirmPassword() ? 'login.hidePassword' : 'login.showPassword') | t"
                    >
                      <i class="pi" [class.pi-eye]="!showConfirmPassword()" [class.pi-eye-slash]="showConfirmPassword()"></i>
                    </button>
                  </div>
                </label>

                @if (error()) {
                  <div class="auth__error">{{ error() }}</div>
                }

                <button
                  type="submit"
                  class="auth__submit"
                  [disabled]="resetForm.invalid || submitting()"
                >
                  @if (submitting()) {
                    <span class="auth__spinner"></span>
                  }
                  {{ 'login.resetSubmit' | t }}
                </button>
              </form>
            }
          }

          <div class="auth__sources lg-hidden">
            <div class="auth__sources-label">{{ 'login.sources' | t }}</div>
            <div class="auth__chain">
              @for (p of pharmacies; track p.code; let last = $last) {
                <div class="auth__chip" [title]="pharmacyName(p)">
                  <div class="orbit__disk orbit__disk--sm">
                    <img [src]="p.logo" [alt]="pharmacyName(p)" />
                  </div>
                </div>
                @if (!last) {
                  <div class="auth__link"></div>
                }
              }
            </div>
          </div>
        </section>
      </main>
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      min-width: 0;
      height: 100vh;
      height: 100dvh;
      overflow: hidden;
    }

    .login-shell {
      width: 100%;
      min-width: 0;
      height: 100%;
      max-height: 100dvh;
      overflow: hidden;
      display: grid;
      grid-template-columns: minmax(320px, 0.86fr) minmax(0, 1.14fr);
      grid-template-areas: "auth stage";
      direction: ltr;
      background: #faf7f2;
      color: #181a1d;
      font-family: 'Plus Jakarta Sans', 'Cairo', system-ui, sans-serif;
    }

    /* Arabic: form on the right, brand stage on the left */
    .login-shell.is-ar {
      grid-template-columns: minmax(0, 1.14fr) minmax(320px, 0.86fr);
      grid-template-areas: "stage auth";
    }

    .login-shell.is-en {
      grid-template-columns: minmax(320px, 0.86fr) minmax(0, 1.14fr);
      grid-template-areas: "auth stage";
    }

    .auth { grid-area: auth; }
    .stage { grid-area: stage; }

    .auth[dir='rtl'],
    .stage[dir='rtl'] {
      font-family: 'Cairo', 'Plus Jakarta Sans', system-ui, sans-serif;
    }

    .stage {
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 0.5rem;
      min-height: 0;
      height: 100%;
      padding: clamp(0.85rem, 1.6vh, 1.5rem) clamp(1rem, 2.2vw, 2rem);
      background:
        radial-gradient(1200px 700px at 12% -8%, rgba(255, 255, 255, 0.95), transparent 55%),
        radial-gradient(900px 600px at 88% 108%, rgba(212, 146, 77, 0.22), transparent 52%),
        linear-gradient(155deg, #fffdfb 0%, #f8eee2 42%, #f0d9c1 100%);
    }

    .stage-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(162, 93, 42, 0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(162, 93, 42, 0.06) 1px, transparent 1px);
      background-size: 48px 48px;
      mask-image: radial-gradient(ellipse at 50% 40%, black 20%, transparent 75%);
      pointer-events: none;
    }

    .stage-aurora {
      position: absolute;
      border-radius: 9999px;
      filter: blur(60px);
      pointer-events: none;
      animation: drift 14s ease-in-out infinite alternate;
    }
    .stage-aurora--a {
      width: 28rem;
      height: 28rem;
      top: -6rem;
      inset-inline-start: -4rem;
      background: rgba(255, 255, 255, 0.7);
    }
    .stage-aurora--b {
      width: 22rem;
      height: 22rem;
      inset-inline-end: -5rem;
      bottom: 10%;
      background: rgba(212, 146, 77, 0.28);
      animation-delay: -4s;
    }
    .stage-vignette {
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse at center, transparent 45%, rgba(240, 217, 193, 0.35) 100%);
      pointer-events: none;
    }

    .stage-top, .stage-hero, .stage-foot {
      position: relative;
      z-index: 2;
    }

    .stage-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      animation: fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .stage-top__actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .brand-lockup {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }
    .brand-lockup__mark {
      width: 2.6rem;
      height: 2.6rem;
      border-radius: 0.85rem;
      object-fit: cover;
      box-shadow: 0 12px 30px -10px rgba(212, 146, 77, 0.55);
      flex-shrink: 0;
    }
    .brand-lockup__word {
      font-family: 'Outfit', 'Cairo', sans-serif;
      font-weight: 800;
      font-size: 1.25rem;
      letter-spacing: -0.03em;
      line-height: 1;
      color: #181a1d;
    }
    .brand-lockup__word span { color: #c27938; }
    .brand-lockup__tag {
      margin-top: 0.28rem;
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #824926;
      white-space: nowrap;
    }

    .live-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.4rem 0.75rem;
      border-radius: 9999px;
      border: 1px solid rgba(194, 121, 56, 0.28);
      background: rgba(255, 255, 255, 0.72);
      color: #693c22;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      box-shadow: 0 8px 20px -14px rgba(105, 60, 34, 0.35);
      white-space: nowrap;
    }
    .live-pill__dot {
      width: 0.42rem;
      height: 0.42rem;
      border-radius: 9999px;
      background: #d4924d;
      animation: ping 1.8s ease-out infinite;
      flex-shrink: 0;
    }

    .stage-hero {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      max-width: 40rem;
      width: 100%;
      margin: 0 auto;
      text-align: center;
      animation: fadeUp 0.9s 0.08s cubic-bezier(0.16, 1, 0.3, 1) both;
      min-height: 0;
    }
    .eyebrow {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #c27938;
      margin: 0 0 0.4rem;
    }
    .stage-hero h1 {
      font-family: 'Outfit', 'Cairo', sans-serif;
      font-weight: 800;
      font-size: clamp(1.55rem, 2.4vw, 2.35rem);
      line-height: 1.12;
      letter-spacing: -0.03em;
      color: #181a1d;
      margin: 0;
    }
    .stage-hero h1 em {
      font-style: normal;
      background: linear-gradient(105deg, #a15d2a 0%, #d4924d 55%, #c27938 100%);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .lede {
      margin: 0.5rem auto 0;
      max-width: 26rem;
      font-size: clamp(0.8rem, 1.1vw, 0.9rem);
      line-height: 1.5;
      color: #4e5a6d;
      padding-inline: 0.5rem;
    }

    .orbit {
      --orbit-size: min(100%, 300px, 38vh);
      position: relative;
      width: var(--orbit-size);
      aspect-ratio: 1;
      margin: clamp(0.55rem, 1.2vh, 0.9rem) auto 0.35rem;
      flex-shrink: 0;
      animation: fadeUp 1s 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .orbit__wires {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .orbit__ring {
      fill: none;
      stroke: rgba(194, 121, 56, 0.28);
      stroke-width: 1.2;
    }
    .orbit__ring--inner {
      stroke-dasharray: 3 7;
      stroke: rgba(162, 93, 42, 0.2);
    }
    .orbit__spoke {
      stroke: url(#wireGrad);
      stroke-width: 1.5;
      stroke-linecap: round;
      opacity: 0.85;
    }
    .orbit__chord {
      stroke: rgba(194, 121, 56, 0.32);
      stroke-width: 1;
      stroke-dasharray: 4 6;
    }
    .orbit__pulse {
      fill: none;
      stroke: rgba(194, 121, 56, 0.55);
      stroke-width: 1.5;
      stroke-dasharray: 18 420;
      animation: sweep 4.5s linear infinite;
      filter: url(#glowSoft);
    }

    .orbit__hub {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: clamp(3.6rem, 17%, 4.6rem);
      height: clamp(3.6rem, 17%, 4.6rem);
      border-radius: 9999px;
      background: linear-gradient(145deg, #ffffff, #f8eee2);
      border: 3px solid rgba(255, 255, 255, 0.95);
      box-shadow:
        0 0 0 8px rgba(212, 146, 77, 0.12),
        0 0 36px rgba(212, 146, 77, 0.28),
        0 18px 40px -18px rgba(105, 60, 34, 0.4);
      display: grid;
      place-items: center;
      z-index: 3;
      animation: hubPulse 3.2s ease-in-out infinite;
    }
    .orbit__hub img {
      width: 72%;
      height: 72%;
      object-fit: cover;
      border-radius: 9999px;
    }
    .orbit__hub span {
      position: absolute;
      bottom: -1.35rem;
      font-size: 0.62rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #824926;
    }

    .orbit__node {
      position: absolute;
      left: 50%;
      top: 50%;
      width: 4.4rem;
      transform:
        translate(-50%, -50%)
        rotate(var(--angle))
        translateY(calc(var(--radius) * -1))
        rotate(calc(var(--angle) * -1));
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3rem;
      z-index: 2;
      animation: nodeIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .orbit__disk {
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 9999px;
      background: #fff;
      border: 2px solid rgba(212, 146, 77, 0.45);
      box-shadow:
        0 0 0 4px rgba(255, 255, 255, 0.75),
        0 12px 28px -12px rgba(105, 60, 34, 0.35),
        0 0 18px rgba(212, 146, 77, 0.18);
      display: grid;
      place-items: center;
      overflow: hidden;
      padding: 0.35rem;
      transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
    }
    .orbit__disk--sm {
      width: 2.2rem;
      height: 2.2rem;
      padding: 0.25rem;
      border-width: 1.5px;
    }
    .orbit__disk img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 9999px;
    }
    .orbit__node:hover .orbit__disk {
      transform: scale(1.08);
      border-color: #d4924d;
    }
    .orbit__node > span {
      font-size: 0.6rem;
      font-weight: 700;
      letter-spacing: 0.01em;
      color: #693c22;
      white-space: nowrap;
      max-width: 5.2rem;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .stage-foot {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0.55rem;
      font-size: 0.7rem;
      color: #8593a6;
      font-weight: 600;
      animation: fadeUp 1s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .stage-foot__sep {
      width: 0.28rem;
      height: 0.28rem;
      border-radius: 9999px;
      background: rgba(212, 146, 77, 0.65);
    }

    .auth {
      position: relative;
      display: grid;
      place-items: center;
      padding: clamp(1rem, 2vh, 1.75rem) clamp(1.1rem, 2.5vw, 2rem);
      min-height: 0;
      height: 100%;
      overflow: hidden;
      background: linear-gradient(165deg, #ffffff 0%, #faf7f2 48%, #f3eee6 100%);
      color: #181a1d;
      border-inline-end: 1px solid rgba(194, 121, 56, 0.12);
    }

    .login-shell.is-ar .auth {
      border-inline-end: 0;
      border-inline-start: 1px solid rgba(194, 121, 56, 0.12);
    }
    .auth__glow {
      position: absolute;
      width: 28rem;
      height: 28rem;
      inset-inline-end: -8rem;
      top: -6rem;
      border-radius: 9999px;
      background: rgba(212, 146, 77, 0.18);
      filter: blur(50px);
      pointer-events: none;
    }

    .lang-switch {
      position: absolute;
      top: 1.25rem;
      inset-inline-end: 1.25rem;
      z-index: 5;
      display: inline-flex;
      padding: 0.2rem;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(194, 121, 56, 0.22);
      box-shadow: 0 10px 24px -16px rgba(105, 60, 34, 0.35);
    }
    .lang-switch__btn {
      border: 0;
      background: transparent;
      color: #824926;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 0.45rem 0.8rem;
      border-radius: 9999px;
      cursor: pointer;
      min-width: 3.1rem;
      transition: background 0.2s, color 0.2s;
      font-family: inherit;
    }
    .lang-switch__btn.is-active {
      background: #181a1d;
      color: #f8eee2;
    }

    .auth__panel {
      position: relative;
      width: 100%;
      max-width: 400px;
      animation: fadeUp 0.85s 0.12s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .auth__mobile-brand {
      display: none;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.75rem;
      width: 100%;
      max-width: 400px;
    }
    .auth__mobile-brand img {
      width: 2.6rem;
      height: 2.6rem;
      border-radius: 0.85rem;
      object-fit: cover;
      box-shadow: 0 10px 24px -10px rgba(194, 121, 56, 0.55);
    }
    .auth__mobile-brand strong {
      display: block;
      font-family: 'Outfit', 'Cairo', sans-serif;
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    .auth__mobile-brand strong span { color: #c27938; }
    .auth__mobile-brand small {
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #824926;
    }

    .auth__intro h2 {
      font-family: 'Outfit', 'Cairo', sans-serif;
      font-size: clamp(1.55rem, 2.4vw, 2rem);
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.15;
      margin: 0;
      color: #0f1113;
    }
    .auth__intro p {
      margin: 0.4rem 0 0;
      color: #4e5a6d;
      font-size: 0.88rem;
      line-height: 1.5;
    }

    .auth__form {
      margin-top: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .field > span {
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #693c22;
    }
    .field input {
      width: 100%;
      border: 1px solid rgba(194, 121, 56, 0.28);
      background: rgba(255, 253, 249, 0.92);
      border-radius: 0.95rem;
      padding: 0.9rem 1rem;
      font-size: 0.95rem;
      color: #181a1d;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
      font-family: inherit;
    }
    .field input:focus {
      border-color: #d4924d;
      background: #fff;
      box-shadow: 0 0 0 4px rgba(212, 146, 77, 0.16);
    }
    .field__password { position: relative; }
    .field__password input { padding-inline-end: 2.75rem; }
    .field__toggle {
      position: absolute;
      inset-inline-end: 0.55rem;
      top: 50%;
      transform: translateY(-50%);
      border: 0;
      background: transparent;
      color: #824926;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      padding: 0.35rem;
      font-family: inherit;
      display: grid;
      place-items: center;
      border-radius: 0.55rem;
    }
    .field__toggle--icon {
      width: 2rem;
      height: 2rem;
      color: #693c22;
    }
    .field__toggle--icon:hover {
      background: rgba(212, 146, 77, 0.12);
    }
    .field__toggle--icon .pi {
      font-size: 1rem;
      line-height: 1;
    }
    .field__otp {
      letter-spacing: 0.45em;
      text-align: center;
      font-weight: 800;
      font-size: 1.2rem !important;
    }

    .auth__row {
      display: flex;
      justify-content: flex-end;
      margin-top: -0.25rem;
    }
    .auth__row--between {
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.15rem;
    }
    .auth__link-btn {
      border: 0;
      background: transparent;
      color: #a15d2a;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      padding: 0;
      font-family: inherit;
    }
    .auth__link-btn:hover { color: #693c22; text-decoration: underline; }
    .auth__link-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .auth__ghost {
      margin-top: 0.15rem;
      width: 100%;
      border: 1px solid rgba(194, 121, 56, 0.25);
      background: transparent;
      color: #693c22;
      border-radius: 0.95rem;
      padding: 0.8rem 1rem;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
    }
    .auth__ghost--inline {
      width: auto;
      padding: 0.35rem 0.55rem;
      border: 0;
      margin: 0;
    }

    .auth__error {
      border-radius: 0.85rem;
      border: 1px solid #fecdd3;
      background: #fff1f2;
      color: #9f1239;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.7rem 0.85rem;
    }

    .auth__submit {
      margin-top: 0.25rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.55rem;
      width: 100%;
      border: 0;
      border-radius: 0.95rem;
      padding: 0.95rem 1.15rem;
      background: linear-gradient(135deg, #181a1d 0%, #262a32 100%);
      color: #f8eee2;
      font-size: 0.95rem;
      font-weight: 800;
      cursor: pointer;
      font-family: inherit;
      box-shadow:
        0 16px 40px -18px rgba(24, 26, 29, 0.75),
        0 0 0 1px rgba(212, 146, 77, 0.25) inset;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .auth__submit svg {
      width: 1.05rem;
      height: 1.05rem;
      transition: transform 0.2s ease;
    }
    .auth__submit.is-rtl svg {
      transform: scaleX(-1);
    }
    .auth__submit:hover:not(:disabled) {
      transform: translateY(-1px);
    }
    .auth__submit:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .auth__spinner {
      width: 1rem;
      height: 1rem;
      border-radius: 9999px;
      border: 2px solid rgba(248, 238, 226, 0.25);
      border-top-color: #d4924d;
      animation: spin 0.7s linear infinite;
    }

    .auth__sources {
      display: none;
      margin-top: 1.75rem;
      padding-top: 1.25rem;
      border-top: 1px solid rgba(194, 121, 56, 0.18);
      width: 100%;
    }
    .auth__sources-label {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #824926;
      margin-bottom: 0.85rem;
    }
    .auth__chain {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.15rem;
    }
    .auth__link {
      flex: 1;
      height: 2px;
      min-width: 0.35rem;
      background: repeating-linear-gradient(90deg, #c27938 0 4px, transparent 4px 8px);
      opacity: 0.45;
    }

    .lg-hidden { display: none; }

    @keyframes drift {
      from { transform: translate(0, 0) scale(1); }
      to { transform: translate(24px, 18px) scale(1.08); }
    }
    @keyframes ping {
      0% { box-shadow: 0 0 0 0 rgba(212, 146, 77, 0.65); }
      70% { box-shadow: 0 0 0 10px rgba(212, 146, 77, 0); }
      100% { box-shadow: 0 0 0 0 rgba(212, 146, 77, 0); }
    }
    @keyframes sweep { to { stroke-dashoffset: -438; } }
    @keyframes hubPulse {
      0%, 100% { box-shadow: 0 0 0 8px rgba(212, 146, 77, 0.12), 0 0 36px rgba(212, 146, 77, 0.25), 0 18px 40px -18px rgba(105, 60, 34, 0.35); }
      50% { box-shadow: 0 0 0 12px rgba(212, 146, 77, 0.18), 0 0 48px rgba(212, 146, 77, 0.38), 0 18px 40px -18px rgba(105, 60, 34, 0.4); }
    }
    @keyframes nodeIn {
      from { opacity: 0; filter: blur(4px); }
      to { opacity: 1; filter: blur(0); }
    }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 1100px) {
      .login-shell {
        grid-template-columns: 1fr;
        grid-template-areas: "auth";
        height: 100dvh;
        overflow: auto;
      }
      .login-shell.is-ar,
      .login-shell.is-en {
        grid-template-columns: 1fr;
        grid-template-areas: "auth";
      }
      .stage { display: none; }
      .auth {
        min-height: 100%;
        border-inline-end: 0;
        overflow: auto;
      }
      .lg-hidden { display: flex; }
      .auth__sources { display: block; }
      .auth__mobile-brand { display: flex; }
      .lang-switch { top: 1rem; inset-inline-end: 1rem; }
    }

    @media (min-width: 1280px) {
      .orbit { --orbit-size: min(100%, 340px, 42vh); }
    }

    @media (max-height: 780px) and (min-width: 1024px) {
      .stage-hero h1 { font-size: clamp(1.35rem, 2vw, 1.85rem); }
      .orbit { --orbit-size: min(100%, 260px, 34vh); }
      .lede { display: none; }
      .orbit__hub span { display: none; }
      .orbit__node > span { display: none; }
    }
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly loginUseCase = inject(LoginUseCase);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  readonly localeService = inject(LocaleService);
  private readonly i18n = inject(I18nService);
  private readonly auth = inject(AuthRepository);
  private readonly dashboard = inject(DashboardRepository);
  private readonly catalog = inject(CatalogBrowseRepository);

  /** Accepts normal emails and seed hosts like admin@se7en.local */
  private static emailAddress(control: AbstractControl): ValidationErrors | null {
    const value = String(control.value ?? '').trim();
    if (!value) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : { email: true };
  }

  readonly year = new Date().getFullYear();
  readonly submitting = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly error = signal<string | null>(null);
  readonly view = signal<AuthView>('login');
  readonly recoveryEmail = signal('');
  readonly recoveryCode = signal('');
  readonly orbitRadius = 128;

  readonly pharmacies: PharmacySource[] = [
    { code: 'nahdi', nameEn: 'Nahdi', nameAr: 'النهدي', logo: 'assets/pharmacies/nahdi.svg', angle: 0 },
    { code: 'aldawaa', nameEn: 'Al-Dawaa', nameAr: 'الدواء', logo: 'assets/pharmacies/aldawaa.png', angle: 360 / 7 },
    { code: 'whites', nameEn: 'Whites', nameAr: 'وايتس', logo: 'assets/pharmacies/whites.png', angle: (360 / 7) * 2 },
    { code: 'united', nameEn: 'United', nameAr: 'يونايتد', logo: 'assets/pharmacies/united.png', angle: (360 / 7) * 3 },
    { code: 'lemon', nameEn: 'Lemon', nameAr: 'ليمون', logo: 'assets/pharmacies/lemon.png', angle: (360 / 7) * 4 },
    { code: 'ibrand', nameEn: 'iBrand', nameAr: 'آي براند', logo: 'assets/pharmacies/ibrand.png', angle: (360 / 7) * 5 },
    { code: 'pharmabrand', nameEn: 'Pharma Brand', nameAr: 'فارما براند', logo: 'assets/pharmacies/pharmabrand.png', angle: (360 / 7) * 6 }
  ];

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, LoginComponent.emailAddress]],
    password: ['', [Validators.required, Validators.minLength(4)]]
  });

  readonly forgotForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, LoginComponent.emailAddress]]
  });

  readonly verifyForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
  });

  readonly resetForm = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  pharmacyName(p: PharmacySource): string {
    return this.localeService.locale() === 'ar' ? p.nameAr : p.nameEn;
  }

  hubX(angleDeg: number): number {
    return 210 + this.orbitRadius * Math.sin((angleDeg * Math.PI) / 180);
  }

  hubY(angleDeg: number): number {
    return 210 - this.orbitRadius * Math.cos((angleDeg * Math.PI) / 180);
  }

  openForgot(): void {
    this.error.set(null);
    const email = this.form.controls.email.value;
    if (email) {
      this.forgotForm.controls.email.setValue(email);
    }
    this.view.set('forgot');
  }

  backToLogin(): void {
    this.error.set(null);
    this.verifyForm.reset();
    this.resetForm.reset();
    this.showPassword.set(false);
    this.showConfirmPassword.set(false);
    this.view.set('login');
  }

  onForgotSubmit(): void {
    if (this.forgotForm.invalid || this.submitting()) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    const email = this.forgotForm.controls.email.value;
    this.recoveryEmail.set(email);

    this.auth
      .forgotPassword({ email })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.notifications.showSuccess(this.i18n.t('login.codeSent'), this.i18n.t('login.forgotTitle'));
          this.verifyForm.reset();
          this.view.set('verify');
        },
        error: () => this.error.set(this.i18n.t('login.loginError'))
      });
  }

  resendCode(): void {
    if (this.submitting()) {
      return;
    }
    this.submitting.set(true);
    this.auth
      .forgotPassword({ email: this.recoveryEmail() })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () =>
          this.notifications.showSuccess(this.i18n.t('login.codeSent'), this.i18n.t('login.verifyTitle')),
        error: () => this.error.set(this.i18n.t('login.loginError'))
      });
  }

  onVerifySubmit(): void {
    if (this.verifyForm.invalid || this.submitting()) {
      this.verifyForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    const code = this.verifyForm.controls.code.value.trim();

    this.auth
      .verifyResetCode({ email: this.recoveryEmail(), code })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.recoveryCode.set(code);
          this.resetForm.reset();
          this.showPassword.set(false);
          this.showConfirmPassword.set(false);
          this.view.set('reset');
        },
        error: () => this.error.set(this.i18n.t('login.codeInvalid'))
      });
  }

  onResetSubmit(): void {
    if (this.resetForm.invalid || this.submitting()) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const { password, confirmPassword } = this.resetForm.getRawValue();
    if (password !== confirmPassword) {
      this.error.set(this.i18n.t('login.passwordMismatch'));
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.auth
      .resetPassword({
        email: this.recoveryEmail(),
        code: this.recoveryCode(),
        newPassword: password
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.notifications.showSuccess(this.i18n.t('login.resetDone'), this.i18n.t('login.resetTitle'));
          this.form.controls.email.setValue(this.recoveryEmail());
          this.form.controls.password.setValue('');
          this.backToLogin();
        },
        error: () => this.error.set(this.i18n.t('login.loginError'))
      });
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.loginUseCase
      .execute(this.form.getRawValue())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (user) => {
          if (user.role !== 'Admin') {
            this.auth.logout().subscribe();
            this.error.set(this.i18n.t('login.adminOnlyError'));
            return;
          }
          this.notifications.showSuccess(this.i18n.t('login.signedInMsg'), this.i18n.t('login.signedInTitle'));
          this.prefetchAdminHome();
          void this.router.navigateByUrl('/dashboard');
        },
        error: (err) => {
          const apiMessage = err?.error?.message;
          this.error.set(typeof apiMessage === 'string' && apiMessage.trim() ? apiMessage : this.i18n.t('login.loginError'));
        }
      });
  }

  private prefetchAdminHome(): void {
    this.dashboard.getSnapshot().subscribe({ error: () => undefined });
    this.catalog.listFamilies({ page: 1, pageSize: 24, sort: 'nameAsc' }).subscribe({ error: () => undefined });
  }
}
