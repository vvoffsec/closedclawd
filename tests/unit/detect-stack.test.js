// tests/unit/detect-stack.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectStack } from '../../src/utils/detect-stack.js';

describe('detectStack', () => {
  it('detects Next.js from spec keywords', () => {
    const spec = 'Build a SaaS dashboard using Next.js with Prisma ORM';
    assert.equal(detectStack(spec), 'nextjs');
  });

  it('detects Express API from spec keywords', () => {
    const spec = 'Create a REST API with Express and PostgreSQL';
    assert.equal(detectStack(spec), 'express-api');
  });

  it('detects React Native from spec keywords', () => {
    const spec = 'Build a mobile app with React Native for iOS and Android';
    assert.equal(detectStack(spec), 'react-native');
  });

  it('returns generic for ambiguous specs', () => {
    const spec = 'Build a tool that processes data';
    assert.equal(detectStack(spec), 'generic');
  });

  it('detects Next.js when both next and react are mentioned', () => {
    const spec = 'A React-based SaaS using Next.js App Router';
    assert.equal(detectStack(spec), 'nextjs');
  });

  it('detects express when REST API is mentioned without framework', () => {
    const spec = 'Build a RESTful API backend with authentication';
    assert.equal(detectStack(spec), 'express-api');
  });
});
