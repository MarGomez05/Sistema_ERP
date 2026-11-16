import { Injectable, computed, signal } from '@angular/core';

export type ToastTone = 'success' | 'danger' | 'warning' | 'info';

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private sequence = 0;
  private readonly itemsState = signal<Toast[]>([]);

  readonly items = this.itemsState.asReadonly();
  readonly hasItems = computed(() => this.itemsState().length > 0);

  success(title: string, message?: string): void {
    this.push('success', title, message);
  }

  error(title: string, message?: string): void {
    this.push('danger', title, message);
  }

  warning(title: string, message?: string): void {
    this.push('warning', title, message);
  }

  info(title: string, message?: string): void {
    this.push('info', title, message);
  }

  dismiss(id: number): void {
    this.itemsState.update((items) => items.filter((item) => item.id !== id));
  }

  private push(tone: ToastTone, title: string, message?: string): void {
    const id = ++this.sequence;

    this.itemsState.update((items) => [...items.slice(-2), { id, tone, title, message }]);

    setTimeout(() => this.dismiss(id), 6000);
  }
}
