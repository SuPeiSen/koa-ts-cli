import { spawn } from "child_process";
import chokidar from "chokidar";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "fs";
import path, { join } from "path";
import chalk from "chalk";
import dotenv from "dotenv";

chalk.level = 3; // 强制开启最高颜色等级

/** ========== 常量区域 ========== **/
const projectPath = process.cwd(); // 项目根目录
const SRC_DIR = path.join(projectPath, "src");
const ENV_DIR = path.join(projectPath, "env");
const TS_CONFIG_PATH = path.join(projectPath, "tsconfig.json");
const MAIN_FILE = path.join(SRC_DIR, "index.ts");
const ENV_DTS_FILE = path.join(SRC_DIR, "env.d.ts");

/** @type any */
let childProcess; // 保存当前子进程实例

/** 
 * 启动 ts-node 子进程
 * 使用 --files 选项确保可以加载 .d.ts 文件
 */
const startProcess = () => {
  childProcess = spawn(
    "npx",
    ["ts-node", "--files", "-r", "tsconfig-paths/register", MAIN_FILE, "-P", TS_CONFIG_PATH],
    {
      stdio: "inherit", // 继承父进程标准 IO
      env: {
        ...process.env,
        NODE_ENV: "development", // 开发模式
        FORCE_COLOR: "3", // 彩色输出
      },
    }
  );

  childProcess.on("error", (error) => {
    console.error(chalk.red(`❌ 子进程启动失败: ${error.message}`));
  });
};

/**
 * 加载 chokidar 配置文件
 * 支持自定义监控路径和参数
 */
const loadChokidarConfig = async () => {
  const configPath = path.join(projectPath, "chokidar.config.js");

  if (existsSync(configPath)) {
    try {
      const configModule = await import(configPath);
      const config = configModule.default?.default || {};
      if (Object.keys(config).length > 0) {
        console.log(chalk.green(`✅ 成功加载 Chokidar 配置文件: ${configPath}`));
      }
      return config;
    } catch (err) {
      console.error(chalk.red(`❌ 加载 Chokidar 配置失败: ${err.message}`));
    }
  }

  // 返回默认配置
  return {};
};

/**
 * 生成 env 类型声明文件 (env.d.ts)
 * @param {string} outputPath 输出路径
 */
const generateEnvDts = (outputPath) => {
  const envKeys = new Set();

  if (!existsSync(ENV_DIR)) {
    console.warn(chalk.yellow("⚠️ env 目录不存在，跳过类型生成"));
    return;
  }

  // 读取 env 目录下所有文件
  const files = readdirSync(ENV_DIR);
  files.forEach(fileName => {
    const content = readFileSync(join(ENV_DIR, fileName), "utf8");
    const parsed = dotenv.parse(content);
    Object.keys(parsed).forEach(key => envKeys.add(key));
  });

  if (envKeys.size === 0) {
    console.warn(chalk.yellow("⚠️ 未解析到任何 env key"));
    return;
  }

  const typeLines = Array.from(envKeys)
    .sort()
    .map(key => `    ${key}: string;`)
    .join("\n");

  const dtsContent = `
// 自动生成的 env 类型声明文件
declare namespace NodeJS {
  interface ProcessEnv {
${typeLines}
  }
}
`;

  writeFileSync(outputPath, dtsContent, "utf8");
  console.log(chalk.green(`✅ 已生成 ${outputPath}，字段数: ${envKeys.size}`));
};

/**
 * 启动开发服务
 * - 监听文件变化
 * - 自动重启 ts-node 子进程
 * - 生成 env 类型
 */
const devService = async () => {
  // 加载监听配置
  const chokidarConfig = await loadChokidarConfig();

  const watchPaths = chokidarConfig.watchPath || [SRC_DIR];
  watchPaths.push(ENV_DIR); // 同时监听 env 文件夹变化

  watchPaths.forEach(p => {
    console.log(chalk.cyan(`👀 正在监听: ${p}`));
  });

  const watcher = chokidar.watch(watchPaths, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: true,
    ...chokidarConfig, // 合并用户配置
  });

  watcher.on("all", (eventName, filePath) => {
    console.log(chalk.magenta(`${eventName} => ${filePath}`));

    // 如果 env 文件发生变化，重新生成类型声明
    if (filePath.includes("env") && filePath.endsWith(".env")) {
      generateEnvDts(ENV_DTS_FILE);
    }

    // 自动重启服务
    if (childProcess) {
      console.log(chalk.yellow("\n♻️ 检测到变更，重启服务..."));
      childProcess.kill();
    }
    startProcess();
  });

  // 生成 env 类型
  generateEnvDts(ENV_DTS_FILE)

  // 启动初始服务
  startProcess();
};

export default devService;
