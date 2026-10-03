import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { canonicalKey, hostname, normalize } from '../lib/validation';

describe('normalize', () => {
  it('applies NFKC, trims, collapses whitespace and lowercases', () => {
    assert.equal(normalize('  ＡＣＭＥ    Corp  '), 'acme corp');
    assert.equal(normalize('ACME\u00A0Corp'), 'acme corp');
  });

  it('returns an empty string for empty input', () => {
    assert.equal(normalize('   '), '');
  });
});

describe('hostname', () => {
  it('lowercases and strips a leading www.', () => {
    assert.equal(hostname('https://WWW.Example.COM/path'), 'example.com');
  });

  it('preserves meaningful subdomains', () => {
    assert.equal(hostname('https://news.example.com/article'), 'news.example.com');
  });

  it('returns null for an unparseable URL', () => {
    assert.equal(hostname('not a url'), null);
    assert.equal(hostname(''), null);
  });
});

describe('canonicalKey', () => {
  it('uses the normalized hostname when the website parses', () => {
    assert.equal(
      canonicalKey('Acme  Corp', 'https://www.acme.com/about', 'Bengaluru'),
      'acme corp|acme.com',
    );
  });

  it('falls back to the normalized city when the website is unusable', () => {
    assert.equal(canonicalKey('Acme Corp', 'garbage', '  Bengaluru '), 'acme corp|bengaluru');
  });

  it('is stable across www, case and trailing-slash differences', () => {
    const a = canonicalKey('Acme', 'https://www.acme.com', 'Chennai');
    const b = canonicalKey('  acme ', 'https://ACME.com/', 'Chennai');
    assert.equal(a, b);
  });

  it('separates different companies on the same host by name', () => {
    assert.notEqual(
      canonicalKey('Acme', 'https://acme.com', 'Pune'),
      canonicalKey('Globex', 'https://acme.com', 'Pune'),
    );
  });
});
