// Mock NextRequest for server-side testing
class MockNextRequest {
  constructor(url, init = {}) {
    this.url = url;
    this.method = init.method || 'GET';
    this.headers = new Map();
    this._cookies = new Map();
    
    // Initialize cookies if provided
    if (init.cookies) {
      Object.entries(init.cookies).forEach(([key, value]) => {
        this._cookies.set(key, { value });
      });
    }
  }

  get cookies() {
    return {
      get: (name) => this._cookies.get(name),
      set: (name, value) => this._cookies.set(name, { value }),
      delete: (name) => this._cookies.delete(name),
    };
  }
}

// Mock NextResponse
class MockNextResponse {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.headers = new Map();
  }

  static json(data, init = {}) {
    return new MockNextResponse(JSON.stringify(data), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) }
    });
  }

  async json() {
    return JSON.parse(this.body);
  }
}

module.exports = {
  NextRequest: MockNextRequest,
  NextResponse: MockNextResponse,
};