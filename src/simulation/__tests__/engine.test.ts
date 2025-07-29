import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SimulationEngine } from '../engine';
import { RuleBasedStrategy } from '../strategies/rule-based-strategy';
import { StatisticalStrategy } from '../strategies/statistical-strategy';
import { AiStrategy } from '../strategies/ai-strategy';
import { CacheStrategy } from '../strategies/cache-strategy';
import { CricketContext } from '../types';

// Mock the strategies
vi.mock('../strategies/rule-based-strategy');
vi.mock('../strategies/statistical-strategy');
vi.mock('../strategies/ai-strategy');
vi.mock('../strategies/cache-strategy');

describe('SimulationEngine', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  const mockContext = (complexity: number): CricketContext => ({
    complexity,
    // Fill in other required properties with dummy data
    match: {} as any,
    innings: 1,
    over: 0,
    ball: 0,
    battingTeam: {} as any,
    bowlingTeam: {} as any,
    striker: {} as any,
    nonStriker: {} as any,
    bowler: {} as any,
    phase: 'POWERPLAY',
    pressure: {} as any,
    momentum: {} as any,
  });

  it('should select RuleBasedStrategy for low complexity', async () => {
    const context = mockContext(2);
    RuleBasedStrategy.prototype.canHandle = vi.fn().mockReturnValue(true);
    const engine = new SimulationEngine([new AiStrategy(), new StatisticalStrategy(), new RuleBasedStrategy()]);
    await engine.simulateOver(context);
    expect(RuleBasedStrategy.prototype.simulate).toHaveBeenCalled();
  });

  it('should select StatisticalStrategy for medium complexity', async () => {
    const context = mockContext(5);
    StatisticalStrategy.prototype.canHandle = vi.fn().mockReturnValue(true);
    RuleBasedStrategy.prototype.canHandle = vi.fn().mockReturnValue(false);
    AiStrategy.prototype.canHandle = vi.fn().mockReturnValue(false);
    const engine = new SimulationEngine([new AiStrategy(), new StatisticalStrategy(), new RuleBasedStrategy()]);
    await engine.simulateOver(context);
    expect(StatisticalStrategy.prototype.simulate).toHaveBeenCalled();
  });

  it('should select AiStrategy for high complexity', async () => {
    const context = mockContext(8);
    AiStrategy.prototype.canHandle = vi.fn().mockReturnValue(true);
    StatisticalStrategy.prototype.canHandle = vi.fn().mockReturnValue(false);
    RuleBasedStrategy.prototype.canHandle = vi.fn().mockReturnValue(false);
    const engine = new SimulationEngine([new AiStrategy(), new StatisticalStrategy(), new RuleBasedStrategy()]);
    await engine.simulateOver(context);
    expect(AiStrategy.prototype.simulate).toHaveBeenCalled();
  });

  it('should use CacheStrategy when a result is cached', async () => {
    const context = mockContext(8);
    CacheStrategy.prototype.canHandle = vi.fn().mockReturnValue(true);
    const engine = new SimulationEngine([new CacheStrategy(), new AiStrategy(), new StatisticalStrategy(), new RuleBasedStrategy()]);
    await engine.simulateOver(context);
    expect(CacheStrategy.prototype.simulate).toHaveBeenCalled();
  });
});
