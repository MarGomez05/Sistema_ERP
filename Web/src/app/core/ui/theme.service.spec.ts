import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.colorScheme = '';
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('inicia en claro cuando no hay preferencia guardada', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('light');
    expect(service.isDark()).toBe(false);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('alterna a oscuro, aplica el atributo y persiste la preferencia', () => {
    const service = TestBed.inject(ThemeService);

    service.toggle();

    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
    expect(localStorage.getItem('tamachihua.theme')).toBe('dark');
  });

  it('vuelve a claro y actualiza el color del navegador', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#0873c4';
    document.head.appendChild(meta);

    const service = TestBed.inject(ThemeService);

    service.set('dark');
    expect(meta.content).toBe('#171310');

    service.set('light');
    expect(service.isDark()).toBe(false);
    expect(meta.content).toBe('#0873c4');

    meta.remove();
  });

  it('respeta el tema ya aplicado por el script inicial', () => {
    document.documentElement.setAttribute('data-theme', 'dark');

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
  });
});
