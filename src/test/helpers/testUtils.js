/**
 * Test utility functions for common testing patterns
 */

import { render } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * Render component with common providers
 * Useful for components that need context providers
 */
export function renderWithProviders(ui, options = {}) {
  const { providers = [], ...renderOptions } = options;
  
  let wrapped = ui;
  for (const Provider of providers.reverse()) {
    wrapped = <Provider>{wrapped}</Provider>;
  }
  
  return render(wrapped, renderOptions);
}

/**
 * Wait for async operation to complete
 * Useful for testing async hooks or components
 */
export async function waitForAsync(callback, timeout = 5000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      await callback();
      return;
    } catch (error) {
      if (Date.now() - startTime >= timeout) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  throw new Error('waitForAsync timeout');
}

/**
 * Create a mock function that resolves after a delay
 * Useful for testing loading states
 */
export function createDelayedMock(delay = 100) {
  return vi.fn(() => new Promise(resolve => setTimeout(resolve, delay)));
}

/**
 * Create a mock function that resolves with a value after a delay
 */
export function createDelayedResolve(value, delay = 100) {
  return vi.fn(() => new Promise(resolve => setTimeout(() => resolve(value), delay)));
}

/**
 * Create a mock function that rejects after a delay
 */
export function createDelayedReject(error, delay = 100) {
  return vi.fn(() => new Promise((_, reject) => setTimeout(() => reject(error), delay)));
}

/**
 * Flush all pending promises
 * Useful for testing async operations
 */
export function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Create a mock AbortSignal
 */
export function createMockAbortSignal(aborted = false) {
  return {
    aborted,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  };
}

/**
 * Create a mock File object
 */
export function createMockFile(content, filename, type = 'text/csv') {
  const blob = new Blob([content], { type });
  return new File([blob], filename, { type });
}

/**
 * Create a mock FileList
 */
export function createMockFileList(files) {
  const fileList = {
    length: files.length,
    item: (index) => files[index] || null,
    ...files
  };
  
  files.forEach((file, index) => {
    fileList[index] = file;
  });
  
  return fileList;
}

/**
 * Create mock storage event
 */
export function createMockStorageEvent(key, oldValue, newValue) {
  return new StorageEvent('storage', {
    key,
    oldValue,
    newValue,
    storageArea: localStorage
  });
}

/**
 * Wait for element to appear in DOM
 */
export async function waitForElement(selector, timeout = 5000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  throw new Error(`Element ${selector} not found within ${timeout}ms`);
}

/**
 * Create a mock IntersectionObserver
 */
export function createMockIntersectionObserver() {
  const mockIntersectionObserver = vi.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  });
  
  window.IntersectionObserver = mockIntersectionObserver;
  
  return mockIntersectionObserver;
}

/**
 * Create a mock ResizeObserver
 */
export function createMockResizeObserver() {
  const mockResizeObserver = vi.fn();
  mockResizeObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  });
  
  window.ResizeObserver = mockResizeObserver;
  
  return mockResizeObserver;
}

/**
 * Create a mock matchMedia
 */
export function createMockMatchMedia(matches = false) {
  return vi.fn((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

/**
 * Advance timers and flush promises
 * Useful for testing time-dependent code
 */
export async function advanceTimersAndFlush(ms) {
  vi.advanceTimersByTime(ms);
  await flushPromises();
}

/**
 * Create a mock progress callback
 */
export function createMockProgressCallback() {
  const calls = [];
  const callback = (progress) => {
    calls.push(progress);
  };
  callback.calls = calls;
  return callback;
}

/**
 * Create a mock error handler
 */
export function createMockErrorHandler() {
  const errors = [];
  const handler = (error) => {
    errors.push(error);
  };
  handler.errors = errors;
  return handler;
}

