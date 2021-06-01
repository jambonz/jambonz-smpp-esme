# jambonz-smpp-esme

An smpp client and server for jambonz


## conf
example config for pm2
```  {
    name: 'jambonz-smpp-esme',
    cwd: '/home/admin/apps/jambonz-smpp-esme',
    script: 'app.js',
    out_file: '/home/admin/.pm2/logs/jambonz-smpp-esme.log',
    err_file: '/home/admin/.pm2/logs/jambonz-smpp-esme.log',
    combine_logs: true,
    instance_var: 'INSTANCE_ID',
    exec_mode: 'fork',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      JAMBONES_MYSQL_HOST: 'aurora-cluster-jambonz.cluster-duiu3bbf65.us-east-1.rds.amazonaws.com',
      JAMBONES_MYSQL_USER: 'admin',
      JAMBONES_MYSQL_PASSWORD: 'DKDKDKDKDK$',
      JAMBONES_MYSQL_DATABASE: 'jambones',
      JAMBONES_MYSQL_CONNECTION_LIMIT: 10,
      JAMBONES_REDIS_HOST: 'jambonz.yrhd.0001.use1.cache.amazonaws.com',
      JAMBONES_REDIS_PORT: 6379,
      JAMBONES_LOGLEVEL: 'debug',
      JAMBONES_CLUSTER_ID: 'jb',
      HTTP_PORT: 3020
    }
  }
  ```