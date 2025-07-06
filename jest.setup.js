import "@testing-library/jest-dom";

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock fetch
global.fetch = jest.fn();

// Mock FormData
global.FormData = class FormData {
  constructor() {
    this.data = new Map();
  }

  append(key, value) {
    this.data.set(key, value);
  }

  get(key) {
    return this.data.get(key);
  }

  delete(key) {
    this.data.delete(key);
  }
};

// Mock File and Blob for testing
global.File = class File {
  constructor(bits, name, options) {
    this.bits = bits;
    this.name = name;
    this.type = options?.type || "";
    this.size = bits.reduce((acc, bit) => acc + bit.length, 0);
  }

  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size));
  }
};

global.Blob = class Blob {
  constructor(bits, options) {
    this.bits = bits;
    this.type = options?.type || "";
    this.size = bits.reduce((acc, bit) => acc + bit.length, 0);
  }
};
