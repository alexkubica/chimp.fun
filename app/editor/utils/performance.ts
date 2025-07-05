/**
 * Performance diagnostics utility for the NFT Editor
 */

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export class PerformanceDiagnostics {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private operationStack: string[] = [];
  private enabled: boolean = true;

  /**
   * Enable or disable performance tracking
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Start measuring a performance metric
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.enabled) return;
    
    const startTime = performance.now();
    this.metrics.set(name, {
      name,
      startTime,
      metadata,
    });
    this.operationStack.push(name);
  }

  /**
   * End measuring a performance metric
   */
  end(name: string): number {
    if (!this.enabled) return 0;
    
    const endTime = performance.now();
    const metric = this.metrics.get(name);
    
    if (metric) {
      const duration = endTime - metric.startTime;
      metric.endTime = endTime;
      metric.duration = duration;
      
      // Remove from stack if it's the current operation
      const stackIndex = this.operationStack.indexOf(name);
      if (stackIndex !== -1) {
        this.operationStack.splice(stackIndex, 1);
      }
      
      return duration;
    }
    
    return 0;
  }

  /**
   * Measure a function execution time
   */
  async measure<T>(name: string, fn: () => T | Promise<T>, metadata?: Record<string, any>): Promise<T> {
    if (!this.enabled) return await fn();
    
    this.start(name, metadata);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get a specific metric
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.operationStack = [];
  }

  /**
   * Get formatted diagnostics report
   */
  getDiagnosticsReport(): string {
    const metrics = this.getMetrics();
    const report = [
      '=== PERFORMANCE DIAGNOSTICS REPORT ===',
      `Generated at: ${new Date().toISOString()}`,
      `Total metrics: ${metrics.length}`,
      '',
      'METRICS BREAKDOWN:',
      ...metrics.map(metric => {
        const duration = metric.duration?.toFixed(2) || 'N/A';
        const metadata = metric.metadata ? JSON.stringify(metric.metadata) : '';
        return `• ${metric.name}: ${duration}ms ${metadata}`;
      }),
      '',
      'SLOW OPERATIONS (>50ms):',
      ...metrics
        .filter(m => m.duration && m.duration > 50)
        .sort((a, b) => (b.duration || 0) - (a.duration || 0))
        .map(metric => `• ${metric.name}: ${metric.duration?.toFixed(2)}ms`),
      '',
      'SUMMARY:',
      `• Total operations: ${metrics.length}`,
      `• Slow operations: ${metrics.filter(m => m.duration && m.duration > 50).length}`,
      `• Average duration: ${metrics.length > 0 ? (metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / metrics.length).toFixed(2) : 0}ms`,
      `• Total time: ${metrics.reduce((sum, m) => sum + (m.duration || 0), 0).toFixed(2)}ms`,
      '',
      'RECOMMENDATIONS:',
      ...this.generateRecommendations(metrics),
    ];
    
    return report.join('\n');
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: PerformanceMetric[]): string[] {
    const recommendations: string[] = [];
    
    // Check for slow image operations
    const imageMetrics = metrics.filter(m => m.name.includes('image') || m.name.includes('load'));
    if (imageMetrics.some(m => m.duration && m.duration > 100)) {
      recommendations.push('• Consider image preloading or lazy loading for large images');
    }
    
    // Check for NFT fetching issues
    const nftMetrics = metrics.filter(m => m.name.includes('nft') || m.name.includes('fetch'));
    if (nftMetrics.some(m => m.duration && m.duration > 500)) {
      recommendations.push('• NFT fetching is slow - consider caching or pagination optimization');
    }
    
    // Check for rendering issues
    const renderMetrics = metrics.filter(m => m.name.includes('render') || m.name.includes('draw'));
    if (renderMetrics.some(m => m.duration && m.duration > 50)) {
      recommendations.push('• Rendering is slow - consider virtualization or canvas optimization');
    }
    
    // Check for frequent operations
    const operationCounts = new Map<string, number>();
    metrics.forEach(m => {
      const baseName = m.name.split('_')[0];
      operationCounts.set(baseName, (operationCounts.get(baseName) || 0) + 1);
    });
    
    for (const [operation, count] of operationCounts) {
      if (count > 10) {
        recommendations.push(`• ${operation} operations are frequent (${count}x) - consider debouncing or memoization`);
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('• No major performance issues detected');
    }
    
    return recommendations;
  }
}

// Global performance diagnostics instance
export const perf = new PerformanceDiagnostics();

// Helper function to measure individual code blocks
export function measureTime(label: string): () => number {
  const start = performance.now();
  return () => {
    const end = performance.now();
    const duration = end - start;
    console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
    return duration;
  };
}