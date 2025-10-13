import 'reflect-metadata';
import { DataSource } from 'typeorm';

class AppDataSource {
  private static instance: DataSource;

  private constructor() {}

  // 获取单例实例的公共静态方法
  public static get getInstance() {
    if (!AppDataSource.instance) {
      throw new Error('AppDataSource instance is not initialized');
    }
    return AppDataSource.instance;
  }

  // 初始化数据库连接的方法
  public static async initialize() {
    if (!AppDataSource.instance) {
      AppDataSource.instance = new DataSource({
        type: 'mysql',
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT),
        username: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DB,
        synchronize: process.env.Synchronize === 'true',
        logging: false,
        entities: [__dirname + '/entity/*']
      });

      await AppDataSource.instance.initialize();
    }
  }
}

export default AppDataSource;
