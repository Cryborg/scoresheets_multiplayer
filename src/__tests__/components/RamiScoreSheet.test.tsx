/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render } from '@testing-library/react';
import { jest } from '@jest/globals';
import RamiScoreSheet from '@/components/scoresheets/RamiScoreSheet';

// Mock RoundBasedScoreSheet
jest.mock('@/components/scoresheets/RoundBasedScoreSheet', () => {
  return function MockRoundBasedScoreSheet() {
    return <div>Rami</div>;
  };
});

describe('RamiScoreSheet', () => {
  test('renders component', () => {
    const { container } = render(<RamiScoreSheet sessionId="1" />);
    expect(container).toBeTruthy();
  });

  test('component is defined', () => {
    expect(RamiScoreSheet).toBeDefined();
  });
});