module.exports = {
  apps: [
    {
      name: 'liga-dorada-api',
      script: 'index.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,
      listen_timeout: 3000,
      wait_ready: true,
      listen_timeout: 10000,
      // Health check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      // Advanced settings
      node_args: '--max-old-space-size=1024',
      // Monitoring
      pmx: true,
      // Graceful reload
      kill_signal: 'SIGINT',
      stop_signal: 'SIGTERM',
      refork: true
    }
  ]
};
