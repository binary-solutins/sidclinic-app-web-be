const autocannon = require('autocannon');
const { performance } = require('perf_hooks');

class LoadTester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async runBasicLoadTest() {
    console.log('🚀 Starting basic load test...');
    
    const testConfig = {
      url: this.baseUrl,
      connections: 10, // Number of concurrent connections
      duration: 30, // Test duration in seconds
      requests: [
        {
          method: 'GET',
          path: '/health'
        },
        {
          method: 'GET',
          path: '/api-docs'
        }
      ]
    };

    try {
      const result = await autocannon(testConfig);
      this.results.push({
        test: 'Basic Load Test',
        result: result
      });
      
      console.log('✅ Basic load test completed');
      this.printResults(result);
      
    } catch (error) {
      console.error('❌ Basic load test failed:', error);
    }
  }

  async runAuthLoadTest() {
    console.log('🔐 Starting authentication load test...');
    
    const testConfig = {
      url: this.baseUrl,
      connections: 5,
      duration: 20,
      requests: [
        {
          method: 'POST',
          path: '/api/auth/login',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'testpassword'
          })
        }
      ]
    };

    try {
      const result = await autocannon(testConfig);
      this.results.push({
        test: 'Authentication Load Test',
        result: result
      });
      
      console.log('✅ Authentication load test completed');
      this.printResults(result);
      
    } catch (error) {
      console.error('❌ Authentication load test failed:', error);
    }
  }

  async runDatabaseLoadTest() {
    console.log('🗄️ Starting database load test...');
    
    const testConfig = {
      url: this.baseUrl,
      connections: 15,
      duration: 30,
      requests: [
        {
          method: 'GET',
          path: '/api/doctors'
        },
        {
          method: 'GET',
          path: '/api/patients'
        },
        {
          method: 'GET',
          path: '/api/appointments'
        }
      ]
    };

    try {
      const result = await autocannon(testConfig);
      this.results.push({
        test: 'Database Load Test',
        result: result
      });
      
      console.log('✅ Database load test completed');
      this.printResults(result);
      
    } catch (error) {
      console.error('❌ Database load test failed:', error);
    }
  }

  async runStressTest() {
    console.log('💥 Starting stress test...');
    
    const testConfig = {
      url: this.baseUrl,
      connections: 50, // High number of connections
      duration: 60, // Longer duration
      requests: [
        {
          method: 'GET',
          path: '/health'
        },
        {
          method: 'GET',
          path: '/api/doctors'
        },
        {
          method: 'GET',
          path: '/api/patients'
        }
      ]
    };

    try {
      const result = await autocannon(testConfig);
      this.results.push({
        test: 'Stress Test',
        result: result
      });
      
      console.log('✅ Stress test completed');
      this.printResults(result);
      
    } catch (error) {
      console.error('❌ Stress test failed:', error);
    }
  }

  async runSpikeTest() {
    console.log('📈 Starting spike test...');
    
    // Simulate traffic spikes
    const phases = [
      { connections: 5, duration: 10 },   // Normal load
      { connections: 100, duration: 5 },  // Spike
      { connections: 5, duration: 10 },   // Back to normal
      { connections: 150, duration: 5 },  // Another spike
      { connections: 5, duration: 10 }    // Back to normal
    ];

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      console.log(`Phase ${i + 1}: ${phase.connections} connections for ${phase.duration}s`);
      
      const testConfig = {
        url: this.baseUrl,
        connections: phase.connections,
        duration: phase.duration,
        requests: [
          {
            method: 'GET',
            path: '/health'
          }
        ]
      };

      try {
        const result = await autocannon(testConfig);
        this.results.push({
          test: `Spike Test Phase ${i + 1}`,
          result: result
        });
        
      } catch (error) {
        console.error(`❌ Spike test phase ${i + 1} failed:`, error);
      }
    }
    
    console.log('✅ Spike test completed');
  }

  printResults(result) {
    console.log('\n📊 Test Results:');
    console.log(`Requests: ${result.requests.total}`);
    console.log(`Duration: ${result.duration}s`);
    console.log(`Throughput: ${result.throughput} req/sec`);
    console.log(`Latency: ${result.latency.average}ms (avg)`);
    console.log(`Errors: ${result.errors}`);
    console.log(`Non-2xx responses: ${result.non2xx}`);
    console.log('---');
  }

  generateReport() {
    console.log('\n📋 Load Test Summary Report');
    console.log('='.repeat(50));
    
    this.results.forEach((test, index) => {
      console.log(`\n${index + 1}. ${test.test}`);
      console.log(`   Throughput: ${test.result.throughput} req/sec`);
      console.log(`   Latency: ${test.result.latency.average}ms (avg)`);
      console.log(`   Errors: ${test.result.errors}`);
      console.log(`   Success Rate: ${((test.result.requests.total - test.result.errors) / test.result.requests.total * 100).toFixed(2)}%`);
    });

    // Performance recommendations
    console.log('\n💡 Performance Recommendations:');
    const avgLatency = this.results.reduce((sum, test) => sum + test.result.latency.average, 0) / this.results.length;
    const maxErrors = Math.max(...this.results.map(test => test.result.errors));
    
    if (avgLatency > 1000) {
      console.log('⚠️  High latency detected. Consider optimizing database queries and adding caching.');
    }
    
    if (maxErrors > 0) {
      console.log('⚠️  Errors detected. Review error logs and improve error handling.');
    }
    
    if (avgLatency < 100 && maxErrors === 0) {
      console.log('✅ Excellent performance! Your API is ready for production.');
    }
  }

  async runAllTests() {
    console.log('🧪 Starting comprehensive load testing...\n');
    
    const startTime = performance.now();
    
    await this.runBasicLoadTest();
    await this.runAuthLoadTest();
    await this.runDatabaseLoadTest();
    await this.runStressTest();
    await this.runSpikeTest();
    
    const endTime = performance.now();
    const totalTime = (endTime - startTime) / 1000;
    
    console.log(`\n⏱️  Total testing time: ${totalTime.toFixed(2)}s`);
    this.generateReport();
  }
}

// CLI interface
if (require.main === module) {
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const testType = process.argv[3] || 'all';
  
  const loadTester = new LoadTester(baseUrl);
  
  switch (testType) {
    case 'basic':
      loadTester.runBasicLoadTest();
      break;
    case 'auth':
      loadTester.runAuthLoadTest();
      break;
    case 'database':
      loadTester.runDatabaseLoadTest();
      break;
    case 'stress':
      loadTester.runStressTest();
      break;
    case 'spike':
      loadTester.runSpikeTest();
      break;
    case 'all':
    default:
      loadTester.runAllTests();
      break;
  }
}

module.exports = LoadTester;
